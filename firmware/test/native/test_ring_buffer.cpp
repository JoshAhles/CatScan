#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include "doctest.h"
#include "ring_buffer.h"
#include <string>

TEST_CASE("Push and pop preserve FIFO order") {
  catscan::RingBuffer<int, 4> rb;
  rb.push(1); rb.push(2); rb.push(3);
  CHECK(rb.size() == 3);
  int v;
  CHECK(rb.pop(v)); CHECK(v == 1);
  CHECK(rb.pop(v)); CHECK(v == 2);
  CHECK(rb.pop(v)); CHECK(v == 3);
  CHECK_FALSE(rb.pop(v));
}

TEST_CASE("Overflow drops oldest") {
  catscan::RingBuffer<int, 3> rb;
  rb.push(1); rb.push(2); rb.push(3); rb.push(4);
  CHECK(rb.size() == 3);
  int v;
  rb.pop(v); CHECK(v == 2);
  rb.pop(v); CHECK(v == 3);
  rb.pop(v); CHECK(v == 4);
}

TEST_CASE("Empty buffer pop returns false") {
  catscan::RingBuffer<std::string, 2> rb;
  std::string s;
  CHECK_FALSE(rb.pop(s));
  CHECK(rb.size() == 0);
}
