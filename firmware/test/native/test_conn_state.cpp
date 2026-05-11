#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest.h"
#include "conn_state.h"

using catscan::ConnState;
using catscan::ConnEvent;
using catscan::ConnStateMachine;

TEST_CASE("starts in BOOT") {
  ConnStateMachine m;
  CHECK(m.state() == ConnState::BOOT);
}

TEST_CASE("BOOT → WIFI_CONNECTING on start") {
  ConnStateMachine m;
  m.onEvent(ConnEvent::START);
  CHECK(m.state() == ConnState::WIFI_CONNECTING);
}

TEST_CASE("WIFI_CONNECTING → MQTT_CONNECTING on wifi up") {
  ConnStateMachine m;
  m.onEvent(ConnEvent::START);
  m.onEvent(ConnEvent::WIFI_UP);
  CHECK(m.state() == ConnState::MQTT_CONNECTING);
}

TEST_CASE("MQTT_CONNECTING → READY on mqtt connect") {
  ConnStateMachine m;
  m.onEvent(ConnEvent::START);
  m.onEvent(ConnEvent::WIFI_UP);
  m.onEvent(ConnEvent::MQTT_UP);
  CHECK(m.state() == ConnState::READY);
}

TEST_CASE("READY → WIFI_CONNECTING on wifi drop") {
  ConnStateMachine m;
  m.onEvent(ConnEvent::START);
  m.onEvent(ConnEvent::WIFI_UP);
  m.onEvent(ConnEvent::MQTT_UP);
  m.onEvent(ConnEvent::WIFI_DOWN);
  CHECK(m.state() == ConnState::WIFI_CONNECTING);
}

TEST_CASE("READY → MQTT_CONNECTING on mqtt drop") {
  ConnStateMachine m;
  m.onEvent(ConnEvent::START);
  m.onEvent(ConnEvent::WIFI_UP);
  m.onEvent(ConnEvent::MQTT_UP);
  m.onEvent(ConnEvent::MQTT_DOWN);
  CHECK(m.state() == ConnState::MQTT_CONNECTING);
}

TEST_CASE("backoff doubles with each retry, capped at 60s") {
  ConnStateMachine m;
  CHECK(m.backoffMs(0) == 1000);
  CHECK(m.backoffMs(1) == 2000);
  CHECK(m.backoffMs(2) == 4000);
  CHECK(m.backoffMs(10) == 60000);
  CHECK(m.backoffMs(100) == 60000);
}
