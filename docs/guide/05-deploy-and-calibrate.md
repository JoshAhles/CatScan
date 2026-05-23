# Step 5: Deploy and Calibrate

Now you'll place the ESP32 nodes around your home, attach the Tile Stickers to your cats' collars, and teach the system what each room "looks like" in terms of Bluetooth signal.

---

## Place the ESP32 nodes

Plug each ESP32 into a USB power adapter and place one in each room you want to track.

**Placement tips:**
- **Elevated is better** — a shelf or desk is better than the floor. BLE signals travel better with line-of-sight.
- **Away from metal** — don't place them behind metal furniture or inside metal cabinets.
- **One per room** — you need at least one node in each room you want to distinguish. The more rooms, the more nodes.
- **Don't worry about exact positioning** — calibration handles the rest.

**Verify all nodes are online:** Open the CatScan dashboard. The header should show `5/5 NODES` (or however many you placed). If a node shows offline, check its power connection.

---

## Attach Tile Stickers to collars

1. Pull the battery tab on each Tile Sticker (if it has one).
2. Optionally, set up the Tiles in the Tile app on your phone — this isn't required for CatScan, but gives you a backup way to find your cats via the Tile crowd network.
3. Attach each Tile to a cat collar using the adhesive backing or a small silicone holder.

---

## Pair each Tile to a cat

This tells CatScan which Tile belongs to which cat.

1. Open the dashboard: `http://<pi-ip>:8787`
2. Go to **Setup** → **Cats** tab.
3. You'll see your cats listed. Press **Pair Tile** next to the first cat.
4. A 60-second countdown starts. **Hold the Tile Sticker right next to any ESP32 node** (within a foot). The system will detect the strongest BLE signal and bind it to that cat.
5. Repeat for each cat.

**Don't have cats set up yet?** If the cats list is empty, you'll need to add them first via the API or directly in the SQLite database.

---

## Calibrate each room

Calibration teaches the system what the BLE signal pattern looks like from each room. This is the most important step for accuracy.

1. Go to **Setup** → **Calibrate** tab.
2. Pick up one Tile Sticker (or hold a cat, or just hold the Tile in your hand).
3. Walk to the first room.
4. Press **Start** next to that room's name.
5. **Walk slowly around the room** — cover the center, the corners, and near the doorways. The sample counter will tick up as data flows in.
6. When you've covered the room thoroughly (30+ seconds), press **Stop & Save**.
7. Repeat for every room.

**Calibration tips:**
- Walk at a normal pace — you don't need to stand still.
- Cover the whole room, not just the center. The system needs to know what the signal looks like from every spot a cat might sit.
- You only need one Tile for calibration — the signal pattern is about the room, not the specific tracker.
- **Recalibrate** if you move a node or rearrange furniture significantly. The button is always available in the Calibrate tab.

---

## Verify tracking

Go back to the **Live** tab. You should see your cats placed in rooms on the floor plan. Pick up a cat (or just the Tile) and walk it to another room — within ~10 seconds, the dashboard should show the transition.

If a cat shows in the wrong room consistently, recalibrate that room and the neighboring room.

---

## Next step

Move on to [Step 6: Using the Dashboard](06-dashboard.md).
