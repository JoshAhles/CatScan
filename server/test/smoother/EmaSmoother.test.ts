import { describe, it, expect } from "vitest";
import { EmaSmoother } from "../../src/smoother/EmaSmoother";

describe("EmaSmoother", () => {
  it("initial value is the first sample", () => {
    const s = new EmaSmoother(0.3);
    s.update(-50, 1000);
    expect(s.value()).toBe(-50);
  });

  it("converges toward a stable input", () => {
    const s = new EmaSmoother(0.3);
    for (let i = 0; i < 100; i++) s.update(-60, i * 1000);
    expect(s.value()!).toBeCloseTo(-60, 1);
  });

  it("step response: input jumps from -60 to -40, smoothed value rises gradually", () => {
    const s = new EmaSmoother(0.3);
    for (let i = 0; i < 20; i++) s.update(-60, i * 1000);
    expect(s.value()!).toBeCloseTo(-60, 1);
    s.update(-40, 20000);
    expect(s.value()!).toBeGreaterThan(-60);
    expect(s.value()!).toBeLessThan(-40);
  });

  it("isFresh reports false after node_stale_seconds", () => {
    const s = new EmaSmoother(0.3);
    const t0 = 1_700_000_000_000; // arbitrary epoch ms
    s.update(-50, t0);
    expect(s.isFresh(t0 + 29 * 1000, 30)).toBe(true);
    expect(s.isFresh(t0 + 31 * 1000, 30)).toBe(false);
  });

  it("value() returns null before any update", () => {
    const s = new EmaSmoother(0.3);
    expect(s.value()).toBeNull();
  });
});
