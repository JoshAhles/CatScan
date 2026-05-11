export class EmaSmoother {
  private ema: number | null = null;
  private lastUpdateMs = 0;
  constructor(private readonly alpha: number) {}

  update(rssi: number, tsMs: number): void {
    this.ema = this.ema === null ? rssi : this.alpha * rssi + (1 - this.alpha) * this.ema;
    this.lastUpdateMs = tsMs;
  }

  value(): number | null {
    return this.ema;
  }

  isFresh(nowMs: number, staleSeconds: number): boolean {
    if (this.ema === null) return false;
    const nowSec = nowMs / 1000;
    return (nowSec - this.lastUpdateMs) <= staleSeconds;
  }
}
