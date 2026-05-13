import Database from "better-sqlite3";

export interface CreateCatInput { name: string; color_hex: string; photo_path?: string; }

export class EventStore {
  constructor(private db: Database.Database) {}

  upsertNode(id: string) {
    this.db.prepare(`INSERT OR IGNORE INTO nodes(id, status) VALUES(?, 'discovered')`).run(id);
  }
  setNodeRoom(id: string, roomName: string) {
    this.db.prepare(`UPDATE nodes SET room_name = ?, status = 'online' WHERE id = ?`).run(roomName, id);
  }
  recordNodeHealth(id: string, status: "online" | "offline", tsSec: number) {
    this.db.prepare(`INSERT OR IGNORE INTO nodes(id, status) VALUES(?, ?)`).run(id, status);
    this.db.prepare(`UPDATE nodes SET status = ?, last_heartbeat = ? WHERE id = ?`).run(status, tsSec, id);
  }
  listNodes() {
    return this.db.prepare(`SELECT id, room_name, last_heartbeat, status FROM nodes`).all() as Array<any>;
  }

  createCat(c: CreateCatInput): number {
    const now = Math.floor(Date.now()/1000);
    const r = this.db.prepare(`INSERT INTO cats(name, color_hex, photo_path, created_at) VALUES(?, ?, ?, ?)`)
                     .run(c.name, c.color_hex, c.photo_path ?? null, now);
    return Number(r.lastInsertRowid);
  }
  listCats() {
    return this.db.prepare(`SELECT id, name, color_hex, photo_path FROM cats ORDER BY id`).all() as Array<any>;
  }
  updateCat(id: number, fields: Partial<{ name: string; color_hex: string; photo_path: string | null }>) {
    const parts: string[] = [];
    const values: unknown[] = [];
    if (fields.name !== undefined) { parts.push("name = ?"); values.push(fields.name); }
    if (fields.color_hex !== undefined) { parts.push("color_hex = ?"); values.push(fields.color_hex); }
    if ("photo_path" in fields) { parts.push("photo_path = ?"); values.push(fields.photo_path ?? null); }
    if (parts.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE cats SET ${parts.join(", ")} WHERE id = ?`).run(...values);
  }

  bindMac(mac: string, catId: number, source: "auto"|"manual"|"provisional", tsSec: number) {
    this.db.prepare(`UPDATE mac_bindings SET unbound_at = ? WHERE mac = ? AND unbound_at IS NULL`).run(tsSec, mac);
    this.db.prepare(`INSERT INTO mac_bindings(mac, cat_id, bound_at, source) VALUES(?, ?, ?, ?)`)
            .run(mac, catId, tsSec, source);
  }
  findCatByMac(mac: string): number | null {
    const row = this.db.prepare(`SELECT cat_id FROM mac_bindings WHERE mac = ? AND unbound_at IS NULL`).get(mac) as { cat_id?: number } | undefined;
    return row?.cat_id ?? null;
  }

  openRoomState(catId: number, room: string | null, ts: number) {
    this.db.prepare(`INSERT INTO room_states(cat_id, room, started_at) VALUES(?, ?, ?)`).run(catId, room, ts);
  }
  closeAndOpenRoomState(catId: number, fromRoom: string, toRoom: string | null, ts: number) {
    const tx = this.db.transaction(() => {
      this.db.prepare(`UPDATE room_states SET ended_at = ? WHERE cat_id = ? AND ended_at IS NULL`).run(ts, catId);
      this.db.prepare(`INSERT INTO room_states(cat_id, room, started_at) VALUES(?, ?, ?)`).run(catId, toRoom, ts);
    });
    tx();
  }
  currentRoomState(catId: number) {
    return this.db.prepare(`SELECT * FROM room_states WHERE cat_id = ? AND ended_at IS NULL`).get(catId) as any;
  }

  saveCentroid(room: string, vector: number[], sampleCount: number, ts: number) {
    this.db.prepare(`INSERT OR REPLACE INTO room_centroids(room, centroid_json, sample_count, captured_at)
                     VALUES(?, ?, ?, ?)`).run(room, JSON.stringify(vector), sampleCount, ts);
  }
  loadCentroids(): Record<string, number[]> {
    const rows = this.db.prepare(`SELECT room, centroid_json FROM room_centroids`).all() as Array<{room:string,centroid_json:string}>;
    return Object.fromEntries(rows.map(r => [r.room, JSON.parse(r.centroid_json)]));
  }
  deleteCentroid(room: string) {
    this.db.prepare(`DELETE FROM room_centroids WHERE room = ?`).run(room);
  }

  insertRawEvent(mac: string, nodeId: string, rssi: number, ts: number) {
    this.db.prepare(`INSERT INTO raw_events(mac, node_id, rssi, ts) VALUES(?, ?, ?, ?)`).run(mac, nodeId, rssi, ts);
  }
  pruneRawEventsBefore(ts: number) {
    this.db.prepare(`DELETE FROM raw_events WHERE ts < ?`).run(ts);
  }

  timelineForDay(catId: number, dayStart: number, dayEnd: number) {
    return this.db.prepare(`SELECT * FROM room_states WHERE cat_id = ? AND started_at < ? AND (ended_at IS NULL OR ended_at > ?)
                            ORDER BY started_at`).all(catId, dayEnd, dayStart) as Array<any>;
  }
  heatmap(catId: number, fromTs: number, toTs: number) {
    return this.db.prepare(`
      SELECT room, SUM(MIN(IFNULL(ended_at, ?), ?) - MAX(started_at, ?)) AS seconds
      FROM room_states WHERE cat_id = ? AND room IS NOT NULL
        AND started_at < ? AND (ended_at IS NULL OR ended_at > ?)
      GROUP BY room
    `).all(toTs, toTs, fromTs, catId, toTs, fromTs) as Array<{room: string; seconds: number}>;
  }
}
