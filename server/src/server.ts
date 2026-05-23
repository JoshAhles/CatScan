import Fastify from "fastify";
import staticPlugin from "@fastify/static";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import Database from "better-sqlite3";
import mqtt from "mqtt";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "./store/migrationRunner";
import { EventStore } from "./store/EventStore";
import { registerAuth } from "./auth/middleware";
import { registerHealth } from "./http/healthRoute";
import { registerNodes } from "./http/nodesRoutes";
import { registerCats } from "./http/catsRoutes";
import { registerCalibrationRoutes } from "./http/calibrationRoutes";
import { registerHistory } from "./http/historyRoutes";
import { registerPair } from "./http/pairRoutes";
import { registerIdentity } from "./http/identityRoutes";
import { registerConfig } from "./http/configRoutes";
import { WsServer } from "./ws/WsServer";
import { Orchestrator } from "./orchestrator/Orchestrator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const token = process.env["CATSCAN_TOKEN"]!;
if (!token) throw new Error("CATSCAN_TOKEN env var is required");

const dbPath = process.env["CATSCAN_DB"] ?? join(__dirname, "../data/catscan.db");
const webDist = join(__dirname, "../../web/dist");
const startedAt = Date.now();

const db = new Database(dbPath);
runMigrations(db, join(__dirname, "../migrations"));
const store = new EventStore(db);

const app = Fastify({ logger: { level: "info" } });
await app.register(multipart, { limits: { fileSize: 600_000 } });
await app.register(websocket);
await app.register(staticPlugin, { root: webDist, prefix: "/" });

registerAuth(app, token);
registerHealth(app, () => Math.floor((Date.now() - startedAt) / 1000));

const ws = new WsServer(token);

const mqttHost = process.env["MQTT_HOST"] ?? "localhost";
const mqttPort = Number(process.env["MQTT_PORT"] ?? 1883);
const mqttUser = process.env["MQTT_USERNAME"];
const mqttPass = process.env["MQTT_PASSWORD"];
const mqttClient = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`, {
  ...(mqttUser ? { username: mqttUser } : {}),
  ...(mqttPass ? { password: mqttPass } : {}),
  reconnectPeriod: 5_000,
  clientId: `catscan-server-${Math.random().toString(16).slice(2, 10)}`,
});
mqttClient.on("connect", () => app.log.info(`MQTT connected to ${mqttHost}:${mqttPort}`));
mqttClient.on("error", (err) => app.log.error({ err }, "MQTT error"));
mqttClient.on("reconnect", () => app.log.warn("MQTT reconnecting"));

const orchestrator = new Orchestrator({ store, ws, mqttClient });
await orchestrator.start();

ws.attach(app);
registerNodes(app, store);
registerCats(app, store);
registerCalibrationRoutes(app, orchestrator.getCalibrationController(), orchestrator);
registerHistory(app, store);
registerPair(app, store, orchestrator.getPairingController());
registerIdentity(app, store);
registerConfig(app);

const port = Number(process.env["PORT"] ?? 8787);
await app.listen({ port, host: "0.0.0.0" });
app.log.info(`CatScan listening on ${port}`);
