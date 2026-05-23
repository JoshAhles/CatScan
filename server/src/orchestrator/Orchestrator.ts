import { MqttClient } from "mqtt";
import { EventStore } from "../store/EventStore";
import { WsServer } from "../ws/WsServer";
import { Ingestor } from "../ingest/Ingestor";
import { EmaSmoother } from "../smoother/EmaSmoother";
import { RoomDecider } from "../decider/RoomDecider";
import { IdentityResolver } from "../identity/IdentityResolver";
import { CalibrationController } from "../calibration/CalibrationController";
import { PairingWindowController } from "../pairing/PairingWindowController";
import {
  TOPIC_RAW_PATTERN,
  TOPIC_RAW_PREFIX,
  TOPIC_HEALTH_PATTERN,
  TOPIC_HEALTH_PREFIX,
  parseHealthPayload,
} from "../contracts/mqtt";
import type { ServerEvent, Snapshot } from "../contracts/ws";

export interface OrchestratorConfig {
  store: EventStore;
  ws: WsServer;
  mqttClient?: MqttClient;
  // Allow overriding defaults for testing
  alpha?: number;
  hysteresisDbm?: number;
  hysteresisTicks?: number;
  silentSeconds?: number;
  nodeStaleSeconds?: number;
  staleSentinelDbm?: number;
  rotationConfidenceRatio?: number;
  minCalibrationSamples?: number;
  pairingWindowMs?: number;
  pairingMinRssi?: number;
  /** How often to broadcast a snapshot of smoothed per-node RSSI values to
   *  WS clients. Set to 0 to disable (useful in tests). Default 5_000ms. */
  rssiBroadcastIntervalMs?: number;
  /** Override "now" function for deterministic testing */
  nowSec?: () => number;
}

export class Orchestrator {
  private store: EventStore;
  private ws: WsServer;
  private mqttClient: MqttClient | null;
  private ingestor: Ingestor;
  private smoothers = new Map<string, EmaSmoother>(); // key = `${mac}|${nodeId}`
  private decider: RoomDecider;
  private resolver: IdentityResolver;
  private calibrationController: CalibrationController;
  private pairingController: PairingWindowController;
  private nodeIds: string[] = [];
  private startedAt: number;
  private rssiTimer: ReturnType<typeof setInterval> | null = null;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private readonly cfg: Required<Omit<OrchestratorConfig, "store" | "ws" | "mqttClient">>;

  constructor(options: OrchestratorConfig) {
    this.store = options.store;
    this.ws = options.ws;
    this.mqttClient = options.mqttClient ?? null;
    this.startedAt = Date.now();

    this.cfg = {
      alpha: options.alpha ?? 0.2,
      hysteresisDbm: options.hysteresisDbm ?? 5,
      hysteresisTicks: options.hysteresisTicks ?? 3,
      silentSeconds: options.silentSeconds ?? 120,
      nodeStaleSeconds: options.nodeStaleSeconds ?? 30,
      staleSentinelDbm: options.staleSentinelDbm ?? -100,
      rotationConfidenceRatio: options.rotationConfidenceRatio ?? 0.5,
      minCalibrationSamples: options.minCalibrationSamples ?? 10,
      pairingWindowMs: options.pairingWindowMs ?? 60_000,
      pairingMinRssi: options.pairingMinRssi ?? -50,
      rssiBroadcastIntervalMs: options.rssiBroadcastIntervalMs ?? 1_000,
      nowSec: options.nowSec ?? (() => Math.floor(Date.now() / 1000)),
    };

    // Load initial state from store
    const nodes = this.store.listNodes();
    this.nodeIds = nodes.map(n => n.id as string);
    const centroids = this.store.loadCentroids();

    this.decider = new RoomDecider({
      nodeIds: this.nodeIds,
      centroids,
      hysteresisDbm: this.cfg.hysteresisDbm,
      hysteresisTicks: this.cfg.hysteresisTicks,
      silentSeconds: this.cfg.silentSeconds,
      staleSentinelDbm: this.cfg.staleSentinelDbm,
    });

    this.resolver = new IdentityResolver({
      confidenceRatio: this.cfg.rotationConfidenceRatio,
      staleSentinelDbm: this.cfg.staleSentinelDbm,
      nodeIds: this.nodeIds,
    });

    this.calibrationController = new CalibrationController({
      store: this.store,
      nodeIds: this.nodeIds,
      sentinelDbm: this.cfg.staleSentinelDbm,
      minSamples: this.cfg.minCalibrationSamples,
    });

    this.pairingController = new PairingWindowController({
      windowMs: this.cfg.pairingWindowMs,
      minRssi: this.cfg.pairingMinRssi,
    });

    this.ingestor = new Ingestor({
      // `Required<RawReading>` guarantees `t` is set (Ingestor fills it from
       // nowSec() when the payload omits it).
       onReading: (r) => this.handleReading(r.n, r.m, r.r, (r.t ?? this.cfg.nowSec()) * 1000),
      onNodeDiscovered: (nodeId) => this.handleNodeDiscovered(nodeId),
      knownNodeId: (nodeId) => this.nodeIds.includes(nodeId),
      nowSec: this.cfg.nowSec,
    });

    // Provide snapshot to WS hub
    this.ws.setSnapshotProvider(() => this.buildSnapshot());
  }

