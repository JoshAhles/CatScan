import { FastifyInstance } from "fastify";
import { postCalibrationStartBodySchema } from "../contracts/http";
import { CalibrationController } from "../calibration/CalibrationController";

export function registerCalibrationRoutes(app: FastifyInstance, controller: CalibrationController) {
  app.post("/api/calibration/start", async (req, reply) => {
    const body = postCalibrationStartBodySchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.message });
    controller.start(body.data.room);
    return { status: "started", room: body.data.room, target: controller.minSamples() };
  });

  app.post("/api/calibration/stop", async (_req, reply) => {
    if (!controller.isActive()) {
      return reply.code(409).send({ error: "no active calibration session" });
    }
    const result = controller.stop();
    if (!result) return reply.code(409).send({ error: "no active calibration session" });
    return {
      status: result.centroid !== null ? "saved" : "insufficient_samples",
      room: result.room,
      samples: result.samples,
      target: result.target,
    };
  });

  app.delete<{ Params: { room: string } }>("/api/calibration/:room", async (req) => {
    const room = decodeURIComponent(req.params.room);
    controller.deleteRoom(room);
    return { ok: true, room };
  });
}
