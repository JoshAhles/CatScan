import { CalibrationCapture } from "./CalibrationCapture";
import { EventStore } from "../store/EventStore";

interface CalibrationControllerConfig {
  store: EventStore;
  nodeIds: string[];
  sentinelDbm: number;
  minSamples: number;
}

export class CalibrationController {
  private capture: CalibrationCapture | null = null;
  private activeRoom: string | null = null;
  private filterCatId: number | null = null;

  constructor(private cfg: CalibrationControllerConfig) {}

  start(room: string, catId?: number) {
    this.activeRoom = room;
    this.filterCatId = catId ?? null;
    this.capture = new CalibrationCapture(this.cfg.nodeIds, this.cfg.sentinelDbm, this.cfg.minSamples);
  }

  get activeCatFilter(): number | null { return this.filterCatId; }

  addReading(readings: Record<string, number>) {
    this.capture?.addReading(readings);
  }

  stop(): { room: string; centroid: number[] | null; samples: number; target: number } | null {
    if (!this.capture || !this.activeRoom) return null;
    const centroid = this.capture.centroid();
    const { samples, target } = this.capture.progress();
    const room = this.activeRoom;
    if (centroid !== null) {
      const ts = Math.floor(Date.now() / 1000);
      this.cfg.store.saveCentroid(room, centroid, samples, ts);
    }
    this.capture = null;
    this.activeRoom = null;
    return { room, centroid, samples, target };
  }

  isActive(): boolean {
    return this.capture !== null;
  }

  progress(): { room: string; samples: number; target: number } | null {
    if (!this.capture || !this.activeRoom) return null;
    const { samples, target } = this.capture.progress();
    return { room: this.activeRoom, samples, target };
  }

  minSamples(): number {
    return this.cfg.minSamples;
  }

  deleteRoom(room: string) {
    this.cfg.store.deleteCentroid(room);
  }
}