  async start() {
    // Load bindings from store into resolver
    const cats = this.store.listCats();
    // (bindings are loaded lazily via findCatByMac as readings come in)
    void cats;

    // Subscribe to MQTT if client provided
    if (this.mqttClient) {
      this.mqttClient.subscribe(TOPIC_RAW_PATTERN);
      this.mqttClient.subscribe(TOPIC_HEALTH_PATTERN);
      this.mqttClient.on("message", (topic: string, payload: Buffer) => {
        if (topic.startsWith(TOPIC_RAW_PREFIX)) {
          this.ingestor.handleMessage(topic, payload);
        } else if (topic.startsWith(TOPIC_HEALTH_PREFIX)) {
          this.handleHealth(topic.slice(TOPIC_HEALTH_PREFIX.length), payload);
        }
      });
    }

    // Staleness sweep — detects devices that stopped advertising and triggers rebind
    this.sweepTimer = setInterval(() => this.sweepAndRebind(), 10_000);

    // Periodic rssiUpdate broadcaster so the UI's Telemetry panel reflects
    // fresh per-node RSSI values without waiting for a transition event.
    if (this.cfg.rssiBroadcastIntervalMs > 0) {
      this.rssiTimer = setInterval(
        () => this.broadcastRssi(),
        this.cfg.rssiBroadcastIntervalMs,
      );
    }
  }

  stop() {
    if (this.rssiTimer) {
      clearInterval(this.rssiTimer);
      this.rssiTimer = null;
    }
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    if (this.mqttClient) {
      this.mqttClient.unsubscribe(TOPIC_RAW_PATTERN);
    }
  }

  /**
   * Walk every smoother, group fresh values by MAC, and broadcast one
   * rssiUpdate event carrying the latest readings the server has. Bound MACs
   * are emitted with their resolved catId; unbound MACs use the `mac`
   * variant of the union so the UI can still show provisional bars.
   */
  private broadcastRssi() {
    const nowMs = this.cfg.nowSec() * 1000;
    type Bound = { nodeId: `node-${string}`; catId: number; rssi: number };
    type Unbound = { nodeId: `node-${string}`; catId: null; mac: string; rssi: number };
    const macToReadings = new Map<string, Array<{ nodeId: string; rssi: number }>>();
    for (const [key, smoother] of this.smoothers) {
      if (!smoother.isFresh(nowMs, this.cfg.nodeStaleSeconds)) continue;
      const v = smoother.value();
      if (v === null) continue;
      const [mac, nodeId] = key.split("|");
      if (!mac || !nodeId) continue;
      const arr = macToReadings.get(mac) ?? [];
      arr.push({ nodeId, rssi: Math.round(v) });
      macToReadings.set(mac, arr);
    }
    if (macToReadings.size === 0) return;

    const values: Array<Bound | Unbound> = [];
    for (const [mac, readings] of macToReadings) {
      const catId = this.store.findCatByMac(mac);
      for (const { nodeId, rssi } of readings) {
        if (catId !== null) {
          values.push({ nodeId: nodeId as `node-${string}`, catId, rssi });
        } else {
          values.push({ nodeId: nodeId as `node-${string}`, catId: null, mac, rssi });
        }
      }
    }
    if (values.length === 0) return;

    const event: ServerEvent = {
      type: "rssiUpdate",
      ts: this.cfg.nowSec(),
      values,
    };
    this.ws.broadcast(event);
  }

