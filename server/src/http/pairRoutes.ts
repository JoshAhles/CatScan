import { FastifyInstance } from "fastify";
import { EventStore } from "../store/EventStore";
import { PairingWindowController } from "../pairing/PairingWindowController";

export function registerPair(app: FastifyInstance, store: EventStore, pairing: PairingWindowController) {
  app.post<{ Params: { id: string } }>("/api/cats/:id/pair", async (req, reply) => {
    const catId = Number(req.params.id);
    const cats = store.listCats();
    if (!cats.find(c => c.id === catId)) {
      return reply.code(404).send({ error: "cat not found" });
    }
    pairing.openWindow(catId);
    return { status: "waiting", catId };
  });
}
