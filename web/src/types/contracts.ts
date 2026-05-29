// Generated from server contracts; keep in sync.
import { z } from "zod";

const colorHex = z.string().regex(/^#[0-9a-f]{6}$/i);
const roomName = z.string().min(1).max(50);
const nodeId = z.string().regex(/^node-[0-9A-F]{8}$/);
const catId = z.number().int().positive();

const visibleCat = z.object({
  id: catId, name: z.string(), color: colorHex,
  room: roomName, since: z.number().int().positive(),
  silent: z.literal(false),
  lastRoom: z.null(), lastSeen: z.null(),
  photoPath: z.string().nullable(),
});

const silentCat = z.object({
  id: catId, name: z.string(), color: colorHex,
  room: z.null(), since: z.null(),
  silent: z.literal(true),
  lastRoom: roomName.nullable(), lastSeen: z.number().int().positive().nullable(),
  photoPath: z.string().nullable(),
});

const catState = z.union([visibleCat, silentCat]);

const nodeState = z.object({
  id: nodeId,
  roomName: roomName.nullable(),
  status: z.enum(["discovered", "online", "offline"]),
  rssiByCatId: z.record(z.string(), z.number().int()),
});

export const snapshotSchema = z.object({
  type: z.literal("snapshot"),
  ts: z.number().int().positive(),
  buildId: z.string().optional(),
  cats: z.array(catState),
  nodes: z.array(nodeState),
  calibration: z.record(roomName, z.enum(["calibrated", "uncalibrated"])),
});

export const transitionSchema = z.object({
  type: z.literal("transition"),
  catId, from: roomName, to: roomName, at: z.number().int().positive(),
});
export const silentEventSchema = z.object({
  type: z.literal("silent"),
  catId, lastRoom: roomName, lastSeen: z.number().int().positive(),
});
export const unsilentEventSchema = z.object({
  type: z.literal("unsilent"),
  catId, room: roomName, at: z.number().int().positive(),
});
export const nodeHealthSchema = z.object({
  type: z.literal("nodeHealth"),
  nodeId, status: z.enum(["online", "offline"]), since: z.number().int().positive(),
});
export const nodeDiscoveredSchema = z.object({
  type: z.literal("nodeDiscovered"), nodeId, at: z.number().int().positive(),
});
export const rssiUpdateSchema = z.object({
  type: z.literal("rssiUpdate"),
  ts: z.number().int().positive(),
  values: z.array(z.union([
    z.object({ nodeId, catId, rssi: z.number().int() }),
    z.object({ nodeId, catId: z.null(), mac: z.string(), rssi: z.number().int() }),
  ])),
});
export const calibrationProgressSchema = z.object({
  type: z.literal("calibrationProgress"),
  room: roomName, samples: z.number().int().nonnegative(), target: z.number().int().positive(),
});
export const centroidSavedSchema = z.object({
  type: z.literal("centroidSaved"),
  room: roomName, sampleCount: z.number().int().positive(), at: z.number().int().positive(),
});
export const identityAmbiguousSchema = z.object({
  type: z.literal("identityAmbiguous"),
  candidates: z.array(z.object({ mac: z.string(), fingerprint: z.array(z.number()) })),
  at: z.number().int().positive(),
});
export const errorEventSchema = z.object({
  type: z.literal("error"),
  code: z.string(), message: z.string(), at: z.number().int().positive(),
});

export const serverEventSchema = z.union([
  snapshotSchema,
  transitionSchema, silentEventSchema, unsilentEventSchema,
  nodeHealthSchema, nodeDiscoveredSchema, rssiUpdateSchema,
  calibrationProgressSchema, centroidSavedSchema,
  identityAmbiguousSchema, errorEventSchema,
]);

export type CatState = z.infer<typeof catState>;
export type NodeState = z.infer<typeof nodeState>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type ServerEvent = z.infer<typeof serverEventSchema>;
export type CalibrationMap = z.infer<typeof snapshotSchema>["calibration"];