  /** Direct message injection for testing */
  handleRawMessage(topic: string, payload: Buffer) {
    this.ingestor.handleMessage(topic, payload);
  }

  /** Direct health-message injection for testing */
  handleHealthMessage(topic: string, payload: Buffer) {
    if (!topic.startsWith(TOPIC_HEALTH_PREFIX)) return;
    this.handleHealth(topic.slice(TOPIC_HEALTH_PREFIX.length), payload);
  }

  getCalibrationController(): CalibrationController {
    return this.calibrationController;
  }

  stopCalibration(): { room: string; samples: number; saved: boolean } | null {
    if (!this.calibrationController.isActive()) return null;
    const result = this.calibrationController.stop();
    if (!result) return null;
    if (result.centroid) {
      const savedEvent: ServerEvent = {
        type: "centroidSaved",
        room: result.room as string & { length: number },
        sampleCount: result.samples,
        at: this.cfg.nowSec(),
      };
      this.ws.broadcast(savedEvent);
      const centroids = this.store.loadCentroids();
      this.decider = new RoomDecider({
        nodeIds: this.nodeIds,
        centroids,
        hysteresisDbm: this.cfg.hysteresisDbm,
        hysteresisTicks: this.cfg.hysteresisTicks,
        silentSeconds: this.cfg.silentSeconds,
        staleSentinelDbm: this.cfg.staleSentinelDbm,
      });
    }
    return { room: result.room, samples: result.samples, saved: result.centroid !== null };
  }


  getPairingController(): PairingWindowController {
    return this.pairingController;
  }

  private handleHealth(nodeId: string, payload: Buffer) {
    const status = parseHealthPayload(payload.toString("utf8"));
    if (!status) return;
    if (!/^node-[0-9A-F]{8}$/.test(nodeId)) return;
    this.store.recordNodeHealth(nodeId, status, this.cfg.nowSec());
    if (!this.nodeIds.includes(nodeId)) this.nodeIds.push(nodeId);
    this.ws.broadcast({
      type: "nodeHealth",
      nodeId: nodeId as `node-${string}`,
      status,
      since: this.cfg.nowSec(),
    } as ServerEvent);
  }

  private handleNodeDiscovered(nodeId: string) {
    this.store.upsertNode(nodeId);
    if (!this.nodeIds.includes(nodeId)) {
      this.nodeIds.push(nodeId);
    }
    const event: ServerEvent = {
      type: "nodeDiscovered",
      nodeId: nodeId as `node-${string}`,
      at: this.cfg.nowSec(),
    };
    this.ws.broadcast(event);
  }

