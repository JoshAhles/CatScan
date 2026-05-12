import { FastifyInstance } from "fastify";
import { checkToken, TOKEN_HEADER } from "./sharedSecret";

export function registerAuth(app: FastifyInstance, expectedToken: string) {
  app.addHook("onRequest", async (req, reply) => {
    // Allow health check without auth — used for systemd / monitoring liveness
    if (req.url === "/api/health") return;
    // WebSocket handshake auth happens inside WsServer (browsers can't set
    // custom headers on WS, so it accepts a query-string token).
    if (req.url.startsWith("/ws")) return;
    const presented = req.headers[TOKEN_HEADER];
    const token = Array.isArray(presented) ? presented[0] : presented;
    if (!checkToken(expectedToken, token)) {
      reply.code(401).send({ error: "unauthorized" });
    }
  });
}
