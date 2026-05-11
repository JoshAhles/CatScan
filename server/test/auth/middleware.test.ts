import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { registerAuth } from "../../src/auth/middleware";
import { TOKEN_HEADER } from "../../src/auth/sharedSecret";

describe("auth middleware", () => {
  it("rejects requests without the header", async () => {
    const app = Fastify();
    registerAuth(app, "secret123");
    app.get("/x", async () => ({ ok: true }));
    const res = await app.inject({ method: "GET", url: "/x" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("rejects wrong token", async () => {
    const app = Fastify();
    registerAuth(app, "secret123");
    app.get("/x", async () => ({ ok: true }));
    const res = await app.inject({ method: "GET", url: "/x", headers: { [TOKEN_HEADER]: "bad" } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("accepts the correct token", async () => {
    const app = Fastify();
    registerAuth(app, "secret123");
    app.get("/x", async () => ({ ok: true }));
    const res = await app.inject({ method: "GET", url: "/x", headers: { [TOKEN_HEADER]: "secret123" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });

  it("allows /api/health without the token", async () => {
    const app = Fastify();
    registerAuth(app, "secret123");
    app.get("/api/health", async () => ({ status: "ok", uptimeSeconds: 1 }));
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
