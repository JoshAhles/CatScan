export class CalibrationCapture {
  private samples: number[][] = [];
  constructor(private nodeIds: string[], private sentinelDbm: number, private minSamples: number) {}

  addReading(readings: Record<string, number>) {
    const row = this.nodeIds.map(n => readings[n] ?? this.sentinelDbm);
    this.samples.push(row);
  }

  centroid(): number[] | null {
    if (this.samples.length < this.minSamples) return null;
    const dim = this.nodeIds.length;
    const sum = new Array(dim).fill(0);
    for (const row of this.samples) for (let i = 0; i < dim; i++) sum[i]! += row[i]!;
    return sum.map(s => s / this.samples.length);
  }

  progress() { return { samples: this.samples.length, target: this.minSamples }; }
}
