import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/store/migrationRunner";
import { EventStore } from "../../src/store/EventStore";
import { join } from "node:path";

function freshDb() {
  const db = new Database(":memory:");
  runMigrations(db, join(__dirname, "../../migrations"));
  return db;
}

describe("EventStore", () => {
  let db: Database.Database;
  let store: EventStore;
  beforeEach(() => { db = freshDb(); store = new EventStore(db); });

  it("inserts and retrieves a node", () => {
    store.upsertNode("node-A1B2C3D4");
    store.setNodeRoom("node-A1B2C3D4", "Front Room");
    const ns = store.listNodes();
    expect(ns[0]).toMatchObject({ id: "node-A1B2C3D4", room_name: "Front Room" });
  });

  it("creates a cat and binds a MAC", () => {
    const catId = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    expect(catId).toBeGreaterThan(0);
    store.bindMac("AA:BB:CC:DD:EE:FF", catId, "manual", 1000);
    expect(store.findCatByMac("AA:BB:CC:DD:EE:FF")).toBe(catId);
  });

  it("opens and closes a room_state row on transition", () => {
    const id = store.createCat({ name: "Ollie", color_hex: "#ffcc4d" });
    store.openRoomState(id, "Bedroom", 1000);
    store.closeAndOpenRoomState(id, "Bedroom", "Kitchen", 2000);
    const rows = db.prepare("SELECT * FROM room_states ORDER BY id").all() as Array<any>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ cat_id: id, room: "Bedroom", started_at: 1000, ended_at: 2000 });
    expect(rows[1]).toMatchObject({ cat_id: id, room: "Kitchen", started_at: 2000, ended_at: null });
  });

  it("stores and reads room centroids as JSON", () => {
    const v = [-50, -80, -75, -85, -78, -60];
    store.saveCentroid("Kitchen", v, 15, 1000);
    expect(store.loadCentroids()["Kitchen"]).toEqual(v);
  });

  it("prunes raw events older than the cutoff", () => {
    store.upsertNode("node-A1B2C3D4");
    store.insertRawEvent("AA:BB:CC:DD:EE:FF", "node-A1B2C3D4", -60, 1000);
    store.insertRawEvent("AA:BB:CC:DD:EE:FF", "node-A1B2C3D4", -60, 2000);
    store.pruneRawEventsBefore(1500);
    const remaining = db.prepare("SELECT COUNT(*) AS n FROM raw_events").get() as { n: number };
    expect(remaining.n).toBe(1);
  });
});
