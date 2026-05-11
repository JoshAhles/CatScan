import { FingerprintMatcher } from "../fingerprint/FingerprintMatcher";
import { RoomDeciderConfig, RoomDecision } from "./types";

interface PerMacState {
  currentRoom: string | null;
  candidateRoom: string | null;
  candidateStreak: number;
  lastReadingTsMs: number;
  lastVector: Record<string, number>; // nodeId → latest rssi
  lastVectorAt: Record<string, number>; // nodeId → ts ms
}

export class RoomDecider {
  private matcher: FingerprintMatcher;
  private state = new Map<string, PerMacState>();

  constructor(private cfg: RoomDeciderConfig) {
    this.matcher = new FingerprintMatcher(cfg.centroids);
  }

  recordReading(mac: string, nodeId: string, rssi: number, tsMs: number) {
    const s = this.getOrInit(mac);
    s.lastVector[nodeId] = rssi;
    s.lastVectorAt[nodeId] = tsMs;
    s.lastReadingTsMs = tsMs;
  }

  tick(mac: string, readings: Record<string, number>, nowMs: number): RoomDecision {
    for (const [n, r] of Object.entries(readings)) this.recordReading(mac, n, r, nowMs);
    const s = this.getOrInit(mac);

    // Silence detection
    if (s.currentRoom !== null && (nowMs - s.lastReadingTsMs) > this.cfg.silentSeconds * 1000) {
      const last = s.currentRoom;
      s.currentRoom = null;
      return { kind: "silent", lastRoom: last };
    }

    // Build 6-vector with imputation
    const v = this.cfg.nodeIds.map(n => s.lastVector[n] ?? this.cfg.staleSentinelDbm);

    if (!s.currentRoom) {
      const best = this.matcher.nearestCentroid(v);
      if (!best) return { kind: "noChange", room: "(unknown)" };
      s.currentRoom = best.room;
      s.candidateRoom = null;
      s.candidateStreak = 0;
      return { kind: "placed", room: best.room };
    }

    const next = this.matcher.nearestWithMargin(v, s.currentRoom, this.cfg.hysteresisDbm);
    if (!next) {
      s.candidateRoom = null;
      s.candidateStreak = 0;
      return { kind: "noChange", room: s.currentRoom };
    }
    if (s.candidateRoom !== next.room) {
      s.candidateRoom = next.room;
      s.candidateStreak = 1;
      return { kind: "noChange", room: s.currentRoom };
    }
    s.candidateStreak++;
    if (s.candidateStreak >= this.cfg.hysteresisTicks) {
      const from = s.currentRoom;
      s.currentRoom = next.room;
      s.candidateRoom = null;
      s.candidateStreak = 0;
      return { kind: "transitioned", from, room: next.room };
    }
    return { kind: "noChange", room: s.currentRoom };
  }

  private getOrInit(mac: string): PerMacState {
    let s = this.state.get(mac);
    if (!s) {
      s = { currentRoom: null, candidateRoom: null, candidateStreak: 0,
            lastReadingTsMs: 0, lastVector: {}, lastVectorAt: {} };
      this.state.set(mac, s);
    }
    return s;
  }
}
