import { createStore } from "zustand/vanilla";
import type { CatState, NodeState, CalibrationMap, ServerEvent } from "../types/contracts";

export interface WsState {
  cats: CatState[];
  nodes: NodeState[];
  calibration: CalibrationMap;
  applyEvent: (ev: ServerEvent) => void;
}

export function createWsStore() {
  return createStore<WsState>((set, get) => ({
    cats: [],
    nodes: [],
    calibration: {},
    applyEvent(ev: ServerEvent) {
      switch (ev.type) {
        case "snapshot":
          set({ cats: ev.cats, nodes: ev.nodes, calibration: ev.calibration });
          break;
        case "transition":
          set({
            cats: get().cats.map((c) =>
              c.id === ev.catId
                ? { ...c, room: ev.to, since: ev.at, silent: false, lastRoom: null, lastSeen: null }
                : c
            ),
          });
          break;
        case "silent":
          set({
            cats: get().cats.map((c) =>
              c.id === ev.catId
                ? { ...c, silent: true, room: null, since: null, lastRoom: ev.lastRoom, lastSeen: ev.lastSeen }
                : c
            ),
          });
          break;
        case "unsilent":
          set({
            cats: get().cats.map((c) =>
              c.id === ev.catId
                ? { ...c, silent: false, room: ev.room, since: ev.at, lastRoom: null, lastSeen: null }
                : c
            ),
          });
          break;
        case "nodeHealth":
          set({
            nodes: get().nodes.map((n) =>
              n.id === ev.nodeId ? { ...n, status: ev.status } : n
            ),
          });
          break;
        case "nodeDiscovered":
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
        case "calibrationProgress":
        case "centroidSaved":
        case "identityAmbiguous":
        case "error":
          // Handled by UI listeners, not stored in this slice
          break;
      }
    },
  }));
}

// Shared singleton for the app
import { create } from "zustand";

export const useWsStore = create<WsState>((set, get) => ({
  cats: [],
  nodes: [],
  calibration: {},
  applyEvent(ev: ServerEvent) {
    switch (ev.type) {
      case "snapshot":
        set({ cats: ev.cats, nodes: ev.nodes, calibration: ev.calibration });
        break;
      case "transition":
        set({
          cats: get().cats.map((c) =>
            c.id === ev.catId
              ? { ...c, room: ev.to, since: ev.at, silent: false, lastRoom: null, lastSeen: null }
              : c
          ),
        });
        break;
      case "silent":
        set({
          cats: get().cats.map((c) =>
            c.id === ev.catId
              ? { ...c, silent: true, room: null, since: null, lastRoom: ev.lastRoom, lastSeen: ev.lastSeen }
              : c
          ),
        });
        break;
      case "unsilent":
        set({
          cats: get().cats.map((c) =>
            c.id === ev.catId
              ? { ...c, silent: false, room: ev.room, since: ev.at, lastRoom: null, lastSeen: null }
              : c
          ),
        });
        break;
      case "nodeHealth":
        set({
          nodes: get().nodes.map((n) =>
            n.id === ev.nodeId ? { ...n, status: ev.status } : n
          ),
        });
        break;
      case "nodeDiscovered":
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
      case "calibrationProgress":
      case "centroidSaved":
      case "identityAmbiguous":
      case "error":
        break;
    }
  },
}));
