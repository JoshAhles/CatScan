import { FastifyInstance } from "fastify";
import { postIdentityResolveBodySchema } from "../contracts/http";
import { EventStore } from "../store/EventStore";

export function registerIdentity(app: FastifyInstance, store: EventStore) {
  app.post("/api/identity/resolve", async (req, reply) => {
    const body = postIdentityResolveBodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.message });
    const ts = Math.floor(Date.now() / 1000);
    store.bindMac(body.data.provisionalMac, body.data.catId, "manual", ts);
    return { ok: true };
  });
}
