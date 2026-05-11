#!/usr/bin/env node
/**
 * CatScan install ceremony script.
 * Run:  pnpm setup           (interactive)
 *       pnpm setup --dry-run (print plan, no changes)
 *
 * Responsibilities:
 *  1. Prompt for Mosquitto password, WiFi SSID + pass, timezone
 *  2. Generate CATSCAN_TOKEN and write .env
 *  3. Write mosquitto.passwd via mosquitto_passwd
 *  4. Write /etc/mosquitto/conf.d/catscan.conf (requires root)
 *  5. Build server + web
 *  6. Render scripts/catscan.service with user TZ
 *  7. If root: systemctl daemon-reload + enable --now catscan
 */

import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");
const IS_ROOT = process.getuid?.() === 0;

// ── helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(msg + "\n");
}

function dryLog(msg) {
  log(`  [dry-run] ${msg}`);
}

function run(cmd, opts = {}) {
  if (DRY_RUN) {
    dryLog(`would run: ${cmd}`);
    return;
  }
  execSync(cmd, { stdio: "inherit", ...opts });
}

function writeFile(path, content, mode) {
  if (DRY_RUN) {
    dryLog(`would write: ${path}`);
    return;
  }
  writeFileSync(path, content, { encoding: "utf8" });
  if (mode) chmodSync(path, mode);
}

async function prompt(rl, question, { secret = false } = {}) {
  if (secret && process.stdin.isTTY) {
    // hide input for passwords
    process.stdout.write(question);
    return new Promise((resolve) => {
      let val = "";
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding("utf8");
      function onData(ch) {
        if (ch === "\n" || ch === "\r" || ch === "") {
          stdin.setRawMode(wasRaw);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          if (ch === "") process.exit(1);
          resolve(val);
        } else if (ch === "") {
          val = val.slice(0, -1);
        } else {
          val += ch;
        }
      }
      stdin.on("data", onData);
    });
  }
  return rl.question(question);
}

// ── collect user input ────────────────────────────────────────────────────────

async function collectInputs() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  log("\n=== CatScan Setup ===\n");

  const mqttUser = "catscan";

  const mqttPass = await prompt(rl, "Mosquitto password for 'catscan' user: ", {
    secret: true,
  });
  if (!mqttPass.trim()) {
    log("ERROR: password cannot be empty.");
    process.exit(1);
  }

  const wifiSsid = await rl.question("WiFi SSID: ");
  const wifiPass = await prompt(rl, "WiFi password: ", { secret: true });

  let tz = await rl.question(
    "Timezone (e.g. America/Phoenix) [America/Phoenix]: "
  );
  if (!tz.trim()) tz = "America/Phoenix";

  rl.close();

  return { mqttUser, mqttPass, wifiSsid, wifiPass, tz };
}

// ── step functions ────────────────────────────────────────────────────────────

function generateToken() {
  return randomBytes(24).toString("hex");
}

function writeEnvFile(token, mqttUser, mqttPass) {
  const envPath = join(ROOT, ".env");
  let existing = "";
  if (existsSync(envPath)) {
    existing = readFileSync(envPath, "utf8");
  }

  // Build a map of existing vars so we can preserve unknowns
  const lines = existing.split("\n").filter(Boolean);
  const vars = new Map();
  for (const line of lines) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) vars.set(m[1], m[2]);
  }

  vars.set("CATSCAN_TOKEN", token);
  vars.set("MQTT_USERNAME", mqttUser);
  vars.set("MQTT_PASSWORD", mqttPass);
  if (!vars.has("CATSCAN_DB")) {
    vars.set("CATSCAN_DB", "/opt/catscan/data/catscan.db");
  }
  if (!vars.has("PORT")) {
    vars.set("PORT", "8787");
  }

  const content =
    Array.from(vars.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("\n") + "\n";

  log("\n[1/6] Writing .env ...");
  writeFile(envPath, content);
  if (!DRY_RUN) log("      .env written.");
}

function writeMosquittoPasswd(mqttUser, mqttPass) {
  log("\n[2/6] Writing mosquitto.passwd ...");
  const passwdPath = join(ROOT, "mosquitto.passwd");

  // Check for mosquitto_passwd binary
  const check = spawnSync("which", ["mosquitto_passwd"], {
    encoding: "utf8",
  });
  if (check.status !== 0) {
    log(
      "ERROR: mosquitto_passwd not found. Install Mosquitto first:\n" +
        "       sudo apt install mosquitto mosquitto-clients\n" +
        "Then re-run pnpm setup."
    );
    if (!DRY_RUN) process.exit(1);
    dryLog("would invoke: mosquitto_passwd -c -b mosquitto.passwd catscan <pass>");
    return;
  }

  if (DRY_RUN) {
    dryLog(
      `would run: mosquitto_passwd -c -b ${passwdPath} ${mqttUser} ***`
    );
    return;
  }

  const result = spawnSync(
    "mosquitto_passwd",
    ["-c", "-b", passwdPath, mqttUser, mqttPass],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    log(`ERROR running mosquitto_passwd:\n${result.stderr}`);
    process.exit(1);
  }
  log(`      ${passwdPath} written.`);
}

