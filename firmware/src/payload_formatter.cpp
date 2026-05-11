#include "payload_formatter.h"
#include <sstream>

namespace catscan {
std::string formatReading(const std::string& nodeId, const std::string& mac, int rssi, int64_t tsSeconds) {
  std::ostringstream os;
  os << R"({"n":")" << nodeId << R"(","m":")" << mac << R"(","r":)" << rssi;
  if (tsSeconds > 0) os << R"(,"t":)" << tsSeconds;
  os << "}";
  return os.str();
}
}
