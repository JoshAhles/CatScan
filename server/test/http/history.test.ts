import { describe, it, expect } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/store/migrationRunner";
import { EventStore } from "../../src/store/EventStore";
import { registerAuth } from "../../src/auth/middleware";
import { TOKEN_HEADER } from "../../src/auth/sharedSecret";
import { registerHistory } from "../../src/http/historyRoutes";
import { registerConfig } from "../../src/http/configRoutes";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildApp() {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  const store = new EventStore(db);
  const app = Fastify();
  registerAuth(app, "T");
  registerHistory(app, store);
  registerConfig(app);
  return { app, store };
}

describe("history routes", () => {
  it("GET /api/timeline returns room states for a day", async () => {
    const { app, store } = buildApp();
    const catId = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    // Day 2026-01-01 UTC: 1735689600 → 1735689600 + 86400
    const dayStart = 1735689600;
    store.openRoomState(catId, "Bedroom", dayStart + 100);
    store.closeAndOpenRoomState(catId, "Bedroom", "Office", dayStart + 3600);

    const res = await app.inject({
      method: "GET",
      url: `/api/timeline?catId=${catId}&date=2026-01-01`,
      headers: { [TOKEN_HEADER]: "T" },
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    await app.close();
  });

  it("GET /api/timeline requires catId and date", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "GET", url: "/api/timeline",
      headers: { [TOKEN_HEADER]: "T" },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("GET /api/heatmap returns seconds per room", async () => {
    const { app, store } = buildApp();
    const catId = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    const base = 1735689600;
    store.openRoomState(catId, "Bedroom", base);
    store.closeAndOpenRoomState(catId, "Bedroom", "Office", base + 3600);
    store.closeAndOpenRoomState(catId, "Office", null, base + 7200);

    const res = await app.inject({
      method: "GET",
      url: `/api/heatmap?catId=${catId}&from=${base}&to=${base + 7200}`,
      headers: { [TOKEN_HEADER]: "T" },
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json();
    expect(Array.isArray(rows)).toBe(true);
    const bedroomRow = rows.find((r: { room: string }) => r.room === "Bedroom");
    expect(bedroomRow).toBeDefined();
    await app.close();
  });

  it("GET /api/heatmap requires catId, from, to", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "GET", url: "/api/heatmap?catId=1",
      headers: { [TOKEN_HEADER]: "T" },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe("config routes", () => {
  it("GET /api/config returns default config", async () => {
    const { app } = buildApp();
    const res = await app.inject({ method: "GET", url: "/api/config", headers: { [TOKEN_HEADER]: "T" } });
    expect(res.statusCode).toBe(200);
    const cfg = res.json();
    expect(cfg).toMatchObject({
      alpha: expect.any(Number),
      hysteresisDbm: expect.any(Number),
      hysteresisTicks: expect.any(Number),
      silentSeconds: expect.any(Number),
      nodeStaleSeconds: expect.any(Number),
    });
    await app.close();
  });

  it("PATCH /api/config updates alpha", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "PATCH", url: "/api/config",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({ alpha: 0.3 }),
    });
    expect(res.statusCode).toBe(200);
    const updated = res.json();
    expect(updated.alpha).toBe(0.3);
    await app.close();
  });

  it("PATCH /api/config rejects invalid body", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "PATCH", url: "/api/config",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
