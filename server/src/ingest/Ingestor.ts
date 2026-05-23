import { rawReadingSchema, RawReading } from "../contracts/mqtt";

interface IngestorDeps {
  onReading: (r: Required<RawReading>) => void;
  onNodeDiscovered: (nodeId: string) => void;
  knownNodeId: (nodeId: string) => boolean;
  nowSec: () => number;
}

export class Ingestor {
  constructor(private deps: IngestorDeps) {}

  handleMessage(topic: string, payload: Buffer) {
    let parsed: RawReading;
    try {
      const raw = JSON.parse(payload.toString("utf8"));
      parsed = rawReadingSchema.parse(raw);
    } catch {
      return;
    }
    const now = this.deps.nowSec();
    const t = parsed.t ?? now;
    if (Math.abs(now - t) > 30) return;
    if (!this.deps.knownNodeId(parsed.n)) this.deps.onNodeDiscovered(parsed.n);
    this.deps.onReading({ ...parsed, t });
  }
}
