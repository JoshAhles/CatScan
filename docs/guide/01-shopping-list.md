# Step 1: Shopping List

Everything you need to build CatScan. Most items are available on Amazon and ship in a day or two.

---

## The brain: Raspberry Pi

You need one Raspberry Pi to run the server. It stays plugged in 24/7.

| Item | Notes |
|------|-------|
| **Raspberry Pi 3B+** (or newer: 4, 5) | Any model with WiFi works. The 3B+ is the cheapest option. |
| **microSD card** (16GB or larger) | This is where the Pi's operating system lives. |
| **USB-C or micro-USB power supply** (for the Pi) | 5V/2.5A minimum. Most Pi kits include one. |
| **Ethernet cable** (optional) | Wired connection is more reliable than WiFi, but WiFi works fine. |

**Tip:** Starter kits that include the Pi + case + power supply + SD card are the easiest way to buy everything at once.

---

## The scanners: ESP32 boards

You need one ESP32 per room you want to track. These are small, cheap microcontrollers that listen for Bluetooth signals.

| Item | Notes |
|------|-------|
| **ESP32 dev boards** (1 per room) | Any ESP32 board works — the most common is the "ESP32-DevKitC" or "ESP32-WROOM-32". Available in bulk packs of 3-5 for cheaper. |
| **micro-USB cables** (1 per board) | For power. Any phone charger cable works. |
| **USB power adapters** (1 per board) | Any 5V USB charger — old phone chargers are perfect. |

**How many do I need?** One per room you want to track. 5 rooms = 5 boards. You don't need one in every room of your house — just the rooms your cats spend time in.

---

## The trackers: Tile Stickers

These attach to your cats' collars and broadcast a Bluetooth signal that the ESP32 nodes pick up.

| Item | Notes |
|------|-------|
| **Tile Stickers** (1 per cat) | Small, lightweight (~5g), 3-year sealed battery. Attaches to a collar with adhesive or a silicone holder. |
| **Cat collars** | Any standard breakaway cat collar works. |

**Why Tile Stickers?** They're tiny (the size of a button), lightweight enough for a cat collar, and broadcast a reliable BLE signal. They don't require an iPhone nearby to work with CatScan (unlike AirTags).

---

## For flashing the ESP32s: a computer with USB

You'll need a computer (Mac, Windows, or Linux) with a USB port to flash the firmware onto each ESP32 board. This is a one-time setup step — you plug each board in, flash it, then place it in a room.

---

## Summary

For a typical 2-cat, 5-room setup:

| Item | Qty | ~Price |
|------|-----|--------|
| Raspberry Pi 3B+ kit | 1 | $55 |
| ESP32 dev boards (5-pack) | 1 | $35 |
| Tile Stickers (2-pack) | 1 | $45 |
| micro-USB cables | 5 | $10 |
| USB chargers | 5 | $15 |
| Cat collars | 2 | $10 |
| **Total** | | **~$170** |

Once you have everything, move on to [Step 2: Raspberry Pi Setup](02-pi-setup.md).
