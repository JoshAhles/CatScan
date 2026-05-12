/**
 * Synthetic data used while the hardware is not yet provisioned.
 *
 * Every event produced here is shaped to satisfy `serverEventSchema` — the
 * exact same contract the live WebSocket frames are validated against. The
 * demo controller runs every event through that schema before feeding it to
 * `applyEvent`, so any drift in the real models will surface here first.
 *
 * Removing `VITE_DEMO_MODE` from `.env.local` makes the dashboard go fully
 * live — none of this code is referenced.
 */
import { floorPlanConfig } from "../floorPlan/config";
import type { CatState, NodeState, ServerEvent } from "../types/contracts";

const ROOM_NAMES = floorPlanConfig.rooms.map((r) => r.name);

export const DEMO_CATS = {
  ollie: { id: 1, name: "Ollie", color: "#ffcc4d" as const },
  hope: { id: 2, name: "Hope", color: "#fb7185" as const },
};

/** Realistic transition graph between tracked rooms (Corridor is implicit). */
const ROOM_NEIGHBORS: Record<string, string[]> = {
  "Living Room": ["Kitchen", "Master Bedroom", "Office", "Cat Room"],
  Kitchen: ["Living Room"],
  "Master Bedroom": ["Living Room", "Office", "Cat Room"],
  Office: ["Living Room", "Master Bedroom", "Cat Room"],
  "Cat Room": ["Living Room", "Master Bedroom", "Office"],
};

export function pickNextRoom(current: string, rand = Math.random): string {
  const options = ROOM_NEIGHBORS[current] ?? ROOM_NAMES;
  return options[Math.floor(rand() * options.length)]!;
}

/** Best-guess RSSI from each node to a cat in a given room. */
function rssiForCatAt(nodeId: string, room: string | null): number {
  const nodeRoomMap: Record<string, string> = {
    "node-00000001": "Kitchen",
    "node-00000002": "Living Room",
    "node-00000003": "Master Bedroom",
    "node-00000004": "Office",
    "node-00000005": "Cat Room",
    "node-00000006": "Hall",
  };
  const nodeRoom = nodeRoomMap[nodeId];
  if (!room || !nodeRoom) return -88;
  if (nodeRoom === room) return -55 - Math.floor(Math.random() * 6); // -55..-60
  const adj = ROOM_NEIGHBORS[room] ?? [];
  if (adj.includes(nodeRoom)) return -72 - Math.floor(Math.random() * 6);
  return -85 - Math.floor(Math.random() * 8);
}

/**
 * Snapshot event — same shape Orchestrator.buildSnapshot() returns:
 * `ts` in seconds, `cats` are the union of `visibleCat | silentCat`, `nodes`
 * carry `rssiByCatId` (empty initially, just like the real server's first
 * snapshot before any rssiUpdate events arrive), and `calibration` only
 * includes rooms that have a centroid recorded.
 */
export function buildSnapshotEvent(now = Math.floor(Date.now() / 1000)): ServerEvent {
  const ollieSince = now - 540;
  const hopeSince = now - 120;

  const cats: CatState[] = [
    {
      id: DEMO_CATS.ollie.id,
      name: DEMO_CATS.ollie.name,
      color: DEMO_CATS.ollie.color,
      room: "Living Room",
      since: ollieSince,
      silent: false,
      lastRoom: null,
      lastSeen: null,
      photoPath: null,
    },
    {
      id: DEMO_CATS.hope.id,
      name: DEMO_CATS.hope.name,
      color: DEMO_CATS.hope.color,
      room: "Cat Room",
      since: hopeSince,
      silent: false,
      lastRoom: null,
      lastSeen: null,
      photoPath: null,
    },
  ];

  const nodes: NodeState[] = floorPlanConfig.nodes.map((n, i) => {
    const roomName = i < 5 ? floorPlanConfig.rooms[i]!.name : null;
    return {
      id: n.id,
      roomName,
      status: "online" as const,
      // Real server's first snapshot ships with empty rssiByCatId — RSSI is
      // populated later via streaming rssiUpdate events.
      rssiByCatId: {},
    };
  });

  const calibration = Object.fromEntries(
    ROOM_NAMES.map((r) => [r, "calibrated" as const])
  );

  return { type: "snapshot", ts: now, cats, nodes, calibration };
}

/**
 * Chronologically-ordered seed events that establish realistic recent history.
 * Each event uses the same field names + units the real server emits, so the
 * activity log messages render via the live `applyEvent` formatters.
 */
export function buildSeedEvents(now = Math.floor(Date.now() / 1000)): ServerEvent[] {
  return [
    { type: "centroidSaved", room: "Living Room", sampleCount: 148, at: now - 1900 },
    { type: "centroidSaved", room: "Kitchen", sampleCount: 132, at: now - 1800 },
    { type: "centroidSaved", room: "Master Bedroom", sampleCount: 164, at: now - 1700 },
    { type: "nodeHealth", nodeId: "node-00000003", status: "online", since: now - 1620 },
    { type: "transition", catId: DEMO_CATS.ollie.id, from: "Kitchen", to: "Living Room", at: now - 1480 },
    { type: "transition", catId: DEMO_CATS.hope.id, from: "Master Bedroom", to: "Cat Room", at: now - 1380 },
    { type: "silent", catId: DEMO_CATS.hope.id, lastRoom: "Cat Room", lastSeen: now - 900 },
    { type: "unsilent", catId: DEMO_CATS.hope.id, room: "Cat Room", at: now - 720 },
    { type: "transition", catId: DEMO_CATS.ollie.id, from: "Master Bedroom", to: "Living Room", at: now - 540 },
    { type: "transition", catId: DEMO_CATS.hope.id, from: "Office", to: "Cat Room", at: now - 120 },
  ];
}

/** Single fake transition event for a given cat — used by the live simulator. */
export function makeTransitionEvent(catId: number, from: string, to: string): ServerEvent {
  return {
    type: "transition",
    catId,
    from,
    to,
    at: Math.floor(Date.now() / 1000),
  };
}

export function makeSilentEvent(catId: number, lastRoom: string): ServerEvent {
  return {
    type: "silent",
    catId,
    lastRoom,
    lastSeen: Math.floor(Date.now() / 1000),
  };
}

export function makeUnsilentEvent(catId: number, room: string): ServerEvent {
  return {
    type: "unsilent",
    catId,
    room,
    at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Periodic RSSI fluctuations. Matches the bound-mac variant of
 * `rssiUpdateSchema.values`: `{ nodeId, catId, rssi }`. (The unbound variant
 * with `mac` is what the real server emits before pairing — out of scope here
 * since the demo cats are always considered bound.)
 */
export function makeRssiUpdateEvent(cats: CatState[], nodes: NodeState[]): ServerEvent {
  const ts = Math.floor(Date.now() / 1000);
  const values: Array<{ nodeId: string; catId: number; rssi: number }> = [];
  for (const node of nodes) {
    for (const cat of cats) {
      if (cat.silent || !cat.room) continue;
      const base = rssiForCatAt(node.id, cat.room);
      const jitter = Math.floor((Math.random() - 0.5) * 6);
      values.push({ nodeId: node.id, catId: cat.id, rssi: base + jitter });
    }
  }
  return { type: "rssiUpdate", ts, values };
}
