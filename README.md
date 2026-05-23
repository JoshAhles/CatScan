# CatScan

Indoor cat location tracking using ESP32 BLE scanners, Tile Sticker trackers, and a Raspberry Pi.

Track which room your cats are in, see real-time transitions on a dashboard, and build up heatmaps of where they spend their time.

---

## How it works

1. **Tile Stickers** on cat collars broadcast BLE advertisements every ~2 seconds.
2. **ESP32 nodes** (one per room) passively scan for Tile advertisements and publish RSSI readings to an MQTT broker.
3. A **Raspberry Pi** runs the server — it smooths RSSI data, compares against calibrated room fingerprints, and determines which room each cat is in.
4. A **web dashboard** shows live positions on a floor plan, room transition history, and heatmaps.

The system handles Tile Sticker BLE MAC address rotation automatically via RSSI fingerprint matching — when a Tile's MAC changes, the server re-identifies it within seconds using the signal pattern across nodes.

---

## Hardware

| Qty | Item |
|-----|------|
| 1 per room | ESP32 dev boards (BLE scanner nodes) |
| 1 | Raspberry Pi 3B+ or newer (server + MQTT broker) |
| 1 per cat | Tile Sticker (BLE tracker, attaches to collar) |

---

## Architecture

```
Tile Sticker ~~BLE~~> ESP32 node --WiFi/MQTT--> Raspberry Pi (server)
                                                     |
                                                  SQLite DB
                                                     |
                                              Web Dashboard (React)
                                            http://<pi-ip>:8787
```

---

## Pi setup

Flash Raspberry Pi OS Lite (32-bit), SSH in, then:

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential python3 nodejs npm sqlite3 mosquitto mosquitto-clients
sudo npm i -g pnpm
```

Clone the repo:

```sh
sudo mkdir -p /opt/catscan
sudo chown $USER:$USER /opt/catscan
git clone <repo-url> /opt/catscan
cd /opt/catscan
```

---

## Install

```sh
pnpm install
pnpm setup
```

`pnpm setup` runs an interactive installer that:

1. Prompts for Mosquitto password, WiFi credentials, and timezone.
2. Generates a `CATSCAN_TOKEN` and writes `.env`.
3. Configures Mosquitto authentication.
4. Builds the server and web dashboard.
5. Installs and enables the systemd service.

After setup, the dashboard is available at `http://<pi-ip>:8787`.

---

## ESP32 firmware

[PlatformIO](https://platformio.org/) is required:

```sh
pip install platformio
```

1. Copy `firmware/include/secrets.example.h` to `firmware/include/secrets.h` and fill in your WiFi and MQTT credentials (`pnpm setup` prints the values).
2. Plug in an ESP32 via USB.
3. Flash:

```sh
cd firmware
pio run -e esp32dev -t upload --upload-port /dev/<your-usb-port>
```

Repeat for each ESP32 node. Each board auto-derives a unique node ID from its hardware MAC.

See [firmware/SMOKE.md](firmware/SMOKE.md) for a per-board smoke test checklist.

---

## Setup ceremony

Once hardware is deployed:

1. **Pair Tiles** — Dashboard > Setup > Cats. Press "Pair Tile" for each cat, hold the Tile Sticker near any ESP32 node.
2. **Calibrate rooms** — Dashboard > Setup > Calibrate. For each room, press Start, walk slowly around the room holding a Tile, press Stop & Save. This teaches the system the RSSI fingerprint of each room.

---

## Tuning constants

Runtime parameters in `server/src/orchestrator/Orchestrator.ts`:

| Constant | Default | Description |
|----------|---------|-------------|
| `alpha` | `0.2` | EMA smoothing factor (higher = more responsive, noisier) |
| `hysteresisDbm` | `5` | dBm margin required before switching rooms |
| `hysteresisTicks` | `3` | Consecutive readings needed to confirm a room change |
| `silentSeconds` | `60` | Seconds without readings before marking a cat as silent |
| `rssiBroadcastIntervalMs` | `1000` | How often RSSI updates are pushed to the dashboard |

---

## Tile MAC rotation

Tile Stickers use BLE Random Static addresses that may rotate periodically. CatScan handles this automatically:

- When a bound MAC goes silent and a new unbound MAC appears, the system re-binds within ~15 seconds.
- If both cats' MACs rotate simultaneously, RSSI fingerprint matching (Hungarian algorithm) resolves which is which.
- If cats are in the same room during rotation, the system assigns arbitrarily and self-corrects when they separate.

---

## Daily backup (optional)

```sh
sudo crontab -e
# Add:
0 3 * * * /opt/catscan/scripts/backup-db.sh
```

---

## Project structure

```
firmware/       ESP32 PlatformIO project (BLE scanner + MQTT publisher)
server/         Node.js server (MQTT ingestion, room decision, HTTP API, WebSocket)
web/            React dashboard (Vite, TypeScript)
scripts/        Setup and deployment scripts
```

---

## License

MIT
