import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/store/migrationRunner";
import { EventStore } from "../../src/store/EventStore";
import { WsServer, Hub } from "../../src/ws/WsServer";
import { Orchestrator } from "../../src/orchestrator/Orchestrator";
import { TOPIC_RAW_PREFIX, TOPIC_HEALTH_PREFIX } from "../../src/contracts/mqtt";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ServerEvent } from "../../src/contracts/ws";

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildOrchestrator() {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  const store = new EventStore(db);

  const emittedEvents: ServerEvent[] = [];
  const hub = new Hub();
  hub.setSnapshotProvider(() => ({ type: "snapshot", ts: Date.now(), cats: [], nodes: [], calibration: {} }));

  const ws = new WsServer("TOKEN", hub);
  const origBroadcast = ws.broadcast.bind(ws);
  ws.broadcast = (event: ServerEvent) => {
    emittedEvents.push(event);
    origBroadcast(event);
  };

  const nowSec = () => 1715446789;

  const orchestrator = new Orchestrator({ store, ws, nowSec });
  return { store, orchestrator, emittedEvents };
}

describe("Orchestrator composition", () => {
  it("starts without throwing", async () => {
    const { orchestrator } = buildOrchestrator();
    await expect(orchestrator.start()).resolves.toBeUndefined();
    orchestrator.stop();
  });

  it("discovers a node when first MQTT message arrives", async () => {
    const { store, orchestrator, emittedEvents } = buildOrchestrator();
    await orchestrator.start();

    const payload = JSON.stringify({ n: "node-A1B2C3D4", m: "AA:BB:CC:DD:EE:FF", r: -65, t: 1715446789 });
    orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-A1B2C3D4`, Buffer.from(payload));

    const nodes = store.listNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.id).toBe("node-A1B2C3D4");

    const discovered = emittedEvents.find(e => e.type === "nodeDiscovered");
    expect(discovered).toBeDefined();

    orchestrator.stop();
  });

  it("ignores messages with bad payload", async () => {
    const { store, orchestrator } = buildOrchestrator();
    await orchestrator.start();

    orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-A1B2C3D4`, Buffer.from("not-json"));

    expect(store.listNodes()).toHaveLength(0);
    orchestrator.stop();
  });

  it("records node health from catscan/health/+ and broadcasts nodeHealth", async () => {
    const { store, orchestrator, emittedEvents } = buildOrchestrator();
    await orchestrator.start();

    orchestrator.handleHealthMessage(`${TOPIC_HEALTH_PREFIX}node-DEADBEEF`, Buffer.from("online"));
    let nodes = store.listNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.id).toBe("node-DEADBEEF");
    expect(nodes[0]?.status).toBe("online");
    expect(nodes[0]?.last_heartbeat).toBe(1715446789);

    orchestrator.handleHealthMessage(`${TOPIC_HEALTH_PREFIX}node-DEADBEEF`, Buffer.from("offline"));
    nodes = store.listNodes();
    expect(nodes[0]?.status).toBe("offline");

    const healthEvents = emittedEvents.filter(e => e.type === "nodeHealth");
    expect(healthEvents).toHaveLength(2);
    orchestrator.stop();
  });

  it("ignores malformed health payloads", async () => {
    const { store, orchestrator } = buildOrchestrator();
    await orchestrator.start();
    orchestrator.handleHealthMessage(`${TOPIC_HEALTH_PREFIX}node-DEADBEEF`, Buffer.from("yes please"));
    orchestrator.handleHealthMessage(`${TOPIC_HEALTH_PREFIX}not-a-node-id`, Buffer.from("online"));
    expect(store.listNodes()).toHaveLength(0);
    orchestrator.stop();
  });

  it("feeds reading to room decider for a known cat+mac", async () => {
    const { store, orchestrator, emittedEvents } = buildOrchestrator();

    // Setup: cat + mac + room centroids + node
    const catId = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    store.upsertNode("node-A1B2C3D4");
    store.saveCentroid("Bedroom", [-65, -100, -100, -100, -100, -100], 10, 1715446780);
    const ts = Math.floor(Date.now() / 1000);
    store.bindMac("AA:BB:CC:DD:EE:FF", catId, "manual", ts);

    await orchestrator.start();

    // Send enough messages to trigger placement
    for (let i = 0; i < 5; i++) {
      const payload = JSON.stringify({ n: "node-A1B2C3D4", m: "AA:BB:CC:DD:EE:FF", r: -65, t: 1715446789 });
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-A1B2C3D4`, Buffer.from(payload));
    }

    // Should have emitted some events (snapshot or placement)
    expect(emittedEvents.length).toBeGreaterThan(0);
    orchestrator.stop();
  });
});
