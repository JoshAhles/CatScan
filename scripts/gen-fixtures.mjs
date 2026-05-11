#!/usr/bin/env node
/**
 * Generates deterministic MQTT JSONL fixtures for 7 E2E scenarios.
 * Run: node scripts/gen-fixtures.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "../server/fixtures");

mkdirSync(FIXTURES_DIR, { recursive: true });

const BASE_TS = 1715446789000; // ms
const NODE1 = "node-A1B2C3D4";
const NODE2 = "node-B1B2C3D4";
const NODE3 = "node-C1B2C3D4";
const MAC1 = "AA:BB:CC:DD:EE:01";
const MAC2 = "AA:BB:CC:DD:EE:02";

function msg(nodeId, mac, rssi, ts) {
  return JSON.stringify({
    topic: `catscan/raw/${nodeId}`,
    payload: JSON.stringify({ n: nodeId, m: mac, r: rssi, t: Math.floor(ts / 1000) }),
    ts,
  });
}

function writeFixture(name, lines) {
  writeFileSync(join(FIXTURES_DIR, `${name}.mqtt.jsonl`), lines.join("\n") + "\n");
  console.log(`Written: ${name}.mqtt.jsonl (${lines.length} lines)`);
}

// ---
// scenario-steady: One cat sitting still in Bedroom (node1 strong, others weak)
// ---
{
  const lines = [];
  for (let i = 0; i < 20; i++) {
    lines.push(msg(NODE1, MAC1, -60, BASE_TS + i * 1000));
    lines.push(msg(NODE2, MAC1, -95, BASE_TS + i * 1000 + 100));
  }
  writeFixture("scenario-steady", lines);
}

// ---
// scenario-transition: Cat moves from Bedroom to Office after 10 readings
// ---
{
  const lines = [];
  // Phase 1: Bedroom (node1 strong)
  for (let i = 0; i < 10; i++) {
    lines.push(msg(NODE1, MAC1, -60, BASE_TS + i * 1000));
    lines.push(msg(NODE2, MAC1, -95, BASE_TS + i * 1000 + 100));
  }
  // Phase 2: Office (node2 strong)
  for (let i = 10; i < 20; i++) {
    lines.push(msg(NODE1, MAC1, -95, BASE_TS + i * 1000));
    lines.push(msg(NODE2, MAC1, -60, BASE_TS + i * 1000 + 100));
  }
  writeFixture("scenario-transition", lines);
}

// ---
// scenario-silence: Cat disappears after some readings (no messages for >120s)
// ---
{
  const lines = [];
  for (let i = 0; i < 5; i++) {
    lines.push(msg(NODE1, MAC1, -60, BASE_TS + i * 1000));
  }
  // Big gap — then one ping much later (>120s later)
  lines.push(msg(NODE1, MAC1, -60, BASE_TS + 130_000));
  writeFixture("scenario-silence", lines);
}

// ---
// scenario-rotation-clean: Two cats, MACs rotate cleanly — resolver auto-rebinds
// (Fingerprints are distinct, so Hungarian matching succeeds with confidence)
// ---
{
  const lines = [];
  const T = BASE_TS;
  // Phase 1: MAC1 → Bedroom (node1), MAC2 → Office (node2), both active
  for (let i = 0; i < 15; i++) {
    lines.push(msg(NODE1, MAC1, -60, T + i * 1000));
    lines.push(msg(NODE2, MAC1, -95, T + i * 1000 + 50));
    lines.push(msg(NODE1, MAC2, -95, T + i * 1000 + 100));
    lines.push(msg(NODE2, MAC2, -60, T + i * 1000 + 150));
  }
  // Gap (rotation) — then new MACs appear with same fingerprints
  const MAC1_NEW = "AA:BB:CC:DD:EE:11";
  const MAC2_NEW = "AA:BB:CC:DD:EE:22";
  const T2 = T + 300_000; // 5 min later
  for (let i = 0; i < 10; i++) {
    lines.push(msg(NODE1, MAC1_NEW, -61, T2 + i * 1000));
    lines.push(msg(NODE2, MAC1_NEW, -94, T2 + i * 1000 + 50));
    lines.push(msg(NODE1, MAC2_NEW, -94, T2 + i * 1000 + 100));
    lines.push(msg(NODE2, MAC2_NEW, -61, T2 + i * 1000 + 150));
  }
  writeFixture("scenario-rotation-clean", lines);
}

// ---
// scenario-rotation-huddled: Two cats close together (similar fingerprints → ambiguous)
// ---
{
  const lines = [];
  const T = BASE_TS;
  // Both cats in same room — very similar readings
  for (let i = 0; i < 15; i++) {
    lines.push(msg(NODE1, MAC1, -62, T + i * 1000));
    lines.push(msg(NODE2, MAC1, -63, T + i * 1000 + 50));
    lines.push(msg(NODE1, MAC2, -63, T + i * 1000 + 100));
    lines.push(msg(NODE2, MAC2, -62, T + i * 1000 + 150));
  }
  // Gap, then new MACs with same blurry fingerprints
  const MAC1_NEW = "AA:BB:CC:DD:EE:33";
  const MAC2_NEW = "AA:BB:CC:DD:EE:44";
  const T2 = T + 300_000;
  for (let i = 0; i < 10; i++) {
    lines.push(msg(NODE1, MAC1_NEW, -63, T2 + i * 1000));
    lines.push(msg(NODE2, MAC1_NEW, -62, T2 + i * 1000 + 50));
    lines.push(msg(NODE1, MAC2_NEW, -62, T2 + i * 1000 + 100));
    lines.push(msg(NODE2, MAC2_NEW, -63, T2 + i * 1000 + 150));
  }
  writeFixture("scenario-rotation-huddled", lines);
}

// ---
// scenario-rotation-staggered: One cat disappears, new MAC appears 30s later
// ---
{
  const lines = [];
  const T = BASE_TS;
  // CAT1 active
  for (let i = 0; i < 10; i++) {
    lines.push(msg(NODE1, MAC1, -60, T + i * 1000));
    lines.push(msg(NODE2, MAC1, -95, T + i * 1000 + 50));
  }
  // MAC1 goes silent — 30s gap
  const MAC1_NEW = "AA:BB:CC:DD:EE:55";
  const T2 = T + 40_000;
  for (let i = 0; i < 10; i++) {
    lines.push(msg(NODE1, MAC1_NEW, -61, T2 + i * 1000));
    lines.push(msg(NODE2, MAC1_NEW, -94, T2 + i * 1000 + 50));
  }
  writeFixture("scenario-rotation-staggered", lines);
}

// ---
// scenario-node-flap: Node goes offline and comes back (readings stop then resume)
// ---
{
  const lines = [];
  const T = BASE_TS;
  // Normal readings from both nodes
  for (let i = 0; i < 10; i++) {
    lines.push(msg(NODE1, MAC1, -60, T + i * 1000));
    lines.push(msg(NODE2, MAC1, -85, T + i * 1000 + 50));
  }
  // NODE2 goes offline — only NODE1 reports for 20 readings
  for (let i = 10; i < 30; i++) {
    lines.push(msg(NODE1, MAC1, -60, T + i * 1000));
  }
  // NODE2 comes back
  for (let i = 30; i < 40; i++) {
    lines.push(msg(NODE1, MAC1, -60, T + i * 1000));
    lines.push(msg(NODE2, MAC1, -85, T + i * 1000 + 50));
  }
  writeFixture("scenario-node-flap", lines);
}

console.log("All fixtures written.");
