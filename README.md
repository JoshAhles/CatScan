# CatScan

Indoor cat location tracking using ESP32 BLE sniffers + Apple AirTags on a Raspberry Pi 3B.

**Full design spec:** [docs/superpowers/specs/2026-05-11-catscan-design.md](docs/superpowers/specs/2026-05-11-catscan-design.md)

---

## Hardware

| Qty | Item |
|-----|------|
| 6 | ESP32 dev boards (one per room / hallway) |
| 1 | Raspberry Pi 3B (server + MQTT broker) |
| N | Apple AirTags (one per cat) |

---

## Pi prep

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

`pnpm setup` runs `scripts/setup.mjs` which:

1. Prompts for Mosquitto password, WiFi credentials, and timezone.
2. Generates a fresh `CATSCAN_TOKEN` and writes `.env`.
3. Writes `mosquitto.passwd` (requires `mosquitto_passwd` from the `mosquitto-clients` package).
4. Writes `/etc/mosquitto/conf.d/catscan.conf` (requires root; prints instructions otherwise).
5. Builds server + web.
6. Updates `scripts/catscan.service` with your timezone.
7. If running as root: `systemctl enable --now catscan`.

After setup, the dashboard is available at `http://<pi-ip>:8787`.

---

## ESP32 firmware

**PlatformIO** is required to build and flash the firmware:

```sh
pip install platformio
# or on macOS:
brew install platformio
```

Firmware flashing steps and smoke test: [firmware/SMOKE.md](firmware/SMOKE.md)

Credentials go in `firmware/include/secrets.h` (gitignored). `pnpm setup` prints the values to fill in.

---

## Install ceremony

Full step-by-step ceremony (node naming, AirTag pairing, walk-through calibration): see spec **§13**.

---

## Tuning constants

Runtime tuning constants live in `server/src/orchestrator/Orchestrator.ts` (constructor defaults):

| Constant | Default | Description |
|----------|---------|-------------|
| `alpha` | `0.2` | EMA smoothing factor (0 = no smoothing, 1 = no history) |
| `hysteresisDbm` | `5` | Euclidean-dBm margin required before switching rooms |
| `staleSentinelDbm` | `-100` | Imputed RSSI when a node is silent |

---

## Daily backup (optional)

Add to root crontab (`sudo crontab -e`):

```
0 3 * * * /opt/catscan/scripts/backup-db.sh
```

Keeps the last 14 backups in `$CATSCAN_BACKUP_DIR` (default: `/opt/catscan/data/backups`).

---

## License

TBD
