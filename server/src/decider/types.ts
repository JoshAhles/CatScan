export interface RoomDeciderConfig {
  nodeIds: string[];
  centroids: Record<string, number[]>;
  hysteresisDbm: number;
  hysteresisTicks: number;
  silentSeconds: number;
  staleSentinelDbm: number;
}

export type RoomDecision =
  | { kind: "placed"; room: string }
  | { kind: "transitioned"; from: string; room: string }
  | { kind: "noChange"; room: string }
  | { kind: "silent"; lastRoom: string };
