import { describe, it, expect } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/store/migrationRunner";
import { EventStore } from "../../src/store/EventStore";
import { registerAuth } from "../../src/auth/middleware";
import { TOKEN_HEADER } from "../../src/auth/sharedSecret";
import { registerCalibrationRoutes } from "../../src/http/calibrationRoutes";
import { CalibrationController } from "../../src/calibration/CalibrationController";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const NODE_IDS = ["node-A1B2C3D4", "node-B1B2C3D4"];
const SENTINEL = -100;
const MIN_SAMPLES = 3;

function buildApp() {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  const store = new EventStore(db);
  const controller = new CalibrationController({ store, nodeIds: NODE_IDS, sentinelDbm: SENTINEL, minSamples: MIN_SAMPLES });
  const app = Fastify();
  registerAuth(app, "T");
  registerCalibrationRoutes(app, controller);
  return { app, store, controller };
}

describe("calibration routes", () => {
  it("POST /api/calibration/start starts a session", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "POST", url: "/api/calibration/start",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({ room: "Bedroom" }),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "started", room: "Bedroom", target: MIN_SAMPLES });
    await app.close();
  });

  it("POST /api/calibration/start rejects invalid body", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "POST", url: "/api/calibration/start",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("POST /api/calibration/stop stops a session and saves centroid when enough samples", async () => {
    const { app, controller, store } = buildApp();
    controller.start("Bedroom");
    // Feed enough readings
    for (let i = 0; i < MIN_SAMPLES; i++) {
      controller.addReading({ "node-A1B2C3D4": -60, "node-B1B2C3D4": -70 });
    }
    const res = await app.inject({
      method: "POST", url: "/api/calibration/stop",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(200);
    const centroids = store.loadCentroids();
    expect(centroids["Bedroom"]).toBeDefined();
    await app.close();
  });

  it("POST /api/calibration/stop returns 409 when no active session", async () => {
    const { app } = buildApp();
    const res = await app.inject({
      method: "POST", url: "/api/calibration/stop",
      headers: { [TOKEN_HEADER]: "T", "content-type": "application/json" },
      payload: JSON.stringify({}),
    });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it("DELETE /api/calibration/:room removes centroid", async () => {
    const { app, store } = buildApp();
    store.saveCentroid("Bedroom", [-60, -70], 5, Math.floor(Date.now() / 1000));
    const res = await app.inject({
      method: "DELETE", url: "/api/calibration/Bedroom",
      headers: { [TOKEN_HEADER]: "T" },
    });
    expect(res.statusCode).toBe(200);
    const centroids = store.loadCentroids();
    expect(centroids["Bedroom"]).toBeUndefined();
    await app.close();
  });
});
