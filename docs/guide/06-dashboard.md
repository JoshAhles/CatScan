# Step 6: Using the Dashboard

The CatScan dashboard is a web app served from your Raspberry Pi. Open it from any device on your home network:

```
http://<pi-ip>:8787
```

Bookmark it on your phone for quick access.

---

## Live view

The main screen shows a floor plan of your home with cat avatars positioned in the room they're currently in.

- **Cat avatars** move between rooms in real time with smooth animations.
- **Radar rings** pulse around each cat — faster when actively tracked, slower when signal is fading.
- **Solo cats** get a larger avatar; when two cats share a room, they shrink and spread apart.
- **Silent indicator** — if a cat's tracker hasn't been seen for 60 seconds, it shows as "SILENT" with the last known room.

**On mobile,** cat cards appear as a compact strip above the floor plan showing each cat's current room and how long they've been there.

**On desktop,** a left panel shows detailed cat cards, and a right panel shows live RSSI (signal strength) readings from each node.

The **Activity Log** at the bottom shows a real-time feed of events: room transitions, node health changes, and sleep detection.

---

## Heatmap view

Switch to the **Heatmap** tab to see where your cats spend the most time.

- **Cat filter** — view both cats together, or select one.
- **Time window** — 24 hours, 7 days, or 30 days.
- **Room intensity** — brighter rooms = more time spent there.

The heatmap builds up over time. After a day or two of tracking, you'll start seeing clear patterns — favorite napping spots, meal-time kitchen visits, etc.

---

## Setup view

The **Setup** tab has two sections:

### Cats
- View your registered cats.
- **Pair Tile** — bind a Tile Sticker to a cat (hold the Tile near any node during the countdown).

### Calibrate
- **Start** calibration for a room, walk around it, then **Stop & Save**.
- **Recalibrate** any room at any time if tracking accuracy drops.

---

## Cat detail panel

Tap on any cat (on the floor plan or in the cat cards) to open a detail panel showing:

- **Live RSSI** — signal strength from each node, updated every second.
- **Today's timeline** — a color-coded bar showing which rooms the cat has been in today.
- **Heat signature** — a mini heatmap for that cat over the last 7 days.
- **Recent transitions** — the last several room changes.

---

## Tips

- **Accuracy depends on calibration.** If a cat consistently shows in the wrong room, recalibrate both that room and the neighboring one.
- **The system self-heals.** If a Tile's BLE address rotates, the server detects the orphaned binding and re-binds within ~15 seconds. You don't need to do anything.
- **Power outages are fine.** All ESP32 nodes automatically reconnect to WiFi and MQTT on power restore. The Pi's server starts on boot via systemd.
- **Access from outside your home** — CatScan only runs on your local network. For remote access, set up a VPN (like Tailscale) or a reverse proxy. Don't expose port 8787 directly to the internet.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cat shows "SILENT" | Check the Tile's battery. Check that the nearest node is online (header shows X/Y nodes). |
| Wrong room | Recalibrate both the displayed room and the actual room. |
| Node offline | Power-cycle it (unplug/replug). It reconnects automatically within 30 seconds. |
| Dashboard won't load | Verify the Pi is running: `ssh` in and run `systemctl status catscan`. |
| All cats in one room | Calibration data may be stale. Recalibrate all rooms. |

---

## You're done!

CatScan is now tracking your cats 24/7. The heatmaps will fill in over the coming days as the system accumulates data. Enjoy knowing exactly where your cats are.
