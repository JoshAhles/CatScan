import { euclidean, hungarianN2 } from "../fingerprint/FingerprintMatcher";

interface ResolverConfig {
  confidenceRatio: number;   // 0.5 — winning pairing must be < this * alternative
  staleSentinelDbm: number;
  nodeIds: string[];
}

interface MacRolling {
  catId: number | null;
  source: "auto" | "manual" | "provisional" | null;
  // rolling readings: nodeId → last 60s of (rssi, ts)
  recent: Map<string, Array<{ rssi: number; ts: number }>>;
  departureFingerprint?: number[];
  departureTs?: number;
  firstSeenTs?: number;
}

const FP_WINDOW_MS = 60_000;

export type RebindResult =
  | { kind: "autoRebound"; pairings: Array<{ mac: string; catId: number }> }
  | { kind: "ambiguous"; candidates: Array<{ mac: string; fingerprint: number[] }> }
  | { kind: "noOp" };

export class IdentityResolver {
  private byMac = new Map<string, MacRolling>();

  constructor(private cfg: ResolverConfig) {}

  bind(mac: string, catId: number, source: "auto" | "manual" | "provisional") {
    const r = this.getOrInit(mac);
    r.catId = catId;
    r.source = source;
  }

  recordReading(mac: string, readings: Record<string, number>, ts: number) {
    const r = this.getOrInit(mac);
    if (r.firstSeenTs === undefined) r.firstSeenTs = ts;
    for (const [n, rssi] of Object.entries(readings)) {
      let arr = r.recent.get(n);
      if (!arr) { arr = []; r.recent.set(n, arr); }
      arr.push({ rssi, ts });
      // Trim
      const cutoff = ts - FP_WINDOW_MS;
      while (arr.length && arr[0]!.ts < cutoff) arr.shift();
    }
  }

  markSilent(mac: string, ts: number) {
    const r = this.byMac.get(mac);
    if (!r) return;
    r.departureFingerprint = this.fingerprint(r, ts);
    r.departureTs = ts;
  }

  private fingerprint(r: MacRolling, ts: number): number[] {
    const cutoff = ts - FP_WINDOW_MS;
    return this.cfg.nodeIds.map(n => {
      const arr = r.recent.get(n);
      if (!arr || !arr.length) return this.cfg.staleSentinelDbm;
      const fresh = arr.filter(x => x.ts >= cutoff);
      if (!fresh.length) return this.cfg.staleSentinelDbm;
      return fresh.reduce((s, x) => s + x.rssi, 0) / fresh.length;
    });
  }

  attemptRebind(newcomerMacs: string[], nowTs: number): RebindResult {
    const departed = [...this.byMac.entries()]
      .filter(([_, r]) => r.catId !== null && r.departureFingerprint)
      .map(([mac, r]) => ({ mac, catId: r.catId!, fp: r.departureFingerprint! }));
    if (!departed.length || !newcomerMacs.length) return { kind: "noOp" };

    const newcomers = newcomerMacs.map(m => {
      const r = this.byMac.get(m);
      return { mac: m, fp: r ? this.fingerprint(r, nowTs) : this.cfg.nodeIds.map(() => this.cfg.staleSentinelDbm) };
    });

    // Two-cat symmetric case
    if (departed.length === 2 && newcomers.length === 2) {
      const cost = [
        [euclidean(newcomers[0]!.fp, departed[0]!.fp), euclidean(newcomers[0]!.fp, departed[1]!.fp)],
        [euclidean(newcomers[1]!.fp, departed[0]!.fp), euclidean(newcomers[1]!.fp, departed[1]!.fp)],
      ];
      const winning = cost[0]![0]! + cost[1]![1]!;
      const alt = cost[0]![1]! + cost[1]![0]!;
      const [a, b] = winning <= alt ? [0, 1] : [1, 0];
      const bestSum = Math.min(winning, alt);
      const altSum = Math.max(winning, alt);
      if (bestSum < this.cfg.confidenceRatio * altSum) {
        return { kind: "autoRebound", pairings: [
          { mac: newcomers[0]!.mac, catId: departed[a]!.catId },
          { mac: newcomers[1]!.mac, catId: departed[b]!.catId },
        ]};
      }
      return { kind: "ambiguous", candidates: newcomers.map(n => ({ mac: n.mac, fingerprint: n.fp })) };
    }

    // Asymmetric: 1 newcomer, 2 departed (or vice versa) — pick the better single match
    if (newcomers.length === 1 && departed.length >= 1) {
      const n = newcomers[0]!;
      const sorted = departed.map(d => ({ ...d, dist: euclidean(n.fp, d.fp) })).sort((a, b) => a.dist - b.dist);
      const best = sorted[0]!;
      const second = sorted[1];
      if (!second || best.dist < this.cfg.confidenceRatio * second.dist) {
        return { kind: "autoRebound", pairings: [{ mac: n.mac, catId: best.catId }] };
      }
      return { kind: "ambiguous", candidates: [{ mac: n.mac, fingerprint: n.fp }] };
    }

    return { kind: "noOp" };
  }

  prune(activeMacs: Set<string>) {
    for (const mac of [...this.byMac.keys()]) {
      if (!activeMacs.has(mac)) this.byMac.delete(mac);
    }
  }

  private getOrInit(mac: string): MacRolling {
    let r = this.byMac.get(mac);
    if (!r) {
      r = { catId: null, source: null, recent: new Map() };
      this.byMac.set(mac, r);
    }
    return r;
  }
}
