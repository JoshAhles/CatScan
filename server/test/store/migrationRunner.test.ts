import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/store/migrationRunner";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function withTempDb<T>(fn: (db: Database.Database) => T): T {
  const db = new Database(":memory:");
  try { return fn(db); } finally { db.close(); }
}

describe("migrationRunner", () => {
  it("creates _migrations table on first run", () => {
    withTempDb(db => {
      const dir = mkdtempSync(join(tmpdir(), "cs-mig-"));
      runMigrations(db, dir);
      const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'").get();
      expect(row).toBeDefined();
    });
  });

  it("applies a single migration file and records it", () => {
    withTempDb(db => {
      const dir = mkdtempSync(join(tmpdir(), "cs-mig-"));
      writeFileSync(join(dir, "001_init.sql"), "CREATE TABLE foo (id INTEGER);");
      runMigrations(db, dir);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{name:string}>;
      expect(tables.map(t => t.name)).toContain("foo");
      const applied = db.prepare("SELECT version FROM _migrations").all() as Array<{version:number}>;
      expect(applied).toEqual([{ version: 1 }]);
    });
  });

  it("is idempotent — running twice applies nothing the second time", () => {
    withTempDb(db => {
      const dir = mkdtempSync(join(tmpdir(), "cs-mig-"));
      writeFileSync(join(dir, "001_init.sql"), "CREATE TABLE foo (id INTEGER);");
      runMigrations(db, dir);
      runMigrations(db, dir);
      const count = db.prepare("SELECT COUNT(*) as n FROM _migrations").get() as { n: number };
      expect(count.n).toBe(1);
    });
  });

  it("applies multiple migrations in numeric order", () => {
    withTempDb(db => {
      const dir = mkdtempSync(join(tmpdir(), "cs-mig-"));
      writeFileSync(join(dir, "002_add.sql"), "ALTER TABLE foo ADD COLUMN bar TEXT;");
      writeFileSync(join(dir, "001_init.sql"), "CREATE TABLE foo (id INTEGER);");
      runMigrations(db, dir);
      const cols = db.prepare("PRAGMA table_info(foo)").all() as Array<{name:string}>;
      expect(cols.map(c => c.name)).toEqual(["id", "bar"]);
    });
  });

  it("applies the real 001_initial.sql successfully", () => {
    withTempDb(db => {
      const dir = mkdtempSync(join(tmpdir(), "cs-mig-"));
      const real = readFileSync(join(__dirname, "../../migrations/001_initial.sql"), "utf8");
      writeFileSync(join(dir, "001_initial.sql"), real);
      expect(() => runMigrations(db, dir)).not.toThrow();
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as Array<{name:string}>;
      const names = tables.map(t => t.name);
      expect(names).toContain("nodes");
      expect(names).toContain("cats");
      expect(names).toContain("mac_bindings");
      expect(names).toContain("raw_events");
      expect(names).toContain("room_states");
      expect(names).toContain("room_centroids");
      expect(names).toContain("node_health");
      expect(names).toContain("_migrations");
    });
  });
});
