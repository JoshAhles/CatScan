import { FastifyInstance } from "fastify";

export function registerHealth(app: FastifyInstance, uptimeSeconds: () => number) {
  app.get("/api/health", async () => ({ status: "ok" as const, uptimeSeconds: uptimeSeconds() }));
}
