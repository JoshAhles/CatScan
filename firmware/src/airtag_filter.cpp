#include "airtag_filter.h"

namespace catscan {

bool isAirTagAdvertisement(const uint8_t* data, size_t len) {
  if (!data || len < AIRTAG_MIN_BYTES) return false;
  return data[0] == APPLE_MFG_LO &&
         data[1] == APPLE_MFG_HI &&
         data[2] == FINDMY_TYPE &&
         data[3] == FINDMY_LEN;
}

} // namespace catscan
