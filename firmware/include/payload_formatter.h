#pragma once
#include <string>
#include <cstdint>

namespace catscan {
std::string formatReading(const std::string& nodeId,
                          const std::string& mac,
                          int rssi,
                          int64_t tsSeconds);  // pass 0 to omit
}
