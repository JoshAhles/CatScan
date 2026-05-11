#pragma once
#include <array>
#include <cstddef>

namespace catscan {

template <typename T, size_t N>
class RingBuffer {
  static_assert(N > 0, "RingBuffer capacity must be > 0");
public:
  void push(const T& v) {
    if (count_ == N) {
      head_ = (head_ + 1) % N; // drop oldest
    } else {
      ++count_;
    }
    buf_[tail_] = v;
    tail_ = (tail_ + 1) % N;
  }

  bool pop(T& out) {
    if (count_ == 0) return false;
    out = buf_[head_];
    head_ = (head_ + 1) % N;
    --count_;
    return true;
  }

  size_t size() const { return count_; }

private:
  std::array<T, N> buf_{};
  size_t head_ = 0;
  size_t tail_ = 0;
  size_t count_ = 0;
};

} // namespace catscan
