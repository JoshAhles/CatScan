import { describe, it, expect } from "vitest";
import { roomCenter, pointInRoom } from "../../src/floorPlan/geometry";

describe("floor plan geometry", () => {
  it("computes centroid of a rectangle", () => {
    const poly = [[0,0],[10,0],[10,10],[0,10]] as [number,number][];
    expect(roomCenter(poly)).toEqual([5, 5]);
  });

  it("pointInRoom: inside", () => {
    const poly = [[0,0],[10,0],[10,10],[0,10]] as [number,number][];
    expect(pointInRoom([5,5], poly)).toBe(true);
  });

  it("pointInRoom: outside", () => {
    const poly = [[0,0],[10,0],[10,10],[0,10]] as [number,number][];
    expect(pointInRoom([20,5], poly)).toBe(false);
  });
});
