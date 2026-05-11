#pragma once
#include <cstdint>
#include <cstddef>

namespace catscan {

constexpr uint8_t APPLE_MFG_HI = 0x00;
constexpr uint8_t APPLE_MFG_LO = 0x4C;
constexpr uint8_t FINDMY_TYPE = 0x12;
constexpr uint8_t FINDMY_LEN = 0x19;
constexpr size_t AIRTAG_MIN_BYTES = 4;

bool isAirTagAdvertisement(const uint8_t* data, size_t len);

} // namespace catscan
