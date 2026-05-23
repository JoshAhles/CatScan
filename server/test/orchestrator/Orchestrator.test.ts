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

function buildOrchestratorWithClock(setup?: (store: EventStore) => void) {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  const store = new EventStore(db);

  if (setup) setup(store);

  const emittedEvents: ServerEvent[] = [];
  const hub = new Hub();
  hub.setSnapshotProvider(() => ({ type: "snapshot", ts: Date.now(), cats: [], nodes: [], calibration: {} }));

  const ws = new WsServer("TOKEN", hub);
  const origBroadcast = ws.broadcast.bind(ws);
  ws.broadcast = (event: ServerEvent) => {
    emittedEvents.push(event);
    origBroadcast(event);
  };

  let clock = 1715446789;
  const nowSec = () => clock;
  const setClock = (t: number) => { clock = t; };

  const orchestrator = new Orchestrator({
    store,
    ws,
    nowSec,
    silentSeconds: 60,
    rssiBroadcastIntervalMs: 0,
  });
  return { store, orchestrator, emittedEvents, setClock, nowSec };
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

describe("Orchestrator MAC rotation + event-driven rebind", () => {
  it("detects silence via sweepSilent and auto-rebinds a new MAC to the same cat", async () => {
    let catId: number;
    const { store, orchestrator, emittedEvents, setClock } = buildOrchestratorWithClock((s) => {
      s.upsertNode("node-AAAA0001");
      s.upsertNode("node-AAAA0002");
      s.saveCentroid("Bedroom", [-50, -85], 10, 1715446780);
      s.saveCentroid("Kitchen", [-85, -50], 10, 1715446780);
      catId = s.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
      s.bindMac("AA:AA:AA:AA:AA:AA", catId!, "manual", 1715446789);
    });

    await orchestrator.start();

    const T0 = 1715446789;
    setClock(T0);

    // Feed readings from old MAC for 30 seconds — cat is in Bedroom
    for (let i = 0; i < 15; i++) {
      setClock(T0 + i * 2);
      const payload = JSON.stringify({ n: "node-AAAA0001", m: "AA:AA:AA:AA:AA:AA", r: -50, t: T0 + i * 2 });
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0001`, Buffer.from(payload));
      const payload2 = JSON.stringify({ n: "node-AAAA0002", m: "AA:AA:AA:AA:AA:AA", r: -85, t: T0 + i * 2 });
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0002`, Buffer.from(payload2));
    }

    // Old MAC stops (Tile rotated). New MAC starts in the same location (Bedroom).
    // Keep feeding readings until just before the sweep so they stay fresh.
    const T_ROTATE = T0 + 30;
    const T_SWEEP = T0 + 30 + 61;
    for (let t = T_ROTATE; t <= T_SWEEP; t += 2) {
      setClock(t);
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0001`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0001", m: "BB:BB:BB:BB:BB:BB", r: -50, t })));
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0002`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0002", m: "BB:BB:BB:BB:BB:BB", r: -85, t })));
    }

    setClock(T_SWEEP);

    // Trigger the staleness sweep manually
    orchestrator.sweepAndRebind();

    // The old MAC should have been marked silent
    const silentEvents = emittedEvents.filter(e => e.type === "silent");
    expect(silentEvents.length).toBeGreaterThanOrEqual(1);

    // The new MAC should have been auto-rebound to the same cat
    const catMac = store.findCatByMac("BB:BB:BB:BB:BB:BB");
    expect(catMac).toBe(catId!);

    orchestrator.stop();
  });

  it("rebinds two cats correctly when both MACs rotate simultaneously", async () => {
    let ollie: number, hope: number;
    const { store, orchestrator, emittedEvents, setClock } = buildOrchestratorWithClock((s) => {
      s.upsertNode("node-AAAA0001");
      s.upsertNode("node-AAAA0002");
      s.saveCentroid("Bedroom", [-50, -85], 10, 1715446780);
      s.saveCentroid("Kitchen", [-85, -50], 10, 1715446780);
      ollie = s.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
      hope = s.createCat({ name: "Hope", color_hex: "#ff6b6b" });
      s.bindMac("AA:AA:AA:AA:AA:AA", ollie!, "manual", 1715446789);
      s.bindMac("BB:BB:BB:BB:BB:BB", hope!, "manual", 1715446789);
    });

    await orchestrator.start();

    const T0 = 1715446789;

    // Ollie (AA) in Bedroom, Hope (BB) in Kitchen for 30 seconds
    for (let i = 0; i < 15; i++) {
      setClock(T0 + i * 2);
      // Ollie in Bedroom: strong on node1, weak on node2
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0001`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0001", m: "AA:AA:AA:AA:AA:AA", r: -50, t: T0 + i * 2 })));
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0002`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0002", m: "AA:AA:AA:AA:AA:AA", r: -85, t: T0 + i * 2 })));
      // Hope in Kitchen: weak on node1, strong on node2
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0001`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0001", m: "BB:BB:BB:BB:BB:BB", r: -85, t: T0 + i * 2 })));
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0002`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0002", m: "BB:BB:BB:BB:BB:BB", r: -50, t: T0 + i * 2 })));
    }

    // Both MACs rotate. New MACs appear in the same locations.
    // Keep feeding until just before sweep so readings stay fresh.
    const T_ROTATE = T0 + 30;
    const T_SWEEP = T0 + 30 + 61;
    for (let t = T_ROTATE; t <= T_SWEEP; t += 2) {
      setClock(t);
      // New Ollie MAC (CC) still in Bedroom
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0001`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0001", m: "CC:CC:CC:CC:CC:CC", r: -51, t })));
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0002`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0002", m: "CC:CC:CC:CC:CC:CC", r: -84, t })));
      // New Hope MAC (DD) still in Kitchen
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0001`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0001", m: "DD:DD:DD:DD:DD:DD", r: -84, t })));
      orchestrator.handleRawMessage(`${TOPIC_RAW_PREFIX}node-AAAA0002`,
        Buffer.from(JSON.stringify({ n: "node-AAAA0002", m: "DD:DD:DD:DD:DD:DD", r: -51, t })));
    }

    setClock(T_SWEEP);
    orchestrator.sweepAndRebind();

    // Verify correct rebinding
    expect(store.findCatByMac("CC:CC:CC:CC:CC:CC")).toBe(ollie!);
    expect(store.findCatByMac("DD:DD:DD:DD:DD:DD")).toBe(hope!);

    orchestrator.stop();
  });
});
