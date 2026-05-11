import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FILE_RE = /^(\d+)_.+\.sql$/;

export function runMigrations(db: Database.Database, migrationsDir: string): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`);

  const files = readdirSync(migrationsDir)
    .filter(f => FILE_RE.test(f))
    .map(f => ({ name: f, version: Number(f.match(FILE_RE)![1]) }))
    .sort((a, b) => a.version - b.version);

  const appliedRows = db.prepare("SELECT version FROM _migrations").all() as Array<{version:number}>;
  const applied = new Set(appliedRows.map(r => r.version));

  const insert = db.prepare("INSERT INTO _migrations (version, applied_at) VALUES (?, ?)");

  for (const f of files) {
    if (applied.has(f.version)) continue;
    const sql = readFileSync(join(migrationsDir, f.name), "utf8");
    const tx = db.transaction(() => {
      db.exec(sql);
      insert.run(f.version, Math.floor(Date.now() / 1000));
    });
    tx();
  }
}
