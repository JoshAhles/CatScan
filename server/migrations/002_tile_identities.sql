-- 002_tile_identities.sql — permanent Tile ID → cat mapping

CREATE TABLE tile_identities (
  tile_id         TEXT PRIMARY KEY,
  cat_id          INTEGER REFERENCES cats(id),
  paired_at       INTEGER NOT NULL
);
