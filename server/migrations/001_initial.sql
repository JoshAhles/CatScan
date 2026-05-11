-- 001_initial.sql — initial CatScan schema (spec §10)

CREATE TABLE nodes (
  id              TEXT PRIMARY KEY,
  room_name       TEXT,
  last_heartbeat  INTEGER,
  status          TEXT NOT NULL DEFAULT 'discovered'
);
CREATE UNIQUE INDEX idx_nodes_room ON nodes(room_name) WHERE room_name IS NOT NULL;

CREATE TABLE cats (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL UNIQUE,
  photo_path      TEXT,
  color_hex       TEXT NOT NULL UNIQUE,
  created_at      INTEGER NOT NULL
);

CREATE TABLE mac_bindings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  mac             TEXT NOT NULL,
  cat_id          INTEGER NOT NULL REFERENCES cats(id),
  bound_at        INTEGER NOT NULL,
  unbound_at      INTEGER,
  source          TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_mac_bindings_active ON mac_bindings(mac) WHERE unbound_at IS NULL;

CREATE TABLE raw_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  mac             TEXT NOT NULL,
  node_id         TEXT NOT NULL REFERENCES nodes(id),
  rssi            INTEGER NOT NULL,
  ts              INTEGER NOT NULL
);
CREATE INDEX idx_raw_events_ts ON raw_events(ts);

CREATE TABLE room_states (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  cat_id          INTEGER NOT NULL REFERENCES cats(id),
  room            TEXT,
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER
);
CREATE INDEX idx_room_states_cat_current ON room_states(cat_id) WHERE ended_at IS NULL;

CREATE TABLE room_centroids (
  room            TEXT PRIMARY KEY,
  centroid_json   TEXT NOT NULL,
  captured_at     INTEGER NOT NULL,
  sample_count    INTEGER NOT NULL
);

CREATE TABLE node_health (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  node_id         TEXT NOT NULL REFERENCES nodes(id),
  status          TEXT NOT NULL,
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER
);
