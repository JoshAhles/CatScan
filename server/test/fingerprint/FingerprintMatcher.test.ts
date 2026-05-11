import { describe, it, expect } from "vitest";
import { FingerprintMatcher, euclidean, hungarianN2 } from "../../src/fingerprint/FingerprintMatcher";

describe("FingerprintMatcher", () => {
  it("euclidean distance basics", () => {
    expect(euclidean([0,0,0], [0,0,0])).toBe(0);
    expect(euclidean([3,4,0], [0,0,0])).toBe(5);
  });

  it("nearestCentroid picks the closest room", () => {
    const m = new FingerprintMatcher({
      "Kitchen":  [-44, -78, -71, -82, -69, -58],
      "Bedroom":  [-79, -86, -89, -46, -68, -72],
    });
    const v = [-46, -80, -73, -84, -71, -60];
    expect(m.nearestCentroid(v)).toEqual({ room: "Kitchen", distance: expect.any(Number) });
  });

  it("nearestWithMargin returns null if no candidate dominates the current room by hysteresis", () => {
    const m = new FingerprintMatcher({
      "Kitchen": [-50, -80, -70, -85, -70, -60],
      "Bedroom": [-80, -85, -88, -45, -70, -72],
    });
    // Live vector close to Kitchen but in transition
    const v = [-55, -78, -72, -80, -70, -62];
    const next = m.nearestWithMargin(v, "Kitchen", 8);
    expect(next).toBeNull();
  });

  it("nearestWithMargin returns a room if the margin is exceeded", () => {
    const m = new FingerprintMatcher({
      "Kitchen": [-50, -80, -70, -85, -70, -60],
      "Bedroom": [-80, -85, -88, -45, -70, -72],
    });
    const v = [-80, -85, -87, -47, -71, -73]; // very close to Bedroom
    const next = m.nearestWithMargin(v, "Kitchen", 8);
    expect(next?.room).toBe("Bedroom");
  });

  it("hungarianN2 picks the lower-cost pairing", () => {
    // A→X cheap, B→Y cheap
    const result = hungarianN2([[1, 100], [100, 1]]);
    expect(result).toEqual([0, 1]);
    // A→Y cheap, B→X cheap
    const r2 = hungarianN2([[100, 1], [1, 100]]);
    expect(r2).toEqual([1, 0]);
  });
});
