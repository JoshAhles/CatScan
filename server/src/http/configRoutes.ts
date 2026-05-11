import { FastifyInstance } from "fastify";
import { patchConfigBodySchema, PatchConfigBody } from "../contracts/http";

// Spec §8.4 tuning constants — mutable at runtime
export interface SystemConfig {
  alpha: number;
  nodeStaleSeconds: number;
  staleSentinelDbm: number;
  silentSeconds: number;
  hysteresisDbm: number;
  hysteresisTicks: number;
  tickIntervalMs: number;
  rotationConfidenceRatio: number;
}

const defaultConfig: SystemConfig = {
  alpha: 0.2,
  nodeStaleSeconds: 30,
  staleSentinelDbm: -100,
  silentSeconds: 120,
  hysteresisDbm: 5,
  hysteresisTicks: 3,
  tickIntervalMs: 1000,
  rotationConfidenceRatio: 0.5,
};

// Module-level mutable config (reset per app instance in tests via factory)
let config: SystemConfig = { ...defaultConfig };

export function resetConfig() {
  config = { ...defaultConfig };
}

export function getConfig(): SystemConfig {
  return { ...config };
}

export function registerConfig(app: FastifyInstance, externalConfig?: SystemConfig) {
  // Allow injecting a shared config object (for Orchestrator integration)
  if (externalConfig) {
    Object.assign(config, externalConfig);
  } else {
    // Fresh copy per test app
    config = { ...defaultConfig };
  }

  const cfg = externalConfig ?? config;

  app.get("/api/config", async () => ({ ...cfg }));

  app.patch("/api/config", async (req, reply) => {
    const body = patchConfigBodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.message });
    const updates = body.data as PatchConfigBody;
    Object.assign(cfg, updates);
    return { ...cfg };
  });
}
