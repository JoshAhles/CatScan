// Derived from the user's Roborock vacuum-generated home map (2026-05-11).
// Proportions approximate; exact dimensions are not load-bearing since the
// Room Decider works in RSSI fingerprint space, not in pixel space.
//
// Tracked rooms (5):  Living Room, Kitchen, Master Bedroom, Office, Cat Room.
// Visual-only space:  Corridor (drawn as `hallway`).
// Skipped:            Bathroom (per user); master-bedroom closet (folded into
//                     Master Bedroom polygon for visual simplicity — the
//                     interior wall between bedroom and closet is real but
//                     irrelevant to room-presence tracking).
//
// House aspect is close to square (~830×870 px in the Roborock map); using a
// 700×620 SVG viewBox to leave breathing room for HUD chrome on the dashboard.

export interface RoomConfig {
  name: string;
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

export const floorPlanConfig = {
  viewBox: "0 0 700 620",
  rooms: [
    {
      name: "Living Room",
      // Top-right area; L-shape simplified to a single block with a notch on the
      // bottom-left where the corridor enters.
      polygon: [
        [320, 50],
        [660, 50],
        [660, 320],
        [470, 320],
        [470, 290],
        [320, 290],
      ] as [number, number][],
      color: "#1a2840",
    },
    {
      name: "Kitchen",
      // Top-left; bounded on the left by the "Cliff No-Go Zone" line.
      // Nothing west of x=70 in this map is real floor space.
      polygon: [
        [70, 90],
        [320, 90],
        [320, 290],
        [70, 290],
      ] as [number, number][],
      color: "#3a2e10",
    },
    {
      name: "Master Bedroom",
      // Left-center; closet appendage on right side folded into the polygon
      // (the appendage extends up between Kitchen and the Corridor entry).
      polygon: [
        [40, 320],
        [260, 320],
        [260, 300],
        [320, 300],
        [320, 410],
        [350, 410],
        [350, 560],
        [40, 560],
      ] as [number, number][],
      color: "#103a32",
    },
    {
      name: "Office",
      // Bottom-center; "Josh office" in the Roborock map.
      polygon: [
        [380, 450],
        [540, 450],
        [540, 600],
        [380, 600],
      ] as [number, number][],
      color: "#1a2a20",
    },
    {
      name: "Cat Room",
      // Bottom-right; "Jade office" in the Roborock map.
      polygon: [
        [540, 450],
        [690, 450],
        [690, 600],
        [540, 600],
      ] as [number, number][],
      color: "#2a201a",
    },
  ] satisfies RoomConfig[],
  /**
   * Corridor — visual context only, NOT a tracked room. The 6th ESP32 ("spare")
   * will likely live here to give the fingerprint algorithm signal coverage of
   * the seam between the bedroom/office/cat-room transitions.
   */
  hallway: {
    polygon: [
      [350, 320],
      [470, 320],
      [470, 450],
      [350, 450],
    ] as [number, number][],
  },
  nodes: [
    // Placeholder positions — replace with actual outlet locations once the
    // ESP32s are named in the SETUP tab. Each node's `id` here is also a
    // placeholder; real chip-derived IDs (node-XXXXXXXX) take over at install.
    { id: "node-00000001", pos: [200, 200] as [number, number] }, // Kitchen
    { id: "node-00000002", pos: [490, 175] as [number, number] }, // Living Room
    { id: "node-00000003", pos: [180, 440] as [number, number] }, // Master Bedroom
    { id: "node-00000004", pos: [460, 525] as [number, number] }, // Office
    { id: "node-00000005", pos: [615, 525] as [number, number] }, // Cat Room
    { id: "node-00000006", pos: [410, 385] as [number, number] }, // Corridor (spare)
  ] satisfies NodeConfig[],
};

export type FloorPlanConfig = typeof floorPlanConfig;
