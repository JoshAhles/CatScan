import { FastifyInstance } from "fastify";
import { postCatBodySchema, patchCatBodySchema } from "../contracts/http";
import { EventStore } from "../store/EventStore";

export function registerCats(app: FastifyInstance, store: EventStore) {
  app.get("/api/cats", async () => store.listCats());

  app.post("/api/cats", async (req, reply) => {
    const body = postCatBodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.message });
    try {
      const id = store.createCat({ name: body.data.name, color_hex: body.data.colorHex, photo_path: body.data.photoPath });
      const cats = store.listCats();
      const cat = cats.find(c => c.id === id);
      return reply.code(201).send(cat);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("UNIQUE")) return reply.code(409).send({ error: "name or color already exists" });
      throw err;
    }
  });

  app.patch<{ Params: { id: string } }>("/api/cats/:id", async (req, reply) => {
    const body = patchCatBodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.message });
    const id = Number(req.params.id);
    const fields: Partial<{ name: string; color_hex: string; photo_path: string | null }> = {};
    if (body.data.name !== undefined) fields.name = body.data.name;
    if (body.data.colorHex !== undefined) fields.color_hex = body.data.colorHex;
    if (body.data.photoPath !== undefined) fields.photo_path = body.data.photoPath;
    store.updateCat(id, fields);
    return { ok: true };
  });
}
