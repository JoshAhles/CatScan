# CatScan

Know where your cats are, room by room, in real time.

CatScan uses small BLE scanner nodes placed around your home to track Tile Sticker trackers on your cats' collars. A Raspberry Pi runs the brain — processing signals, deciding which room each cat is in, and serving a live dashboard you can check from your phone.

<!-- Add a screenshot of your dashboard here -->
<!-- ![Dashboard](docs/guide/images/dashboard.png) -->

---

## What you get

- **Live room tracking** — see which room each cat is in, updated every second
- **Room transitions** — get notified when a cat moves between rooms
- **Heatmaps** — see where your cats spend the most time over days and weeks
- **Sleep detection** — know when a cat has been in one spot for a long time
- **Self-healing** — handles Tile BLE address rotation automatically, survives power outages and reboots

## What you need

| Item | Qty | Approx cost |
|------|-----|-------------|
| Raspberry Pi 3B+ or newer | 1 | $35-55 |
| ESP32 dev boards | 1 per room | ~$7 each |
| Tile Stickers | 1 per cat | ~$25 each |
| USB power adapters + micro-USB cables | 1 per ESP32 | ~$5 each |
| microSD card (16GB+) | 1 (for Pi) | ~$8 |
| Cat collars | 1 per cat | ~$5 each |

**Total for 2 cats, 5 rooms: ~$130**

---

## Setup guide

New to this? Follow the step-by-step guide — it covers everything from purchasing to a working dashboard:

1. **[Shopping list](docs/guide/01-shopping-list.md)** — exactly what to buy
2. **[Raspberry Pi setup](docs/guide/02-pi-setup.md)** — flash the OS, install dependencies
3. **[Install CatScan](docs/guide/03-install-software.md)** — clone, configure, and start the server
4. **[Flash the ESP32 nodes](docs/guide/04-flash-nodes.md)** — install PlatformIO, flash each board
5. **[Deploy and calibrate](docs/guide/05-deploy-and-calibrate.md)** — place nodes, pair Tiles, calibrate rooms
6. **[Using the dashboard](docs/guide/06-dashboard.md)** — live view, heatmaps, setup tools

---

## Architecture

```
  Cat collar          Your home            Raspberry Pi         Your phone
 ┌──────────┐      ┌──────────┐         ┌──────────────┐     ┌──────────┐
 │   Tile   │~BLE~>│  ESP32   │--WiFi-->│ MQTT broker  │     │ Dashboard│
 │ Sticker  │      │  node    │         │ CatScan      │<--->│  (web)   │
 └──────────┘      │ (1/room) │         │  server      │     └──────────┘
                   └──────────┘         │ SQLite DB    │
                                        └──────────────┘
```

---

## Project structure

```
firmware/     ESP32 scanner firmware (PlatformIO/Arduino)
server/       Node.js server (TypeScript) — MQTT, room detection, API
web/          React dashboard (Vite, TypeScript)
scripts/      Setup and deployment helpers
docs/guide/   Step-by-step setup guide
```

---

## For developers

If you're already comfortable with PlatformIO, Node.js, and Raspberry Pi:

```sh
# On the Pi
git clone https://github.com/JoshAhles/CatScan.git /opt/catscan
cd /opt/catscan
pnpm install && pnpm setup

# On your computer (per ESP32)
cd firmware
cp include/secrets.example.h include/secrets.h  # fill in credentials
pio run -e esp32dev -t upload
```

See [Tuning constants](#tuning) and [Tile MAC rotation](#mac-rotation) below for details.

<a name="tuning"></a>
### Tuning constants

In `server/src/orchestrator/Orchestrator.ts`:

| Constant | Default | What it does |
|----------|---------|-------------|
| `alpha` | `0.2` | Signal smoothing (higher = more responsive, noisier) |
| `hysteresisDbm` | `5` | Signal margin required to switch rooms |
| `hysteresisTicks` | `3` | Consecutive readings needed to confirm a room change |
| `silentSeconds` | `60` | Seconds without signal before marking a cat as "silent" |
| `rssiBroadcastIntervalMs` | `1000` | Dashboard refresh rate |

<a name="mac-rotation"></a>
### Tile MAC rotation

Tile Stickers use BLE Random Static addresses that rotate periodically. CatScan handles this automatically — when a bound MAC disappears and a new unbound MAC appears, the system re-binds within ~15 seconds. If both cats rotate simultaneously, RSSI fingerprint matching resolves which is which.

---

## License

MIT
