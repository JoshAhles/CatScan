import { FastifyInstance } from "fastify";
import { patchNodeBodySchema } from "../contracts/http";
import { EventStore } from "../store/EventStore";

export function registerNodes(app: FastifyInstance, store: EventStore) {
  app.get("/api/nodes", async () => store.listNodes());

  app.patch<{ Params: { id: string } }>("/api/nodes/:id", async (req, reply) => {
    const body = patchNodeBodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.message });
    store.setNodeRoom(req.params.id, body.data.roomName);
    return { ok: true };
  });
}
