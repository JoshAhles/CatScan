import { describe, it, expect, beforeEach } from "vitest";
import { RoomDecider } from "../../src/decider/RoomDecider";

const NODE_IDS = ["n1","n2","n3","n4","n5","n6"];

function vecFor(strongest: number, weakest = -90): number[] {
  // 6-element vector; index `strongest` is -50, others are -85
  return NODE_IDS.map((_, i) => (i === strongest ? -50 : weakest));
}

const CENTROIDS = {
  "Front Room": vecFor(0),
  "Kitchen":    vecFor(1),
  "Bedroom":    vecFor(2),
  "Office":     vecFor(3),
  "Cat Room":   vecFor(4),
};

describe("RoomDecider", () => {
  let d: RoomDecider;
  beforeEach(() => {
    d = new RoomDecider({
      nodeIds: NODE_IDS,
      centroids: CENTROIDS,
      hysteresisDbm: 8,
      hysteresisTicks: 3,
      silentSeconds: 60,
      staleSentinelDbm: -95,
    });
  });

  it("first reading places the cat in the nearest room", () => {
    const decision = d.tick("CAT-MAC", { n1: -50, n2: -85, n3: -85, n4: -85, n5: -85, n6: -85 }, 1000);
    expect(decision.room).toBe("Front Room");
    expect(decision.kind).toBe("placed");
  });

  it("requires 3 consecutive ticks of the new room before transitioning", () => {
    // settle in Front Room
    for (let t = 0; t < 5; t++) d.tick("M", { n1: -50, n2: -85, n3: -85, n4: -85, n5: -85, n6: -85 }, t*1000);
    // now Kitchen wins for 2 ticks — should NOT transition
    let dec = d.tick("M", { n1: -85, n2: -50, n3: -85, n4: -85, n5: -85, n6: -85 }, 6000);
    expect(dec.kind).toBe("noChange");
    dec = d.tick("M", { n1: -85, n2: -50, n3: -85, n4: -85, n5: -85, n6: -85 }, 7000);
    expect(dec.kind).toBe("noChange");
    dec = d.tick("M", { n1: -85, n2: -50, n3: -85, n4: -85, n5: -85, n6: -85 }, 8000);
    expect(dec.kind).toBe("transitioned");
    expect(dec.room).toBe("Kitchen");
  });

  it("respects the hysteresis margin — ambiguous boundary stays put", () => {
    for (let t = 0; t < 5; t++) d.tick("M", { n1: -50, n2: -85, n3: -85, n4: -85, n5: -85, n6: -85 }, t*1000);
    // Kitchen barely wins (margin < 8 dBm)
    const dec = d.tick("M", { n1: -50, n2: -49, n3: -85, n4: -85, n5: -85, n6: -85 }, 6000);
    expect(dec.kind).toBe("noChange");
  });

  it("emits silent state after silentSeconds with no readings", () => {
    d.tick("M", { n1: -50 }, 1000);
    const dec = d.tick("M", {}, 1000 + 61_000);
    expect(dec.kind).toBe("silent");
  });

  it("missing nodes are imputed with the sentinel", () => {
    // Only one node reports, the others are absent. Result still classifies.
    const dec = d.tick("M", { n1: -50 }, 1000);
    expect(dec.room).toBe("Front Room");
  });

  describe("sweepSilent", () => {
    it("returns MACs that have been silent longer than silentSeconds", () => {
      d.tick("M1", { n1: -50, n2: -85, n3: -85, n4: -85, n5: -85, n6: -85 }, 1000);
      d.tick("M2", { n1: -85, n2: -50, n3: -85, n4: -85, n5: -85, n6: -85 }, 1000);

      // 61s later, neither has been heard from
      const gone = d.sweepSilent(1000 + 61_000);
      expect(gone).toHaveLength(2);
      expect(gone.map(g => g.mac).sort()).toEqual(["M1", "M2"]);
      expect(gone[0]!.lastRoom).toBeDefined();
    });

    it("does not return MACs that have recent readings", () => {
      d.tick("M1", { n1: -50, n2: -85, n3: -85, n4: -85, n5: -85, n6: -85 }, 1000);
      d.tick("M1", { n1: -50, n2: -85, n3: -85, n4: -85, n5: -85, n6: -85 }, 60_000);

      const gone = d.sweepSilent(61_000);
      expect(gone).toHaveLength(0);
    });

    it("clears state for swept MACs so they don't fire again", () => {
      d.tick("M1", { n1: -50, n2: -85, n3: -85, n4: -85, n5: -85, n6: -85 }, 1000);

      const first = d.sweepSilent(1000 + 61_000);
      expect(first).toHaveLength(1);

      const second = d.sweepSilent(1000 + 120_000);
      expect(second).toHaveLength(0);
    });

    it("only returns MACs that have been placed in a room", () => {
      // A MAC that was never placed (no tick result) shouldn't trigger silence
      d.tick("M1", { n1: -50, n2: -85, n3: -85, n4: -85, n5: -85, n6: -85 }, 1000);
      // M1 is placed in Front Room

      // Now create a reading via recordReading for a mac that never got a room
      d.recordReading("UNPLACED", "n1", -70, 1000);

      const gone = d.sweepSilent(1000 + 61_000);
      // Only M1 should appear (it has a room), not UNPLACED
      expect(gone).toHaveLength(1);
      expect(gone[0]!.mac).toBe("M1");
    });
  });
});
