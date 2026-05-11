import { describe, it, expect } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/store/migrationRunner";
import { EventStore } from "../../src/store/EventStore";
import { registerAuth } from "../../src/auth/middleware";
import { TOKEN_HEADER } from "../../src/auth/sharedSecret";
import { registerCats } from "../../src/http/catsRoutes";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildApp(): { app: FastifyInstance; store: EventStore } {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  const store = new EventStore(db);
  const app = Fastify();
  registerAuth(app, "T");
  registerCats(app, store);
  return { app, store };
}

describe("cats routes", () => {
  it("POST /api/cats creates a cat", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "POST", url: "/api/cats",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({ name: "Ollie", colorHex: "#ffcc4d" }),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({ id: expect.any(Number), name: "Ollie", color_hex: "#ffcc4d" });
    await app.close();
  });

  it("POST /api/cats rejects duplicate name", async () => {
    const { app } = buildApp();
    const headers = { [TOKEN_HEADER]: "T", "content-type": "application/json" };
    await app.inject({ method: "POST", url: "/api/cats", headers, payload: JSON.stringify({ name: "Ollie", colorHex: "#ffcc4d" }) });
    const res = await app.inject({ method: "POST", url: "/api/cats", headers, payload: JSON.stringify({ name: "Ollie", colorHex: "#aabbcc" }) });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it("GET /api/cats lists cats", async () => {
    const { app, store } = buildApp();
    store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    store.createCat({ name: "Mochi", color_hex: "#ff6644" });
    const res = await app.inject({ method: "GET", url: "/api/cats", headers: { [TOKEN_HEADER]: "T" } });
    expect(res.statusCode).toBe(200);
    const cats = res.json();
    expect(cats).toHaveLength(2);
    expect(cats[0]).toMatchObject({ name: "Ollie" });
    await app.close();
  });

  it("PATCH /api/cats/:id updates name", async () => {
    const { app, store } = buildApp();
    const id = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    const res = await app.inject({
      method: "PATCH", url: `/api/cats/${id}`,
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({ name: "Oliver" }),
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("POST /api/cats rejects invalid color format", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "POST", url: "/api/cats",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({ name: "Ollie", colorHex: "red" }),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("PATCH /api/cats/:id rejects empty body", async () => {
    const { app, store } = buildApp();
    const id = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    const res = await app.inject({
      method: "PATCH", url: `/api/cats/${id}`,
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
