import Fastify from "fastify";
import staticPlugin from "@fastify/static";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import Database from "better-sqlite3";
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
const orchestrator = new Orchestrator({ store, ws });
await orchestrator.start();

ws.attach(app);
registerNodes(app, store);
registerCats(app, store);
registerCalibrationRoutes(app, orchestrator.getCalibrationController());
registerHistory(app, store);
registerPair(app, store, orchestrator.getPairingController());
registerIdentity(app, store);
registerConfig(app);

const port = Number(process.env["PORT"] ?? 8787);
await app.listen({ port, host: "0.0.0.0" });
app.log.info(`CatScan listening on ${port}`);
