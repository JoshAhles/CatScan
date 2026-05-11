#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest.h"
#include "airtag_filter.h"
#include <cstdint>
#include <vector>

// Helper: build a manufacturer-data payload
static std::vector<uint8_t> mfg(std::initializer_list<uint8_t> bytes) {
  return std::vector<uint8_t>(bytes);
}

TEST_CASE("AirTag filter accepts a canonical AirTag advertisement") {
  // 0x4C 0x00 (Apple) + 0x12 (FindMy) + 0x19 (len 25) + 25 payload bytes
  auto adv = mfg({0x4C, 0x00, 0x12, 0x19});
  for (int i = 0; i < 25; ++i) adv.push_back(0xAB);
  CHECK(catscan::isAirTagAdvertisement(adv.data(), adv.size()));
}

TEST_CASE("AirTag filter rejects iPhone / Watch / AirPods advertisements (Apple but not FindMy)") {
  CHECK_FALSE(catscan::isAirTagAdvertisement(mfg({0x4C, 0x00, 0x10, 0x05}).data(), 4));
  CHECK_FALSE(catscan::isAirTagAdvertisement(mfg({0x4C, 0x00, 0x07}).data(), 3));
}

TEST_CASE("AirTag filter rejects non-Apple manufacturer data") {
  CHECK_FALSE(catscan::isAirTagAdvertisement(mfg({0x06, 0x00, 0x12, 0x19}).data(), 4));
}

TEST_CASE("AirTag filter rejects too-short buffers") {
  CHECK_FALSE(catscan::isAirTagAdvertisement(mfg({0x4C}).data(), 1));
  CHECK_FALSE(catscan::isAirTagAdvertisement(mfg({0x4C, 0x00, 0x12}).data(), 3));
}

TEST_CASE("AirTag filter rejects null pointer") {
  CHECK_FALSE(catscan::isAirTagAdvertisement(nullptr, 0));
}
