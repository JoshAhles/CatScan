#!/usr/bin/env node
// Adds .js extensions to relative imports in compiled dist/ so plain Node ESM
// can resolve them. tsc with moduleResolution=Bundler emits extensionless
// specifiers; Node ESM requires explicit extensions at runtime.

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, "../dist");

const RE = /(\bfrom\s+|\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']+)\2/g;

function fixFile(file) {
  const src = readFileSync(file, "utf8");
  const baseDir = dirname(file);
  const out = src.replace(RE, (match, kw, quote, spec) => {
    if (/\.[a-zA-Z0-9]+$/.test(spec)) return match;
    const abs = resolve(baseDir, spec);
    let target = spec;
    if (existsSync(abs) && statSync(abs).isDirectory()) target = `${spec}/index.js`;
    else target = `${spec}.js`;
    return `${kw}${quote}${target}${quote}`;
  });
  if (out !== src) writeFileSync(file, out);
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (full.endsWith(".js")) fixFile(full);
  }
}

walk(DIST);
