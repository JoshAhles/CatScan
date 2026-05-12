// Derived from the user's Roborock vacuum-generated home map (2026-05-11).
// Proportions approximate; exact dimensions are not load-bearing since the
// Room Decider works in RSSI fingerprint space, not in pixel space.
//
// Tracked rooms (5):  Living Room, Kitchen, Master Bedroom, Office, Cat Room.
// Visual-only space:  Corridor (drawn as `hallway`).
//
// All adjacencies are physically modeled. Kitchen shares its south wall with
// Master Bedroom. Office shares its west wall with Master Bedroom and its
// east wall with Cat Room. Corridor is the central hub touching Living Room
// (north), Master Bedroom (west), Office (south), and Cat Room (south).

export interface RoomConfig {
  name: string;
  /** Fun room emoji (Unicode). Rendered inline next to the room name. */
  emoji: string;
  /** SVG viewport polygon vertices [x, y] in px. */
  polygon: [number, number][];
  /** Fill color hint for heatmap overlay (dark theme). */
  color: string;
}

export interface NodeConfig {
  id: string;
  /** Approx SVG position [x, y] — placeholder until each ESP32 is named at install. */
  pos: [number, number];
}

/**
 * Door / open-entry segments. Each entry is a span on a wall that should be
 * rendered as a *gap* (no stroke) when drawing the surrounding walls. Both
 * `from` and `to` must lie on the same straight edge of any room/hallway
 * polygon. Order doesn't matter (the renderer sorts).
 */
export interface DoorConfig {
  from: [number, number];
  to: [number, number];
}

export const floorPlanConfig = {
  viewBox: "30 40 670 570",
  rooms: [
    {
      name: "Kitchen",
      emoji: "🍳",
      // Top-left. South edge at y=330 shares wall with Master Bedroom.
      polygon: [
        [70, 90],
        [320, 90],
        [320, 330],
        [70, 330],
      ] as [number, number][],
      color: "#3a2e10",
    },
    {
      name: "Living Room",
      emoji: "🛋️",
      // Top stripe across the right two-thirds; south edge meets MB (briefly)
      // and the Corridor.
      polygon: [
        [320, 50],
        [660, 50],
        [660, 330],
        [320, 330],
      ] as [number, number][],
      color: "#1a2840",
    },
    {
      name: "Master Bedroom",
      emoji: "🛏️",
      // Left rectangle; shares north wall with Kitchen, east wall with both
      // Corridor (upper portion) and Office (lower portion).
      polygon: [
        [40, 330],
        [340, 330],
        [340, 560],
        [40, 560],
      ] as [number, number][],
      color: "#103a32",
    },
    {
      name: "Office",
      emoji: "💻",
      // Bottom-center; west wall shared with Master Bedroom (x=340), north
      // wall shared with Corridor (y=420), east wall shared with Cat Room
      // (x=515 — split evenly with Cat Room: both rooms 175 px wide).
      polygon: [
        [340, 420],
        [515, 420],
        [515, 600],
        [340, 600],
      ] as [number, number][],
      color: "#1a2a20",
    },
    {
      name: "Cat Room",
      emoji: "🐱",
      // Bottom-right; same size as Office (175 px wide); north edge meets
      // Corridor at x=515–590 and continues east as exterior wall.
      polygon: [
        [515, 420],
        [690, 420],
        [690, 600],
        [515, 600],
      ] as [number, number][],
      color: "#2a201a",
    },
  ] satisfies RoomConfig[],
  /**
   * Corridor — wide-but-short connector. Not a tracked room. The 6th ESP32
   * (spare) sits here.
   */
  hallway: {
    polygon: [
      [340, 330],
      [590, 330],
      [590, 420],
      [340, 420],
    ] as [number, number][],
  },
  nodes: [
    { id: "node-00000001", pos: [195, 210] as [number, number] }, // Kitchen
    { id: "node-00000002", pos: [490, 190] as [number, number] }, // Living Room
    { id: "node-00000003", pos: [190, 445] as [number, number] }, // Master Bedroom
    { id: "node-00000004", pos: [427, 510] as [number, number] }, // Office
    { id: "node-00000005", pos: [602, 510] as [number, number] }, // Cat Room
    { id: "node-00000006", pos: [465, 375] as [number, number] }, // Corridor (spare)
  ] satisfies NodeConfig[],
  /**
   * Doors / entryways — rendered as gaps in the wall paths. Approximations
   * derived from the Roborock map; the kitchen↔living-room opening is wide
   * (entryway, no door), the rest are typical door-width gaps.
   */
  doors: [
    // Kitchen ↔ Living Room — wide entryway, no door
    { from: [320, 150], to: [320, 270] },
    // Living Room ↔ Corridor — wide open entryway
    { from: [380, 330], to: [510, 330] },
    // Master Bedroom ↔ Corridor — east-side bedroom door
    { from: [340, 350], to: [340, 385] },
    // Office ↔ Corridor — north doorway, on the east (Cat Room) side
    { from: [455, 420], to: [495, 420] },
    // Cat Room ↔ Corridor — north doorway
    { from: [530, 420], to: [570, 420] },
  ] satisfies DoorConfig[],
};

export type FloorPlanConfig = typeof floorPlanConfig;
