#pragma once
#include <cstdint>

namespace catscan {

enum class ConnState { BOOT, WIFI_CONNECTING, MQTT_CONNECTING, READY };
enum class ConnEvent { START, WIFI_UP, WIFI_DOWN, MQTT_UP, MQTT_DOWN };

class ConnStateMachine {
public:
  ConnState state() const { return state_; }
  void onEvent(ConnEvent e);
  // exponential backoff in ms: 1s, 2s, 4s, ..., cap 60s
  uint32_t backoffMs(uint32_t retryIndex) const;
private:
  ConnState state_ = ConnState::BOOT;
};

}
