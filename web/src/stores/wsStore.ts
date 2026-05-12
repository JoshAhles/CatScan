import { createStore } from "zustand/vanilla";
import { create } from "zustand";
import type { CatState, NodeState, CalibrationMap, ServerEvent } from "../types/contracts";

export type ActivityTone = "accent" | "dim" | "warn" | "danger";

export interface ActivityEntry {
  id: number;
  ts: number;
  /** Two-char glyph icon — terminal feel. */
  icon: string;
  message: string;
  tone: ActivityTone;
}

export interface WsState {
  cats: CatState[];
  nodes: NodeState[];
  calibration: CalibrationMap;
  events: ActivityEntry[];
  applyEvent: (ev: ServerEvent) => void;
}

const MAX_EVENTS = 100;
let nextEventId = 1;

function buildApplyEvent(
  set: (partial: Partial<WsState> | ((s: WsState) => Partial<WsState>)) => void,
  get: () => WsState,
) {
  function logActivity(entry: Omit<ActivityEntry, "id">) {
    const e: ActivityEntry = { id: nextEventId++, ...entry };
    set((s) => ({ events: [e, ...s.events].slice(0, MAX_EVENTS) }));
  }

  function catName(catId: number): string {
    return get().cats.find((c) => c.id === catId)?.name.toUpperCase() ?? `CAT#${catId}`;
  }
  function nodeLabel(nodeId: string): string {
    const n = get().nodes.find((x) => x.id === nodeId);
    return n?.roomName ? `${n.roomName}` : nodeId;
  }

  return (ev: ServerEvent) => {
    switch (ev.type) {
      case "snapshot":
        set({ cats: ev.cats, nodes: ev.nodes, calibration: ev.calibration });
        break;
      case "transition":
        logActivity({
          ts: ev.at,
          icon: "→",
          message: `${catName(ev.catId)} ${ev.from.toUpperCase()} → ${ev.to.toUpperCase()}`,
          tone: "accent",
        });
        set({
          cats: get().cats.map((c) =>
            c.id === ev.catId
              ? { ...c, room: ev.to, since: ev.at, silent: false, lastRoom: null, lastSeen: null }
              : c
          ),
        });
        break;
      case "silent":
        logActivity({
          ts: ev.lastSeen,
          icon: "○",
          message: `${catName(ev.catId)} SILENT · last seen ${ev.lastRoom.toUpperCase()}`,
          tone: "dim",
        });
        set({
          cats: get().cats.map((c) =>
            c.id === ev.catId
              ? { ...c, silent: true, room: null, since: null, lastRoom: ev.lastRoom, lastSeen: ev.lastSeen }
              : c
          ),
        });
        break;
      case "unsilent":
        logActivity({
          ts: ev.at,
          icon: "●",
          message: `${catName(ev.catId)} DETECTED · ${ev.room.toUpperCase()}`,
          tone: "accent",
        });
        set({
          cats: get().cats.map((c) =>
            c.id === ev.catId
              ? { ...c, silent: false, room: ev.room, since: ev.at, lastRoom: null, lastSeen: null }
              : c
          ),
        });
        break;
      case "nodeHealth":
        logActivity({
          ts: ev.since,
          icon: ev.status === "online" ? "▲" : "▼",
          message: `${nodeLabel(ev.nodeId).toUpperCase()} ${ev.status.toUpperCase()}`,
          tone: ev.status === "online" ? "accent" : "danger",
        });
        set({
          nodes: get().nodes.map((n) =>
            n.id === ev.nodeId ? { ...n, status: ev.status } : n
          ),
        });
        break;
      case "nodeDiscovered":
        logActivity({
          ts: ev.at,
          icon: "+",
          message: `NEW NODE DISCOVERED · ${ev.nodeId}`,
          tone: "warn",
        });
        if (!get().nodes.find((n) => n.id === ev.nodeId)) {
          set({
            nodes: [...get().nodes, { id: ev.nodeId, roomName: null, status: "discovered", rssiByCatId: {} }],
          });
        }
        break;
      case "rssiUpdate":
        set({
          nodes: get().nodes.map((n) => {
            const updates = ev.values.filter((v) => v.nodeId === n.id && v.catId !== null);
            if (updates.length === 0) return n;
            const newRssi = { ...n.rssiByCatId };
            for (const u of updates) {
              if (u.catId !== null) {
                newRssi[String(u.catId)] = u.rssi;
              }
            }
            return { ...n, rssiByCatId: newRssi };
          }),
        });
        break;
      case "centroidSaved":
        logActivity({
          ts: ev.at,
          icon: "✓",
          message: `CALIBRATED · ${ev.room.toUpperCase()} (${ev.sampleCount} samples)`,
          tone: "accent",
        });
        break;
      case "identityAmbiguous":
        logActivity({
          ts: ev.at,
          icon: "?",
          message: `IDENTITY AMBIGUOUS · resolve in SETUP`,
          tone: "warn",
        });
        break;
      case "error":
        logActivity({
          ts: ev.at,
          icon: "!",
          message: `${ev.code}: ${ev.message}`,
          tone: "danger",
        });
        break;
      case "calibrationProgress":
        // High-frequency — don't log
        break;
    }
  };
}

export function createWsStore() {
  return createStore<WsState>((set, get) => ({
    cats: [],
    nodes: [],
    calibration: {},
    events: [],
    applyEvent: buildApplyEvent(set as never, get as never),
  }));
}

export const useWsStore = create<WsState>((set, get) => ({
  cats: [],
  nodes: [],
  calibration: {},
  events: [],
  applyEvent: buildApplyEvent(set as never, get as never),
}));