function writeMosquittoConf() {
  log("\n[3/6] Writing /etc/mosquitto/conf.d/catscan.conf ...");
  const confDest = "/etc/mosquitto/conf.d/catscan.conf";
  const confSrc = join(__dirname, "mosquitto-catscan.conf");

  if (!existsSync(confSrc)) {
    log(`ERROR: template not found at ${confSrc}`);
    if (!DRY_RUN) process.exit(1);
    return;
  }

  const content = readFileSync(confSrc, "utf8");

  if (!IS_ROOT) {
    log("      (not root — skipping write to /etc/mosquitto/conf.d/)");
    log("      To apply manually, run:");
    log(`        sudo cp ${confSrc} ${confDest}`);
    log(`        sudo systemctl restart mosquitto`);
    return;
  }

  writeFile(confDest, content);
  if (!DRY_RUN) {
    run("systemctl restart mosquitto");
    log("      mosquitto restarted.");
  }
}

function printSecretsHint(wifiSsid, wifiPass, mqttPass) {
  log("\n[4/6] Firmware secrets hint ...");
  log("      Copy firmware/include/secrets.example.h → firmware/include/secrets.h");
  log("      Then fill in:");
  log(`        CATSCAN_WIFI_SSID  "${wifiSsid}"`);
  log(`        CATSCAN_WIFI_PASS  "${wifiPass}"`);
  log(`        CATSCAN_MQTT_PASS  "${mqttPass}"`);
  log("      (secrets.h is gitignored — never commit it)");
}

function buildProject() {
  log("\n[5/6] Building server + web ...");
  run("pnpm --filter ./server build", { cwd: ROOT });
  run("pnpm --filter ./web build", { cwd: ROOT });
  if (!DRY_RUN) log("      Build complete.");
}

function renderServiceFile(tz) {
  log("\n[6/6] Writing scripts/catscan.service ...");
  const servicePath = join(__dirname, "catscan.service");

  if (!existsSync(servicePath)) {
    log(`ERROR: service template not found at ${servicePath}`);
    if (!DRY_RUN) process.exit(1);
    return;
  }

  let content = readFileSync(servicePath, "utf8");
  // Replace the TZ line with the user-supplied timezone
  content = content.replace(
    /^Environment=TZ=.+$/m,
    `Environment=TZ=${tz}`
  );

  writeFile(servicePath, content);
  if (!DRY_RUN) log(`      catscan.service updated with TZ=${tz}.`);

  if (IS_ROOT) {
    log("      Enabling catscan service ...");
    run("systemctl daemon-reload");
    run("systemctl enable --now catscan");
    if (!DRY_RUN) log("      catscan service enabled and started.");
  } else {
    log("      (not root — skipping systemctl)");
    log("      To enable manually, run:");
    log(`        sudo cp ${servicePath} /etc/systemd/system/catscan.service`);
    log("        sudo systemctl daemon-reload");
    log("        sudo systemctl enable --now catscan");
  }
}

// ── cron reminder ─────────────────────────────────────────────────────────────

function printCronReminder() {
  log("\n=== Optional: daily backup cron ===");
  log("  Add to root crontab (sudo crontab -e):");
  log("    0 3 * * * /opt/catscan/scripts/backup-db.sh");
}

// ── dry-run plan ──────────────────────────────────────────────────────────────

function printDryRunHeader(inputs) {
  log("\n=== DRY RUN — no changes will be made ===\n");
  log(`  Mosquitto user : catscan`);
  log(`  WiFi SSID      : ${inputs.wifiSsid}`);
  log(`  Timezone       : ${inputs.tz}`);
  log(`  CATSCAN_TOKEN  : <will be generated>`);
  log(`  Running as root: ${IS_ROOT}`);
  log("");
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const inputs = await collectInputs();
  const token = generateToken();

  if (DRY_RUN) printDryRunHeader(inputs);

  writeEnvFile(token, inputs.mqttUser, inputs.mqttPass);
  writeMosquittoPasswd(inputs.mqttUser, inputs.mqttPass);
  writeMosquittoConf();
  printSecretsHint(inputs.wifiSsid, inputs.wifiPass, inputs.mqttPass);
  buildProject();
  renderServiceFile(inputs.tz);
  printCronReminder();

  log("\n=== Setup complete ===\n");
  if (!DRY_RUN) {
    log("Next steps:");
    log("  1. Copy firmware/include/secrets.example.h → secrets.h and fill in.");
    log("  2. Flash each ESP32: pio run -e esp32dev -t upload");
    log("  3. Check dashboard at http://<pi-ip>:8787");
  }
}

main().catch((err) => {
  log(`\nFATAL: ${err.message}`);
  process.exit(1);
});
