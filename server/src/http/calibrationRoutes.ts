import { FastifyInstance } from "fastify";
import { postCalibrationStartBodySchema } from "../contracts/http";
import { CalibrationController } from "../calibration/CalibrationController";
import { Orchestrator } from "../orchestrator/Orchestrator";

export function registerCalibrationRoutes(app: FastifyInstance, controller: CalibrationController, orchestrator: Orchestrator) {
  app.post("/api/calibration/start", async (req, reply) => {
    const body = postCalibrationStartBodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.message });
    controller.start(body.data.room, body.data.catId);
    return { status: "started", room: body.data.room, filterCatId: body.data.catId ?? null };
  });

  app.post("/api/calibration/stop", async (_req, reply) => {
    const result = orchestrator.stopCalibration();
    if (!result) return reply.code(409).send({ error: "no active calibration session" });
    return {
      status: result.saved ? "saved" : "insufficient_samples",
      room: result.room,
      samples: result.samples,
    };
  });

  app.delete<{ Params: { room: string } }>("/api/calibration/:room", async (req) => {
    const room = decodeURIComponent(req.params.room);
    controller.deleteRoom(room);
    return { ok: true, room };
  });
}
