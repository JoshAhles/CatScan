import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/store/migrationRunner";
import { EventStore } from "../../src/store/EventStore";
import { registerAuth } from "../../src/auth/middleware";
import { TOKEN_HEADER } from "../../src/auth/sharedSecret";
import { registerPair } from "../../src/http/pairRoutes";
import { registerIdentity } from "../../src/http/identityRoutes";
import { PairingWindowController } from "../../src/pairing/PairingWindowController";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildApp() {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  const store = new EventStore(db);
  const pairing = new PairingWindowController({ windowMs: 60_000, minRssi: -50 });
  const app = Fastify();
  registerAuth(app, "T");
  registerPair(app, store, pairing);
  registerIdentity(app, store);
  return { app, store, pairing };
}

describe("pairing routes", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("POST /api/cats/:id/pair opens a pairing window", async () => {
    const { app, store } = buildApp();
    const catId = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    const res = await app.inject({
      method: "POST", url: `/api/cats/${catId}/pair`,
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "waiting", catId });
    await app.close();
  });

  it("POST /api/cats/:id/pair returns 404 for unknown cat", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "POST", url: `/api/cats/9999/pair`,
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("PairingWindowController resolves when MAC with good RSSI is seen", async () => {
    const pairing = new PairingWindowController({ windowMs: 60_000, minRssi: -50 });
    pairing.openWindow(1);
    const result = pairing.consider("AA:BB:CC:DD:EE:FF", -40);
    expect(result).toMatchObject({ resolved: true, catId: 1, mac: "AA:BB:CC:DD:EE:FF" });
  });

  it("PairingWindowController ignores weak RSSI", async () => {
    const pairing = new PairingWindowController({ windowMs: 60_000, minRssi: -50 });
    pairing.openWindow(1);
    const result = pairing.consider("AA:BB:CC:DD:EE:FF", -80);
    expect(result).toMatchObject({ resolved: false });
  });

  it("PairingWindowController returns no-op when no window open", async () => {
    const pairing = new PairingWindowController({ windowMs: 60_000, minRssi: -50 });
    const result = pairing.consider("AA:BB:CC:DD:EE:FF", -30);
    expect(result).toMatchObject({ resolved: false });
  });
});

describe("identity resolve route", () => {
  it("POST /api/identity/resolve binds a MAC to a cat", async () => {
    const { app, store } = buildApp();
    const catId = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    const res = await app.inject({
      method: "POST", url: `/api/identity/resolve`,
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({ provisionalMac: "AA:BB:CC:DD:EE:FF", catId }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
    expect(store.findCatByMac("AA:BB:CC:DD:EE:FF")).toBe(catId);
    await app.close();
  });

  it("POST /api/identity/resolve rejects invalid body", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "POST", url: `/api/identity/resolve`,
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({ provisionalMac: "bad-mac", catId: 1 }),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
