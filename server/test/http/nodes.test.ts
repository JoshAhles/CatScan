import { describe, it, expect } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/store/migrationRunner";
import { EventStore } from "../../src/store/EventStore";
import { registerAuth } from "../../src/auth/middleware";
import { TOKEN_HEADER } from "../../src/auth/sharedSecret";
import { registerHealth } from "../../src/http/healthRoute";
import { registerNodes } from "../../src/http/nodesRoutes";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildApp(): { app: FastifyInstance; store: EventStore } {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  const store = new EventStore(db);
  const app = Fastify();
  registerAuth(app, "T");
  registerHealth(app, () => 42);
  registerNodes(app, store);
  return { app, store };
}

describe("nodes routes", () => {
  it("GET /api/health returns ok without auth", async () => {
    const { app } = buildApp();
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", uptimeSeconds: 42 });
    await app.close();
  });

  it("GET /api/nodes returns empty array initially", async () => {
    const { app } = buildApp();
    const res = await app.inject({ method: "GET", url: "/api/nodes", headers: { [TOKEN_HEADER]: "T" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    await app.close();
  });

  it("PATCH /api/nodes/:id sets room name", async () => {
    const { app, store } = buildApp();
    store.upsertNode("node-A1B2C3D4");
    const res = await app.inject({
      method: "PATCH", url: "/api/nodes/node-A1B2C3D4",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({ roomName: "Front Room" }),
    });
    expect(res.statusCode).toBe(200);
    expect(store.listNodes()[0]?.room_name).toBe("Front Room");
    await app.close();
  });

  it("PATCH rejects invalid body", async () => {
    const { app, store } = buildApp();
    store.upsertNode("node-A1B2C3D4");
    const res = await app.inject({
      method: "PATCH", url: "/api/nodes/node-A1B2C3D4",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
