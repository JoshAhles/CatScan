#include <Arduino.h>
#include <WiFi.h>
#include <NimBLEDevice.h>
#include <PubSubClient.h>
#include <time.h>
#include <map>
#include "secrets.h"
#include "payload_formatter.h"
#include "ring_buffer.h"
#include "conn_state.h"

using namespace catscan;

struct Reading { std::string mac; int rssi; int64_t ts; };

static WiFiClient netClient;
static PubSubClient mqtt(netClient);
static ConnStateMachine conn;
static RingBuffer<Reading, 50> buf;
static std::string nodeId;
static unsigned long lastPublishMs = 0;

static const NimBLEUUID TILE_SERVICE_UUID("feed");
static const NimBLEUUID TILE_ID_CHAR_UUID("9d410007-35d6-f4dd-ba60-e7bd8dc491c0");

// MAC → permanent tileId cache (avoids reconnecting to known Tiles)
static std::map<std::string, std::string> tileIdCache;
// Queue of MACs that need identification
static std::string identifyQueue;
static NimBLEAddress identifyAddr;
static unsigned long lastIdentifyAttempt = 0;
static bool identifyPending = false;

static std::string deriveNodeId() {
  uint8_t mac[6]; WiFi.macAddress(mac);
  char id[20];
  snprintf(id, sizeof(id), "node-%02X%02X%02X%02X", mac[2], mac[3], mac[4], mac[5]);
  return std::string(id);
}

static std::string bytesToHex(const uint8_t* data, size_t len) {
  std::string out;
  out.reserve(len * 2);
  for (size_t i = 0; i < len; i++) {
    char buf[3];
    snprintf(buf, sizeof(buf), "%02X", data[i]);
    out += buf;
  }
  return out;
}

class ScanCallbacks : public NimBLEAdvertisedDeviceCallbacks {
  void onResult(NimBLEAdvertisedDevice* dev) override {
    if (!dev->isAdvertisingService(TILE_SERVICE_UUID)) return;

    std::string macStr = dev->getAddress().toString();
    if (macStr.size() < 17 || macStr == "00:00:00:00:00:00") return;
    for (auto& c : macStr) c = toupper(c);

    time_t now = time(nullptr);
    int64_t ts = (now > 1700000000) ? static_cast<int64_t>(now) : 0;

    buf.push(Reading{macStr, dev->getRSSI(), ts});

    // If this MAC isn't in our tileId cache, queue it for identification
    if (tileIdCache.find(macStr) == tileIdCache.end() && !identifyPending) {
      identifyQueue = macStr;
      identifyAddr = dev->getAddress();
      identifyPending = true;
    }
  }
};

// Attempt to read the permanent Tile ID via GATT
static void tryIdentifyTile() {
  if (!identifyPending) return;
  if (millis() - lastIdentifyAttempt < 30000) return; // rate-limit: one attempt per 30s
  if (!mqtt.connected()) return;

  lastIdentifyAttempt = millis();
  std::string mac = identifyQueue;
  identifyPending = false;

  Serial.printf("[identify] Connecting to %s to read Tile ID...\n", mac.c_str());

  NimBLEClient* client = NimBLEDevice::createClient();
  client->setConnectTimeout(5);

  if (!client->connect(identifyAddr)) {
    Serial.printf("[identify] Connect failed for %s\n", mac.c_str());
    NimBLEDevice::deleteClient(client);
    return;
  }

  NimBLERemoteService* svc = client->getService(TILE_SERVICE_UUID);
  if (!svc) {
    Serial.printf("[identify] FEED service not found on %s\n", mac.c_str());
    client->disconnect();
    NimBLEDevice::deleteClient(client);
    return;
  }

  NimBLERemoteCharacteristic* chr = svc->getCharacteristic(TILE_ID_CHAR_UUID);
  if (!chr) {
    Serial.printf("[identify] TILE_ID_CHAR not found on %s (older hardware?)\n", mac.c_str());
    client->disconnect();
    NimBLEDevice::deleteClient(client);
    // Cache as "unknown" so we don't keep retrying
    tileIdCache[mac] = "UNKNOWN";
    return;
  }

  std::string val = chr->readValue();
  client->disconnect();
  NimBLEDevice::deleteClient(client);

  if (val.empty()) {
    Serial.printf("[identify] Empty Tile ID from %s\n", mac.c_str());
    tileIdCache[mac] = "UNKNOWN";
    return;
  }

  std::string tileId = bytesToHex(reinterpret_cast<const uint8_t*>(val.data()), val.size());
  tileIdCache[mac] = tileId;
  Serial.printf("[identify] %s → tileId %s\n", mac.c_str(), tileId.c_str());

  // Publish identification to MQTT
  String topic = String("catscan/identify/") + nodeId.c_str();
  char payload[128];
  snprintf(payload, sizeof(payload), "{\"m\":\"%s\",\"tid\":\"%s\"}", mac.c_str(), tileId.c_str());
  mqtt.publish(topic.c_str(), payload);
}

