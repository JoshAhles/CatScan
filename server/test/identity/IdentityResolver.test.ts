import { describe, it, expect } from "vitest";
import { IdentityResolver } from "../../src/identity/IdentityResolver";

const NODE_IDS = ["n1","n2","n3","n4","n5","n6"];

describe("IdentityResolver", () => {
  it("clean rotation auto-rebinds two distinct fingerprints", () => {
    const r = new IdentityResolver({ confidenceRatio: 0.5, staleSentinelDbm: -95, nodeIds: NODE_IDS });

    // Cats Ollie (MAC AA) in Bedroom-ish, Hope (MAC BB) in Kitchen-ish — rolling fingerprints
    r.bind("AA:AA:AA:AA:AA:AA", 1, "manual");
    r.bind("BB:BB:BB:BB:BB:BB", 2, "manual");
    for (let i = 0; i < 30; i++) {
      r.recordReading("AA:AA:AA:AA:AA:AA", { n1:-80, n2:-78, n3:-50, n4:-72, n5:-75, n6:-70 }, i*1000);
      r.recordReading("BB:BB:BB:BB:BB:BB", { n1:-78, n2:-50, n3:-78, n4:-85, n5:-80, n6:-65 }, i*1000);
    }

    // Both go silent at rotation
    r.markSilent("AA:AA:AA:AA:AA:AA", 30000);
    r.markSilent("BB:BB:BB:BB:BB:BB", 30000);

    // New MACs appear with the corresponding fingerprints
    for (let i = 0; i < 30; i++) {
      r.recordReading("CC:CC:CC:CC:CC:CC", { n1:-79, n2:-77, n3:-51, n4:-73, n5:-74, n6:-71 }, 31000+i*1000);
      r.recordReading("DD:DD:DD:DD:DD:DD", { n1:-79, n2:-49, n3:-77, n4:-84, n5:-81, n6:-66 }, 31000+i*1000);
    }
    const newcomers = ["CC:CC:CC:CC:CC:CC", "DD:DD:DD:DD:DD:DD"];
    const result = r.attemptRebind(newcomers, 60000);
    expect(result.kind).toBe("autoRebound");
    if (result.kind !== "autoRebound") throw new Error("type narrowing");
    expect(result.pairings).toEqual([
      { mac: "CC:CC:CC:CC:CC:CC", catId: 1 },
      { mac: "DD:DD:DD:DD:DD:DD", catId: 2 },
    ]);
  });

  it("huddled cats produce identityAmbiguous", () => {
    const r = new IdentityResolver({ confidenceRatio: 0.5, staleSentinelDbm: -95, nodeIds: NODE_IDS });
    r.bind("AA:AA:AA:AA:AA:AA", 1, "manual");
    r.bind("BB:BB:BB:BB:BB:BB", 2, "manual");
    for (let i = 0; i < 30; i++) {
      r.recordReading("AA:AA:AA:AA:AA:AA", { n1:-50, n2:-78, n3:-78, n4:-82, n5:-79, n6:-71 }, i*1000);
      r.recordReading("BB:BB:BB:BB:BB:BB", { n1:-51, n2:-77, n3:-79, n4:-81, n5:-80, n6:-72 }, i*1000);
    }
    r.markSilent("AA:AA:AA:AA:AA:AA", 30000);
    r.markSilent("BB:BB:BB:BB:BB:BB", 30000);
    for (let i = 0; i < 30; i++) {
      r.recordReading("CC:CC:CC:CC:CC:CC", { n1:-50, n2:-78, n3:-78, n4:-83, n5:-80, n6:-70 }, 31000+i*1000);
      r.recordReading("DD:DD:DD:DD:DD:DD", { n1:-51, n2:-77, n3:-79, n4:-82, n5:-79, n6:-71 }, 31000+i*1000);
    }
    const result = r.attemptRebind(["CC:CC:CC:CC:CC:CC", "DD:DD:DD:DD:DD:DD"], 60000);
    expect(result.kind).toBe("ambiguous");
  });

  it("asymmetric: only one new MAC appears — 1-to-2 match against departed MACs", () => {
    const r = new IdentityResolver({ confidenceRatio: 0.5, staleSentinelDbm: -95, nodeIds: NODE_IDS });
    r.bind("AA:AA:AA:AA:AA:AA", 1, "manual");
    r.bind("BB:BB:BB:BB:BB:BB", 2, "manual");
    for (let i = 0; i < 30; i++) {
      r.recordReading("AA:AA:AA:AA:AA:AA", { n1:-80, n2:-78, n3:-50, n4:-72, n5:-75, n6:-70 }, i*1000);
      r.recordReading("BB:BB:BB:BB:BB:BB", { n1:-78, n2:-50, n3:-78, n4:-85, n5:-80, n6:-65 }, i*1000);
    }
    r.markSilent("AA:AA:AA:AA:AA:AA", 30000);
    r.markSilent("BB:BB:BB:BB:BB:BB", 30000);

    // Only cat 1's new MAC appears (cat 2 is in Connected mode with phone)
    for (let i = 0; i < 30; i++) {
      r.recordReading("CC:CC:CC:CC:CC:CC", { n1:-79, n2:-77, n3:-51, n4:-73, n5:-74, n6:-71 }, 31000+i*1000);
    }
    const result = r.attemptRebind(["CC:CC:CC:CC:CC:CC"], 60000);
    expect(result.kind).toBe("autoRebound");
    if (result.kind !== "autoRebound") throw new Error("narrowing");
    expect(result.pairings).toEqual([{ mac: "CC:CC:CC:CC:CC:CC", catId: 1 }]);
  });
});
