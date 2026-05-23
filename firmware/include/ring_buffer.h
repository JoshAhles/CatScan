#pragma once
#include <array>
#include <cstddef>

#ifdef UNIT_TEST
// No FreeRTOS in native tests — use a no-op lock
namespace catscan {
struct Lock { Lock() {} };
}
#else
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
namespace catscan {
struct Lock {
  SemaphoreHandle_t mtx;
  Lock() { mtx = xSemaphoreCreateMutex(); }
  void acquire() { xSemaphoreTake(mtx, portMAX_DELAY); }
  void release() { xSemaphoreGive(mtx); }
};
}
#endif

namespace catscan {

template <typename T, size_t N>
class RingBuffer {
  static_assert(N > 0, "RingBuffer capacity must be > 0");
public:
  void push(const T& v) {
#ifndef UNIT_TEST
    lock_.acquire();
#endif
    if (count_ == N) {
      head_ = (head_ + 1) % N;
    } else {
      ++count_;
    }
    buf_[tail_] = v;
    tail_ = (tail_ + 1) % N;
#ifndef UNIT_TEST
    lock_.release();
#endif
  }

  bool pop(T& out) {
#ifndef UNIT_TEST
    lock_.acquire();
#endif
    if (count_ == 0) {
#ifndef UNIT_TEST
      lock_.release();
#endif
      return false;
    }
    out = buf_[head_];
    head_ = (head_ + 1) % N;
    --count_;
#ifndef UNIT_TEST
    lock_.release();
#endif
    return true;
  }

  size_t size() const { return count_; }

private:
  std::array<T, N> buf_{};
  size_t head_ = 0;
  size_t tail_ = 0;
  size_t count_ = 0;
  Lock lock_;
};

} // namespace catscan
