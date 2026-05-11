import { FastifyInstance } from "fastify";
import { EventStore } from "../store/EventStore";

export function registerHistory(app: FastifyInstance, store: EventStore) {
  app.get("/api/timeline", async (req, reply) => {
    const { catId, date } = req.query as Record<string, string>;
    if (!catId || !date) {
      return reply.code(400).send({ error: "catId and date are required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return reply.code(400).send({ error: "date must be YYYY-MM-DD" });
    }
    const dayStart = Math.floor(new Date(date + "T00:00:00Z").getTime() / 1000);
    const dayEnd = dayStart + 86400;
    return store.timelineForDay(Number(catId), dayStart, dayEnd);
  });

  app.get("/api/heatmap", async (req, reply) => {
    const { catId, from, to } = req.query as Record<string, string>;
    if (!catId || !from || !to) {
      return reply.code(400).send({ error: "catId, from, and to are required" });
    }
    return store.heatmap(Number(catId), Number(from), Number(to));
  });
}
