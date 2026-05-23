import { describe, it, expect } from "vitest";
import { rawReadingSchema, isValidMac, type RawReading } from "../../src/contracts/mqtt";

describe("MQTT raw reading contract", () => {
  it("accepts a fully-formed reading with timestamp", () => {
    const msg = { n: "node-A1B2C3D4", m: "AA:BB:CC:DD:EE:FF", r: -67, t: 1715446789 };
    const parsed = rawReadingSchema.parse(msg);
    expect(parsed).toEqual(msg);
  });

  it("accepts a reading without timestamp (NTP failed)", () => {
    const msg = { n: "node-A1B2C3D4", m: "AA:BB:CC:DD:EE:FF", r: -67 };
    const parsed = rawReadingSchema.parse(msg);
    expect(parsed.t).toBeUndefined();
  });

  it("rejects malformed node_id", () => {
    expect(() => rawReadingSchema.parse({ n: "node-bad", m: "AA:BB:CC:DD:EE:FF", r: -67, t: 1 }))
      .toThrow();
  });

  it("rejects RSSI out of range", () => {
    expect(() => rawReadingSchema.parse({ n: "node-A1B2C3D4", m: "AA:BB:CC:DD:EE:FF", r: 10, t: 1 }))
      .toThrow();
  });

  it("rejects lowercase MAC", () => {
    expect(() => rawReadingSchema.parse({ n: "node-A1B2C3D4", m: "aa:bb:cc:dd:ee:ff", r: -67, t: 1 }))
      .toThrow();
  });

  it("validates a MAC format helper", () => {
    expect(isValidMac("AA:BB:CC:DD:EE:FF")).toBe(true);
    expect(isValidMac("AA:BB:CC:DD:EE")).toBe(false);
  });
});