  private handleReading(nodeId: string, mac: string, rssi: number, tsMs: number) {
    // Update smoother
    const key = `${mac}|${nodeId}`;
    let smoother = this.smoothers.get(key);
    if (!smoother) {
      smoother = new EmaSmoother(this.cfg.alpha);
      this.smoothers.set(key, smoother);
    }
    smoother.update(rssi, tsMs);

    // Build smoothed vector for this mac
    const smoothedReadings: Record<string, number> = {};
    for (const nid of this.nodeIds) {
      const k = `${mac}|${nid}`;
      const s = this.smoothers.get(k);
      if (s && s.isFresh(tsMs, this.cfg.nodeStaleSeconds)) {
        smoothedReadings[nid] = s.value()!;
      }
    }

    // Check pairing window
    const pairResult = this.pairingController.consider(mac, rssi);
    if (pairResult.resolved) {
      const ts = Math.floor(tsMs / 1000);
      this.store.bindMac(mac, pairResult.catId, "auto", ts);
      this.resolver.bind(mac, pairResult.catId, "auto");
    }

    // Calibration — feed reading if active, broadcast progress (no auto-stop)
    if (this.calibrationController.isActive()) {
      this.calibrationController.addReading(smoothedReadings);
      const progress = this.calibrationController.progress();
      if (progress) {
        const calibEvent: ServerEvent = {
          type: "calibrationProgress",
          room: progress.room as string & { length: number },
          samples: progress.samples,
          target: progress.target,
        };
        this.ws.broadcast(calibEvent);
      }
    }

    // Always record in the resolver so unbound MACs build fingerprints for rebinding
    this.resolver.recordReading(mac, smoothedReadings, tsMs);

    // Room decision — only for MACs bound to a cat
    const catId = this.store.findCatByMac(mac);
    if (catId === null) return;

    // Ensure the resolver knows about this binding (store is authoritative)
    this.resolver.bind(mac, catId, "manual");

    const decision = this.decider.tick(mac, smoothedReadings, tsMs);
    const ts = Math.floor(tsMs / 1000);

    if (decision.kind === "placed") {
      this.store.openRoomState(catId, decision.room, ts);
      const snap = this.buildSnapshot();
      this.ws.broadcast(snap);
    } else if (decision.kind === "transitioned") {
      this.store.closeAndOpenRoomState(catId, decision.from, decision.room, ts);
      const event: ServerEvent = {
        type: "transition",
        catId,
        from: decision.from,
        to: decision.room,
        at: ts,
      };
      this.ws.broadcast(event);
    } else if (decision.kind === "silent") {
      this.resolver.markSilent(mac, tsMs);
      this.store.closeAndOpenRoomState(catId, decision.lastRoom, null, ts);
      const event: ServerEvent = {
        type: "silent",
        catId,
        lastRoom: decision.lastRoom,
        lastSeen: ts,
      };
      this.ws.broadcast(event);
    }
    // noChange: no event emitted
  }

  sweepAndRebind() {
    const nowMs = this.cfg.nowSec() * 1000;
    const ts = this.cfg.nowSec();
    const ORPHAN_STALE_MS = 15_000;

    // Phase 1: detect MACs that the decider was tracking but stopped advertising
    const gone = this.decider.sweepSilent(nowMs);
    if (gone.length > 0) console.log(`[sweep] silent: ${gone.map(g => g.mac).join(", ")}`);
    for (const { mac, lastRoom } of gone) {
      const catId = this.store.findCatByMac(mac);
      this.resolver.markSilent(mac, nowMs);
      if (catId !== null) {
        this.store.closeAndOpenRoomState(catId, lastRoom, null, ts);
        this.ws.broadcast({ type: "silent", catId, lastRoom, lastSeen: ts } as ServerEvent);
      }
    }

    // Phase 2: find cats whose bound MAC has no fresh readings (orphaned)
    const cats = this.store.listCats();
    const orphanedCats: Array<{ catId: number; oldMac: string }> = [];
    for (const cat of cats) {
      const mac = this.store.findMacByCat(cat.id as number);
      if (!mac) continue;
      const hasFresh = [...this.smoothers.entries()].some(
        ([key, s]) => key.startsWith(mac + "|") && s.isFresh(nowMs, ORPHAN_STALE_MS / 1000)
      );
      if (!hasFresh) orphanedCats.push({ catId: cat.id as number, oldMac: mac });
    }

    // Phase 3: collect unbound FEED MACs with fresh readings
    const unboundMacs: string[] = [];
    const seenMacs = new Set<string>();
    for (const key of this.smoothers.keys()) {
      const mac = key.split("|")[0]!;
      if (seenMacs.has(mac)) continue;
      seenMacs.add(mac);
      if (this.store.findCatByMac(mac) === null) {
        const smoother = this.smoothers.get(key);
        if (smoother && smoother.isFresh(nowMs, this.cfg.nodeStaleSeconds)) {
          unboundMacs.push(mac);
        }
      }
    }

    if (unboundMacs.length === 0) return;
    if (gone.length === 0 && orphanedCats.length === 0) return;

    // Phase 4: rebind
    // Simple 1:1 — one orphan, one newcomer → direct rebind (instant)
    if (orphanedCats.length === 1 && unboundMacs.length === 1) {
      const { catId } = orphanedCats[0]!;
      const mac = unboundMacs[0]!;
      console.log(`[sweep] rebind: cat ${catId} → ${mac}`);
      this.store.bindMac(mac, catId, "auto", ts);
      this.resolver.bind(mac, catId, "auto");
      return;
    }

    // 2:2 with fingerprints — both cats rotated, use RSSI matching
    if (gone.length > 0 && unboundMacs.length > 0) {
      const result = this.resolver.attemptRebind(unboundMacs, nowMs);
      console.log(`[sweep] attemptRebind: ${result.kind}`);
      if (result.kind === "autoRebound") {
        for (const { mac, catId } of result.pairings) {
          this.store.bindMac(mac, catId, "auto", ts);
          this.resolver.bind(mac, catId, "auto");
        }
        return;
      }
    }

    // N:N ambiguous — multiple orphans + multiple newcomers, can't resolve
    if (orphanedCats.length > 0 && unboundMacs.length > 0) {
      // If both in same room (identical fingerprints), just assign sequentially
      if (orphanedCats.length === unboundMacs.length) {
        console.log(`[sweep] blind rebind: ${orphanedCats.length} orphans → ${unboundMacs.length} newcomers`);
        for (let i = 0; i < orphanedCats.length; i++) {
          this.store.bindMac(unboundMacs[i]!, orphanedCats[i]!.catId, "auto", ts);
          this.resolver.bind(unboundMacs[i]!, orphanedCats[i]!.catId, "auto");
        }
        return;
      }
      console.log(`[sweep] ambiguous: ${orphanedCats.length} orphans, ${unboundMacs.length} newcomers`);
      this.ws.broadcast({
        type: "identityAmbiguous",
        candidates: unboundMacs.map(mac => ({ mac, fingerprint: [] })),
        at: ts,
      } as ServerEvent);
    }
  }


