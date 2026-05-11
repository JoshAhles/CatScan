import { randomBytes, timingSafeEqual } from "node:crypto";

export const TOKEN_HEADER = "x-catscan-token";

export function generateToken(): string {
  return randomBytes(24).toString("hex"); // 48 chars
}

export function checkToken(expected: string, presented: string | undefined): boolean {
  if (!presented || presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(presented));
}
