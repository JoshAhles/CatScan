import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { registerAuth } from "../../src/auth/middleware";
import { TOKEN_HEADER } from "../../src/auth/sharedSecret";

describe("auth middleware", () => {
  it("rejects API requests without the header", async () => {
    const app = Fastify();
    registerAuth(app, "secret123");
    app.get("/api/x", async () => ({ ok: true }));
    const res = await app.inject({ method: "GET", url: "/api/x" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("rejects wrong token", async () => {
    const app = Fastify();
    registerAuth(app, "secret123");
    app.get("/api/x", async () => ({ ok: true }));
    const res = await app.inject({ method: "GET", url: "/api/x", headers: { [TOKEN_HEADER]: "bad" } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("accepts the correct token", async () => {
    const app = Fastify();
    registerAuth(app, "secret123");
    app.get("/api/x", async () => ({ ok: true }));
    const res = await app.inject({ method: "GET", url: "/api/x", headers: { [TOKEN_HEADER]: "secret123" } });
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

  it("allows GET on static UI paths without the token (bundle is public on LAN)", async () => {
    const app = Fastify();
    registerAuth(app, "secret123");
    app.get("/", async () => "index");
    app.get("/assets/main.js", async () => "js");
    const root = await app.inject({ method: "GET", url: "/" });
    const asset = await app.inject({ method: "GET", url: "/assets/main.js" });
    expect(root.statusCode).toBe(200);
    expect(asset.statusCode).toBe(200);
    await app.close();
  });

  it("rejects write methods on non-/api paths without the token", async () => {
    const app = Fastify();
    registerAuth(app, "secret123");
    app.post("/upload", async () => ({ ok: true }));
    const res = await app.inject({ method: "POST", url: "/upload" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });
});
