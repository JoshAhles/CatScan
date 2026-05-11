import { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { SocketStream } from "@fastify/websocket";
import { checkToken, TOKEN_HEADER } from "../auth/sharedSecret";
import { ServerEvent, Snapshot } from "../contracts/ws";

type SnapshotProvider = () => Snapshot;

export class Hub {
  private clients = new Set<WebSocket>();
  private snapshotProvider: SnapshotProvider | null = null;

  setSnapshotProvider(fn: SnapshotProvider) {
    this.snapshotProvider = fn;
  }

  getSnapshot(): Snapshot | null {
    return this.snapshotProvider ? this.snapshotProvider() : null;
  }

  add(ws: WebSocket) {
    this.clients.add(ws);
    ws.on("close", () => this.clients.delete(ws));
  }

  broadcast(event: ServerEvent) {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  sendTo(ws: WebSocket, event: ServerEvent) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  size() {
    return this.clients.size;
  }
}

export class WsServer {
  private hub: Hub;

  constructor(private token: string, hub?: Hub) {
    this.hub = hub ?? new Hub();
  }

  setSnapshotProvider(fn: SnapshotProvider) {
    this.hub.setSnapshotProvider(fn);
  }

  attach(app: FastifyInstance) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    app.get("/ws", { websocket: true }, function (connection: SocketStream, req) {
      const ws = connection.socket;

      // Auth: header preferred, query-string fallback
      const headerToken = req.headers[TOKEN_HEADER];
      const headerVal = Array.isArray(headerToken) ? headerToken[0] : headerToken;
      const queryToken = (req.query as Record<string, string>)["token"];
      const presented = headerVal ?? queryToken;

      if (!checkToken(self.token, presented)) {
        ws.close(4401, "unauthorized");
        return;
      }

      self.hub.add(ws);

      // Send snapshot on connect
      const snapshot = self.hub.getSnapshot();
      if (snapshot) {
        self.hub.sendTo(ws, snapshot);
      }
    });
  }

  broadcast(event: ServerEvent) {
    this.hub.broadcast(event);
  }

  sendSnapshot(ws: WebSocket, snapshot: Snapshot) {
    this.hub.sendTo(ws, snapshot);
  }

  getHub(): Hub {
    return this.hub;
  }
}
