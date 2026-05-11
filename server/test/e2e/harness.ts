/**
 * E2E test harness — boots an in-process Orchestrator without a real MQTT broker,
 * feeds a JSONL fixture stream, captures emitted WS events.
 */
import Database from "better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "../../src/store/migrationRunner";
import { EventStore } from "../../src/store/EventStore";
import { WsServer, Hub } from "../../src/ws/WsServer";
import { Orchestrator } from "../../src/orchestrator/Orchestrator";
import type { ServerEvent } from "../../src/contracts/ws";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface MqttLine {
  topic: string;
  payload: string;
  ts: number;
}

export async function runScenario(
  fixtureJsonl: string,
  setup?: (store: EventStore) => void
): Promise<string> {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  const store = new EventStore(db);

  if (setup) setup(store);

  const emitted: ServerEvent[] = [];
  const hub = new Hub();
  hub.setSnapshotProvider(() => ({
    type: "snapshot",
    ts: 0,
    cats: [],
    nodes: [],
    calibration: {},
  }));

  const ws = new WsServer("TOKEN", hub);
  ws.broadcast = (event: ServerEvent) => {
    emitted.push(event);
  };

  const lines = fixtureJsonl.trim().split("\n").filter(Boolean);
  const parsed: MqttLine[] = lines.map(l => JSON.parse(l));

  // Use a mutable clock anchored to each message's timestamp
  // so the Ingestor's stale-check (|now - t| <= 5) always passes
  let currentTs = parsed.length > 0 ? Math.floor(parsed[0]!.ts / 1000) : Math.floor(Date.now() / 1000);

  const orchestrator = new Orchestrator({
    store,
    ws,
    nowSec: () => currentTs,
  });

  await orchestrator.start();

  for (const line of parsed) {
    currentTs = Math.floor(line.ts / 1000);
    orchestrator.handleRawMessage(line.topic, Buffer.from(line.payload));
  }

  orchestrator.stop();

  return emitted.map(e => JSON.stringify(e)).join("\n");
}
