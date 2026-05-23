import { z } from "zod";

export const NODE_ID_REGEX = /^node-[0-9A-F]{8}$/;
export const MAC_REGEX = /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/;

export const rawReadingSchema = z.object({
  n: z.string().regex(NODE_ID_REGEX, "node_id must be node-XXXXXXXX (uppercase hex)"),
  m: z.string().regex(MAC_REGEX, "MAC must be uppercase colon-separated 6 octets"),
  r: z.number().int().min(-120).max(0),
  t: z.number().int().positive().optional(),
});

export type RawReading = z.infer<typeof rawReadingSchema>;

export const TOPIC_RAW_PREFIX = "catscan/raw/";
export const TOPIC_RAW_PATTERN = "catscan/raw/+";
export const TOPIC_HEALTH_PREFIX = "catscan/health/";
export const TOPIC_HEALTH_PATTERN = "catscan/health/+";
export type HealthStatus = "online" | "offline";

export function parseHealthPayload(payload: string): HealthStatus | null {
  const s = payload.trim();
  return s === "online" || s === "offline" ? s : null;
}

export function isValidMac(s: string): boolean {
  return MAC_REGEX.test(s);
}