  private buildSnapshot(): Snapshot {
    const cats = this.store.listCats();
    const nodes = this.store.listNodes();
    const centroids = this.store.loadCentroids();
    const ts = this.cfg.nowSec();

    const catStates = cats.map(c => {
      const currentState = this.store.currentRoomState(c.id as number);
      if (currentState && currentState.room) {
        return {
          id: c.id as number,
          name: c.name as string,
          color: c.color_hex as string,
          room: currentState.room as string,
          since: currentState.started_at as number,
          silent: false as const,
          lastRoom: null,
          lastSeen: null,
          photoPath: (c.photo_path ?? null) as string | null,
        };
      }
      return {
        id: c.id as number,
        name: c.name as string,
        color: c.color_hex as string,
        room: null,
        since: null,
        silent: true as const,
        lastRoom: currentState?.room ?? null,
        lastSeen: currentState?.started_at ?? null,
        photoPath: (c.photo_path ?? null) as string | null,
      };
    });

    // Pre-populate rssiByCatId from any fresh smoothers tied to bound MACs.
    // Without this, a freshly-connected client would see "—" on the Telemetry
    // bars until the next rssiUpdate broadcast tick — even though the server
    // already has authoritative values cached in the smoothers.
    const nowMs = ts * 1000;
    const rssiByNode = new Map<string, Record<string, number>>();
    for (const [key, smoother] of this.smoothers) {
      if (!smoother.isFresh(nowMs, this.cfg.nodeStaleSeconds)) continue;
      const v = smoother.value();
      if (v === null) continue;
      const [mac, nodeId] = key.split("|");
      if (!mac || !nodeId) continue;
      const catId = this.store.findCatByMac(mac);
      if (catId === null) continue;
      const map = rssiByNode.get(nodeId) ?? {};
      map[String(catId)] = Math.round(v);
      rssiByNode.set(nodeId, map);
    }

    const nodeStates = nodes.map(n => ({
      id: n.id as `node-${string}`,
      roomName: (n.room_name ?? null) as string | null,
      status: (n.status ?? "discovered") as "discovered" | "online" | "offline",
      rssiByCatId: rssiByNode.get(n.id as string) ?? {},
    }));

    const calibration: Record<string, "calibrated" | "uncalibrated"> = {};
    for (const room of Object.keys(centroids)) {
      calibration[room] = "calibrated";
    }

    return { type: "snapshot", ts, cats: catStates, nodes: nodeStates, calibration };
  }
}
