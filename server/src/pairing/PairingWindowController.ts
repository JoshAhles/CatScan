export interface PairingConfig {
  windowMs: number;   // how long the window stays open (default 60000)
  minRssi: number;    // minimum RSSI to accept (default -50)
}

export type ConsiderResult =
  | { resolved: true; catId: number; mac: string }
  | { resolved: false };

export class PairingWindowController {
  private openCatId: number | null = null;
  private openedAt: number | null = null;

  constructor(private cfg: PairingConfig) {}

  openWindow(catId: number, nowMs = Date.now()) {
    this.openCatId = catId;
    this.openedAt = nowMs;
  }

  closeWindow() {
    this.openCatId = null;
    this.openedAt = null;
  }

  isOpen(nowMs = Date.now()): boolean {
    if (this.openCatId === null || this.openedAt === null) return false;
    return (nowMs - this.openedAt) < this.cfg.windowMs;
  }

  consider(mac: string, rssi: number, nowMs = Date.now()): ConsiderResult {
    if (!this.isOpen(nowMs)) return { resolved: false };
    if (rssi < this.cfg.minRssi) return { resolved: false };
    const catId = this.openCatId!;
    this.closeWindow();
    return { resolved: true, catId, mac };
  }
}
