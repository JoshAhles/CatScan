import { describe, it, expect } from "vitest";
import { serverEventSchema, snapshotSchema, type ServerEvent } from "../../src/contracts/ws";

describe("WebSocket server→client event contract", () => {
  it("validates a snapshot with one visible + one silent cat", () => {
    const snap = {
      type: "snapshot" as const,
      ts: 1715446800,
      cats: [
        { id: 1, name: "Ollie", color: "#ffcc4d",
          room: "Bedroom", since: 1715446345,
          silent: false, lastRoom: null, lastSeen: null,
          photoPath: "/cats/1.png" },
        { id: 2, name: "Hope", color: "#fb7185",
          room: null, since: null,
          silent: true, lastRoom: "Kitchen", lastSeen: 1715446200,
          photoPath: null },
      ],
      nodes: [
        { id: "node-A1B2C3D4", roomName: "Front Room", status: "online",
          rssiByCatId: { "1": -72, "2": -55 } },
      ],
      calibration: { "Front Room": "calibrated", "Kitchen": "uncalibrated" },
    };
    expect(snapshotSchema.parse(snap)).toEqual(snap);
  });

  it("enforces the silent-state invariant: silent=true requires room=null", () => {
    const bad = {
      type: "snapshot" as const, ts: 1, cats: [{
        id: 1, name: "X", color: "#000000",
        room: "Bedroom", since: 1,
        silent: true, lastRoom: null, lastSeen: null, photoPath: null,
      }], nodes: [], calibration: {},
    };
    expect(() => snapshotSchema.parse(bad)).toThrow();
  });

  it("validates a transition event", () => {
    const ev = { type: "transition" as const, catId: 1, from: "Bedroom", to: "Office", at: 1715446810 };
    expect(serverEventSchema.parse(ev)).toEqual(ev);
  });

  it("validates a silent event", () => {
    const ev = { type: "silent" as const, catId: 2, lastRoom: "Kitchen", lastSeen: 1715446820 };
    expect(serverEventSchema.parse(ev)).toEqual(ev);
  });

  it("validates an rssiUpdate event with bound + unbound entries", () => {
    const ev = {
      type: "rssiUpdate" as const, ts: 1715446811,
      values: [
        { nodeId: "node-A1B2C3D4", catId: 1, rssi: -68 },
        { nodeId: "node-A1B2C3D4", catId: null, mac: "EE:FF:00:11:22:33", rssi: -82 },
      ],
    };
    expect(serverEventSchema.parse(ev)).toEqual(ev);
  });

  it("validates an identityAmbiguous event", () => {
    const ev = {
      type: "identityAmbiguous" as const,
      candidates: [
        { mac: "AA:BB:CC:DD:EE:FF", fingerprint: [-70, -80, -75, -90, -85, -88] },
        { mac: "11:22:33:44:55:66", fingerprint: [-71, -79, -76, -91, -84, -87] },
      ],
      at: 1715446811,
    };
    expect(serverEventSchema.parse(ev)).toEqual(ev);
  });

  it("validates calibrationProgress, centroidSaved, nodeDiscovered, nodeHealth, error", () => {
    expect(serverEventSchema.parse({ type: "calibrationProgress", room: "Kitchen", samples: 8, target: 15 })).toBeDefined();
    expect(serverEventSchema.parse({ type: "centroidSaved", room: "Kitchen", sampleCount: 15, at: 1 })).toBeDefined();
    expect(serverEventSchema.parse({ type: "nodeDiscovered", nodeId: "node-FF00FF00", at: 1 })).toBeDefined();
    expect(serverEventSchema.parse({ type: "nodeHealth", nodeId: "node-A1B2C3D4", status: "offline", since: 1 })).toBeDefined();
    expect(serverEventSchema.parse({ type: "error", code: "X", message: "y", at: 1 })).toBeDefined();
  });
});
