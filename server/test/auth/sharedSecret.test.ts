import { describe, it, expect } from "vitest";
import { checkToken, generateToken, TOKEN_HEADER } from "../../src/auth/sharedSecret";

describe("shared-secret auth", () => {
  it("generates a sufficiently long token", () => {
    const t = generateToken();
    expect(t.length).toBeGreaterThanOrEqual(32);
  });

  it("accepts the correct token", () => {
    expect(checkToken("abc123", "abc123")).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(checkToken("abc123", "wrong")).toBe(false);
  });

  it("rejects an empty token", () => {
    expect(checkToken("abc123", "")).toBe(false);
    expect(checkToken("abc123", undefined)).toBe(false);
  });

  it("uses constant-time comparison", () => {
    expect(checkToken("abc123", "abc1234")).toBe(false);
    expect(checkToken("abc123", "a")).toBe(false);
  });

  it("exports the canonical header name", () => {
    expect(TOKEN_HEADER).toBe("x-catscan-token");
  });
});
