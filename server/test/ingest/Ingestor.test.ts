import { describe, it, expect, vi } from "vitest";
import { Ingestor } from "../../src/ingest/Ingestor";

describe("Ingestor", () => {
  it("accepts a valid reading and forwards to handlers", () => {
    const onReading = vi.fn();
    const onNodeDiscovered = vi.fn();
    const ing = new Ingestor({ onReading, onNodeDiscovered, knownNodeId: () => false, nowSec: () => 1715446789 });
    ing.handleMessage("catscan/raw/node-A1B2C3D4",
      Buffer.from(JSON.stringify({ n: "node-A1B2C3D4", m: "AA:BB:CC:DD:EE:FF", r: -67, t: 1715446789 })));
    expect(onNodeDiscovered).toHaveBeenCalledWith("node-A1B2C3D4");
    expect(onReading).toHaveBeenCalledWith({ n: "node-A1B2C3D4", m: "AA:BB:CC:DD:EE:FF", r: -67, t: 1715446789 });
  });

  it("rejects messages with clock skew > 5s", () => {
    const onReading = vi.fn();
    const ing = new Ingestor({ onReading, onNodeDiscovered: () => {}, knownNodeId: () => true, nowSec: () => 2000 });
    ing.handleMessage("catscan/raw/node-A1B2C3D4",
      Buffer.from(JSON.stringify({ n: "node-A1B2C3D4", m: "AA:BB:CC:DD:EE:FF", r: -67, t: 1000 })));
    expect(onReading).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without crashing", () => {
    const onReading = vi.fn();
    const ing = new Ingestor({ onReading, onNodeDiscovered: () => {}, knownNodeId: () => true, nowSec: () => 1 });
    expect(() => ing.handleMessage("catscan/raw/node-A1B2C3D4", Buffer.from("garbage"))).not.toThrow();
    expect(onReading).not.toHaveBeenCalled();
  });

  it("stamps t when missing", () => {
    const onReading = vi.fn();
    const ing = new Ingestor({ onReading, onNodeDiscovered: () => {}, knownNodeId: () => true, nowSec: () => 9000 });
    ing.handleMessage("catscan/raw/node-A1B2C3D4",
      Buffer.from(JSON.stringify({ n: "node-A1B2C3D4", m: "AA:BB:CC:DD:EE:FF", r: -67 })));
    expect(onReading).toHaveBeenCalledWith(expect.objectContaining({ t: 9000 }));
  });
});
