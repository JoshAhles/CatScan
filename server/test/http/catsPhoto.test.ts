import { describe, it, expect, afterEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import multipart from "@fastify/multipart";
import { runMigrations } from "../../src/store/migrationRunner";
import { EventStore } from "../../src/store/EventStore";
import { registerAuth } from "../../src/auth/middleware";
import { TOKEN_HEADER } from "../../src/auth/sharedSecret";
import { registerCats } from "../../src/http/catsRoutes";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rmSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal valid 1x1 PNG (67 bytes)
const MINI_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009001" +
  "2e00000000c4944415478016360f8cfc00000000200015e221bc00000000049454e44ae426082",
  "hex"
);

const dataDir = join(__dirname, "../../data/cats");

function buildApp(): { app: FastifyInstance; store: EventStore } {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  const store = new EventStore(db);
  const app = Fastify();
  app.register(multipart, { limits: { fileSize: 600_000 } });
  registerAuth(app, "T");
  registerCats(app, store);
  return { app, store };
}

afterEach(() => {
  // Clean up test photos
  if (existsSync(dataDir)) {
    rmSync(dataDir, { recursive: true, force: true });
  }
});

describe("cat photo upload", () => {
  it("POST /api/cats/:id/photo accepts valid PNG", async () => {
    const { app, store } = buildApp();
    const catId = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });

    const boundary = "----TestBoundary";
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="cat.png"\r\nContent-Type: image/png\r\n\r\n`),
      MINI_PNG,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res = await app.inject({
      method: "POST",
      url: `/api/cats/${catId}/photo`,
      headers: {
        [TOKEN_HEADER]: "T",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, path: expect.stringContaining(`${catId}.png`) });
    await app.close();
  });

  it("POST /api/cats/:id/photo rejects non-PNG", async () => {
    const { app, store } = buildApp();
    const catId = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });

    const boundary = "----TestBoundary";
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="cat.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      MINI_PNG,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res = await app.inject({
      method: "POST",
      url: `/api/cats/${catId}/photo`,
      headers: {
        [TOKEN_HEADER]: "T",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(415);
    await app.close();
  });

  it("POST /api/cats/:id/photo returns 404 for missing cat", async () => {
    const { app } = buildApp();

    const boundary = "----TestBoundary";
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="cat.png"\r\nContent-Type: image/png\r\n\r\n`),
      MINI_PNG,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res = await app.inject({
      method: "POST",
      url: `/api/cats/9999/photo`,
      headers: {
        [TOKEN_HEADER]: "T",
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
