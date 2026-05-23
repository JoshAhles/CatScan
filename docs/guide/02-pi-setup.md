# Step 2: Raspberry Pi Setup

This step gets your Raspberry Pi ready to run CatScan. You'll install the operating system and the software it depends on.

---

## Flash the SD card

1. Download **[Raspberry Pi Imager](https://www.raspberrypi.com/software/)** on your computer.
2. Insert the microSD card into your computer.
3. Open Raspberry Pi Imager and choose:
   - **OS:** Raspberry Pi OS Lite (32-bit) — the version without a desktop, since this Pi runs headless (no monitor).
   - **Storage:** Your microSD card.
4. Click the **gear icon** (⚙️) before writing to pre-configure:
   - **Enable SSH** — so you can connect remotely.
   - **Set username and password** — pick something you'll remember (e.g., username: `catscan`).
   - **Configure WiFi** — enter your home WiFi network name and password.
   - **Set locale** — your timezone.
5. Click **Write** and wait for it to finish.

---

## Boot the Pi

1. Insert the SD card into the Pi.
2. Plug in Ethernet (optional but recommended for initial setup).
3. Plug in power.
4. Wait ~60 seconds for it to boot.

---

## Connect via SSH

From your computer's terminal:

```sh
ssh catscan@raspberrypi.local
```

(Replace `catscan` with whatever username you chose. If `.local` doesn't work, find the Pi's IP address from your router's admin page.)

You should see a command prompt. You're in.

---

## Install dependencies

Run these commands on the Pi:

```sh
sudo apt update && sudo apt upgrade -y
```

This updates everything — it may take a few minutes.

Then install the tools CatScan needs:

```sh
sudo apt install -y build-essential python3 git sqlite3 mosquitto mosquitto-clients
```

Install Node.js (version 18 or newer):

```sh
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Install pnpm (the package manager CatScan uses):

```sh
sudo npm install -g pnpm
```

---

## Verify everything installed

```sh
node --version    # Should show v20.x or higher
pnpm --version    # Should show 9.x or higher
mosquitto -h      # Should show the Mosquitto help text
sqlite3 --version # Should show a version number
```

If all four commands produce output (not "command not found"), you're ready.

---

## Next step

Move on to [Step 3: Install CatScan](03-install-software.md).