// MQTT callback for ring commands
static void mqttCallback(char* topic, byte* payload, unsigned int length);

static void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(CATSCAN_WIFI_SSID, CATSCAN_WIFI_PASS);
}

static void connectMqtt() {
  mqtt.setServer(CATSCAN_MQTT_HOST, CATSCAN_MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  String clientId = String(nodeId.c_str());
  String lwt = String("catscan/health/") + clientId;
  mqtt.connect(clientId.c_str(), CATSCAN_MQTT_USER, CATSCAN_MQTT_PASS,
               lwt.c_str(), 0, true, "offline");
  if (mqtt.connected()) {
    mqtt.publish(lwt.c_str(), "online", true);
    // Subscribe to ring commands for this node
    String cmdTopic = String("catscan/cmd/") + nodeId.c_str();
    mqtt.subscribe(cmdTopic.c_str());
    mqtt.subscribe("catscan/cmd/all");
  }
}

static void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // TODO: ring command handler will go here
  (void)topic; (void)payload; (void)length;
}

void setup() {
  Serial.begin(115200);
  nodeId = deriveNodeId();
  Serial.printf("CatScan node %s booting\n", nodeId.c_str());

  conn.onEvent(ConnEvent::START);
  connectWifi();

  Serial.print("Waiting for WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " timeout, will retry in loop");

  configTime(0, 0, CATSCAN_NTP_HOST);

  NimBLEDevice::init("");
  NimBLEDevice::setMTU(64);
  NimBLEScan* scan = NimBLEDevice::getScan();
  scan->setAdvertisedDeviceCallbacks(new ScanCallbacks(), true);
  scan->setActiveScan(false);
  scan->setInterval(100);
  scan->setWindow(99);
  scan->start(0, nullptr, false); // continuous
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    if (conn.state() == ConnState::READY) conn.onEvent(ConnEvent::WIFI_DOWN);
    static unsigned long lastWifiRetry = 0;
    if (millis() - lastWifiRetry > 10000) {
      WiFi.disconnect();
      WiFi.begin(CATSCAN_WIFI_SSID, CATSCAN_WIFI_PASS);
      lastWifiRetry = millis();
    }
    delay(500);
    return;
  } else if (conn.state() == ConnState::WIFI_CONNECTING) {
    conn.onEvent(ConnEvent::WIFI_UP);
  }

  if (!mqtt.connected()) {
    if (conn.state() == ConnState::READY) conn.onEvent(ConnEvent::MQTT_DOWN);
    connectMqtt();
    if (mqtt.connected()) conn.onEvent(ConnEvent::MQTT_UP);
    delay(500);
    return;
  }
  mqtt.loop();

  // Drain buffer
  if (millis() - lastPublishMs > 200) {
    Reading r;
    if (buf.pop(r)) {
      std::string json = formatReading(nodeId, r.mac, r.rssi, r.ts);
      String topic = String("catscan/raw/") + nodeId.c_str();
      mqtt.publish(topic.c_str(), json.c_str());
      lastPublishMs = millis();
    }
  }

  // Try to identify unknown Tiles via GATT
  tryIdentifyTile();
}
