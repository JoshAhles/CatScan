#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest.h"
#include "payload_formatter.h"
#include <string>

TEST_CASE("formats with timestamp present") {
  auto s = catscan::formatReading("node-A1B2C3D4", "AA:BB:CC:DD:EE:FF", -67, 1715446789);
  CHECK(s == R"({"n":"node-A1B2C3D4","m":"AA:BB:CC:DD:EE:FF","r":-67,"t":1715446789})");
}

TEST_CASE("omits timestamp when zero (NTP failed)") {
  auto s = catscan::formatReading("node-A1B2C3D4", "AA:BB:CC:DD:EE:FF", -67, 0);
  CHECK(s == R"({"n":"node-A1B2C3D4","m":"AA:BB:CC:DD:EE:FF","r":-67})");
}

TEST_CASE("RSSI of zero serializes correctly") {
  auto s = catscan::formatReading("node-A1B2C3D4", "AA:BB:CC:DD:EE:FF", 0, 1);
  CHECK(s == R"({"n":"node-A1B2C3D4","m":"AA:BB:CC:DD:EE:FF","r":0,"t":1})");
}
