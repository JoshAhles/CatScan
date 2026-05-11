import { describe, it, expect } from "vitest";
import { CalibrationCapture } from "../../src/calibration/CalibrationCapture";

describe("CalibrationCapture", () => {
  it("returns null centroid before any samples", () => {
    const c = new CalibrationCapture(["n1","n2"], -95, 5);
    expect(c.centroid()).toBeNull();
  });

  it("requires minSamples before centroid is valid", () => {
    const c = new CalibrationCapture(["n1","n2"], -95, 5);
    for (let i = 0; i < 4; i++) c.addReading({ n1: -50, n2: -80 });
    expect(c.centroid()).toBeNull();
    c.addReading({ n1: -50, n2: -80 });
    expect(c.centroid()).toEqual([-50, -80]);
  });

  it("means readings; missing nodes get the sentinel", () => {
    const c = new CalibrationCapture(["n1","n2","n3"], -95, 3);
    c.addReading({ n1: -50, n2: -80 });
    c.addReading({ n1: -52, n2: -78, n3: -70 });
    c.addReading({ n1: -54, n2: -82, n3: -72 });
    const cen = c.centroid()!;
    expect(cen[0]).toBeCloseTo(-52, 1);
    expect(cen[1]).toBeCloseTo(-80, 1);
    // n3 missing in first sample → sentinel; subsequent values average in
    expect(cen[2]).toBeCloseTo((-95 + -70 + -72) / 3, 1);
  });

  it("reports progress as samples / target", () => {
    const c = new CalibrationCapture(["n1"], -95, 5);
    c.addReading({ n1: -50 });
    expect(c.progress()).toEqual({ samples: 1, target: 5 });
  });
});
