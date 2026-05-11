#include "conn_state.h"
#include <algorithm>

namespace catscan {

void ConnStateMachine::onEvent(ConnEvent e) {
  switch (state_) {
    case ConnState::BOOT:
      if (e == ConnEvent::START) state_ = ConnState::WIFI_CONNECTING;
      break;
    case ConnState::WIFI_CONNECTING:
      if (e == ConnEvent::WIFI_UP) state_ = ConnState::MQTT_CONNECTING;
      break;
    case ConnState::MQTT_CONNECTING:
      if (e == ConnEvent::MQTT_UP) state_ = ConnState::READY;
      else if (e == ConnEvent::WIFI_DOWN) state_ = ConnState::WIFI_CONNECTING;
      break;
    case ConnState::READY:
      if (e == ConnEvent::WIFI_DOWN) state_ = ConnState::WIFI_CONNECTING;
      else if (e == ConnEvent::MQTT_DOWN) state_ = ConnState::MQTT_CONNECTING;
      break;
  }
}

uint32_t ConnStateMachine::backoffMs(uint32_t retryIndex) const {
  uint64_t ms = 1000ULL << std::min(retryIndex, 6u); // 1000 << 6 = 64000, cap below
  return static_cast<uint32_t>(std::min<uint64_t>(ms, 60000));
}

}
