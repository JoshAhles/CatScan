import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runScenario } from "./harness";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "../../fixtures");
const GOLDEN = join(__dirname, "../../fixtures/golden");

const SCENARIOS = [
  "scenario-steady",
  "scenario-transition",
  "scenario-silence",
  "scenario-rotation-clean",
  "scenario-rotation-huddled",
  "scenario-rotation-staggered",
  "scenario-node-flap",
];

const WRITE_GOLDEN = process.env["WRITE_GOLDEN"] === "1";

function normalize(s: string) {
  return s
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const e = JSON.parse(l);
      // Strip all timestamp-like fields that vary run-to-run
      return JSON.stringify({ ...e, ts: 0, at: 0, since: 0, lastSeen: 0 });
    });
}

describe.each(SCENARIOS)("E2E %s", (name) => {
  it("WebSocket output matches the golden file", async () => {
    const inputPath = join(FIXTURES, `${name}.mqtt.jsonl`);
    const goldenPath = join(GOLDEN, `${name}.events.jsonl`);

    const input = readFileSync(inputPath, "utf8");
    const observed = await runScenario(input);

    if (WRITE_GOLDEN) {
      mkdirSync(GOLDEN, { recursive: true });
      writeFileSync(goldenPath, observed + "\n");
      console.log(`Wrote golden: ${goldenPath}`);
      return;
    }

    if (!existsSync(goldenPath)) {
      throw new Error(
        `Golden file not found: ${goldenPath}\nRun with WRITE_GOLDEN=1 to generate it.`
      );
    }

    const golden = readFileSync(goldenPath, "utf8");
    expect(normalize(observed)).toEqual(normalize(golden));
  });
});
