import { z } from "zod";

const colorHex = z.string().regex(/^#[0-9a-f]{6}$/i);
const roomName = z.string().min(1).max(50);
const mac = z.string().regex(/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/);
const catId = z.number().int().positive();

export const patchNodeBodySchema = z.object({ roomName });
export type PatchNodeBody = z.infer<typeof patchNodeBodySchema>;

export const postCatBodySchema = z.object({
  name: z.string().min(1).max(40),
  colorHex,
  photoPath: z.string().optional(),
});
export type PostCatBody = z.infer<typeof postCatBodySchema>;

export const patchCatBodySchema = z.object({
  name: z.string().min(1).max(40).optional(),
  colorHex: colorHex.optional(),
  photoPath: z.string().optional(),
}).refine(o => Object.keys(o).length > 0, { message: "at least one field required" });
export type PatchCatBody = z.infer<typeof patchCatBodySchema>;

export const postCalibrationStartBodySchema = z.object({ room: roomName, catId: z.number().int().positive().optional() });
export type PostCalibrationStartBody = z.infer<typeof postCalibrationStartBodySchema>;

export const postIdentityResolveBodySchema = z.object({ provisionalMac: mac, catId });
export type PostIdentityResolveBody = z.infer<typeof postIdentityResolveBodySchema>;

export const patchConfigBodySchema = z.object({
  alpha: z.number().min(0).max(1).optional(),
  nodeStaleSeconds: z.number().int().positive().optional(),
  staleSentinelDbm: z.number().int().max(0).optional(),
  silentSeconds: z.number().int().positive().optional(),
  hysteresisDbm: z.number().nonnegative().optional(),
  hysteresisTicks: z.number().int().positive().optional(),
  tickIntervalMs: z.number().int().positive().optional(),
  rotationConfidenceRatio: z.number().min(0).max(1).optional(),
}).refine(o => Object.keys(o).length > 0, { message: "at least one field required" });
export type PatchConfigBody = z.infer<typeof patchConfigBodySchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  uptimeSeconds: z.number().nonnegative(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
