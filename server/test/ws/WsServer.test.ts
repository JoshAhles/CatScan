import { describe, it, expect, afterEach } from "vitest";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { WsServer, Hub } from "../../src/ws/WsServer";
import { ServerEvent, Snapshot } from "../../src/contracts/ws";

const TEST_TOKEN = "test-token-abc";

function makeSnapshot(): Snapshot {
  return {
    type: "snapshot",
    ts: Date.now(),
    cats: [],
    nodes: [],
    calibration: {},
  };
}

async function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for message")), 2000);
    ws.once("message", (data) => {
      clearTimeout(timer);
      resolve(data.toString());
    });
  });
}

async function waitForClose(ws: WebSocket): Promise<number> {
  return new Promise((resolve) => {
    ws.once("close", (code) => resolve(code));
  });
}

describe("WsServer", () => {
  const servers: Array<{ close: () => Promise<void> }> = [];
  const clients: WebSocket[] = [];

  afterEach(async () => {
    for (const c of clients) {
      if (c.readyState === WebSocket.OPEN) c.close();
    }
    clients.length = 0;
    for (const s of servers) await s.close();
    servers.length = 0;
  });

  async function buildServer() {
    const hub = new Hub();
    const wsServer = new WsServer(TEST_TOKEN, hub);
    wsServer.setSnapshotProvider(() => makeSnapshot());

    const app = Fastify();
    await app.register(websocket);
    wsServer.attach(app);
    await app.listen({ port: 0 });
    const addr = app.server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    servers.push(app);
    return { wsServer, hub, port };
  }

  it("rejects connection without token", async () => {
    const { port } = await buildServer();
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    clients.push(ws);
    const code = await waitForClose(ws);
    expect(code).toBe(4401);
  });

  it("rejects connection with wrong token", async () => {
    const { port } = await buildServer();
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=wrongtoken`);
    clients.push(ws);
    const code = await waitForClose(ws);
    expect(code).toBe(4401);
  });

  it("accepts connection with correct token via query string and receives snapshot", async () => {
    const { port } = await buildServer();
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=${TEST_TOKEN}`);
    clients.push(ws);
    const msg = await waitForMessage(ws);
    const parsed = JSON.parse(msg);
    expect(parsed.type).toBe("snapshot");
    expect(parsed.cats).toBeDefined();
  });

  it("accepts connection with correct token via header and receives snapshot", async () => {
    const { port } = await buildServer();
    const ws = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { "x-catscan-token": TEST_TOKEN },
    });
    clients.push(ws);
    const msg = await waitForMessage(ws);
    const parsed = JSON.parse(msg);
    expect(parsed.type).toBe("snapshot");
  });

  it("broadcast sends event to all connected clients", async () => {
    const { wsServer, port } = await buildServer();
    // Connect two clients
    const ws1 = new WebSocket(`ws://localhost:${port}/ws?token=${TEST_TOKEN}`);
    const ws2 = new WebSocket(`ws://localhost:${port}/ws?token=${TEST_TOKEN}`);
    clients.push(ws1, ws2);
    // Wait for snapshots
    await Promise.all([waitForMessage(ws1), waitForMessage(ws2)]);

    const event: ServerEvent = {
      type: "transition",
      catId: 1,
      from: "Bedroom",
      to: "Office",
      at: Date.now(),
    };

    // Set up listeners before broadcasting
    const p1 = waitForMessage(ws1);
    const p2 = waitForMessage(ws2);
    wsServer.broadcast(event);

    const [m1, m2] = await Promise.all([p1, p2]);
    expect(JSON.parse(m1)).toMatchObject({ type: "transition", to: "Office" });
    expect(JSON.parse(m2)).toMatchObject({ type: "transition", to: "Office" });
  });
});
