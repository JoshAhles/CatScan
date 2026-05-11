#include <Arduino.h>
#include <WiFi.h>
#include <NimBLEDevice.h>
#include <PubSubClient.h>
#include <time.h>
#include "secrets.h"
#include "airtag_filter.h"
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

static std::string deriveNodeId() {
  uint8_t mac[6]; WiFi.macAddress(mac);
  char id[20];
  snprintf(id, sizeof(id), "node-%02X%02X%02X%02X", mac[2], mac[3], mac[4], mac[5]);
  return std::string(id);
}

class ScanCallbacks : public NimBLEAdvertisedDeviceCallbacks {
  void onResult(NimBLEAdvertisedDevice* dev) override {
    if (!dev->haveManufacturerData()) return;
    std::string m = dev->getManufacturerData();
    if (!isAirTagAdvertisement(reinterpret_cast<const uint8_t*>(m.data()), m.size())) return;

    std::string macStr = dev->getAddress().toString();
    for (auto& c : macStr) c = toupper(c);

    time_t now = time(nullptr);
    int64_t ts = (now > 1700000000) ? static_cast<int64_t>(now) : 0;

    buf.push(Reading{macStr, dev->getRSSI(), ts});
  }
};

static void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(CATSCAN_WIFI_SSID, CATSCAN_WIFI_PASS);
}

static void connectMqtt() {
  mqtt.setServer(CATSCAN_MQTT_HOST, CATSCAN_MQTT_PORT);
  String clientId = String(nodeId.c_str());
  String lwt = String("catscan/health/") + clientId;
  mqtt.connect(clientId.c_str(), CATSCAN_MQTT_USER, CATSCAN_MQTT_PASS,
               lwt.c_str(), 0, true, "offline");
  if (mqtt.connected()) mqtt.publish(lwt.c_str(), "online", true);
}

void setup() {
  Serial.begin(115200);
  nodeId = deriveNodeId();
  Serial.printf("CatScan node %s booting\n", nodeId.c_str());

  conn.onEvent(ConnEvent::START);
  connectWifi();

  configTime(0, 0, CATSCAN_NTP_HOST);

  NimBLEDevice::init("");
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

  // Drain buffer at ~one publish per 500ms (rate-limit per loop, not per MAC for simplicity v1)
  if (millis() - lastPublishMs > 500) {
    Reading r;
    if (buf.pop(r)) {
      std::string json = formatReading(nodeId, r.mac, r.rssi, r.ts);
      String topic = String("catscan/raw/") + nodeId.c_str();
      mqtt.publish(topic.c_str(), json.c_str());
      lastPublishMs = millis();
    }
  }
}
