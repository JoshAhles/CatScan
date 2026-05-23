# Step 3: Install CatScan

This step installs the CatScan server on your Raspberry Pi. After this, you'll have a working dashboard.

---

## Clone the repository

On the Pi (via SSH):

```sh
sudo mkdir -p /opt/catscan
sudo chown $USER:$USER /opt/catscan
git clone https://github.com/JoshAhles/CatScan.git /opt/catscan
cd /opt/catscan
```

---

## Install and configure

```sh
pnpm install
pnpm setup
```

The setup script will ask you a few questions:

1. **Mosquitto password** — make up a password for the MQTT broker (the ESP32 nodes will use this to talk to the Pi). Write it down — you'll need it when flashing the ESP32s.
2. **WiFi SSID and password** — your home WiFi network (the ESP32 nodes connect to this). Must be a 2.4GHz network — ESP32 boards don't support 5GHz.
3. **Timezone** — e.g., `America/New_York`, `America/Phoenix`, `Europe/London`.

The script will:
- Generate a secret token for the dashboard.
- Configure the MQTT broker.
- Build the server and web dashboard.
- Install a systemd service so CatScan starts automatically on boot.

---

## Verify it's running

```sh
systemctl status catscan
```

You should see `active (running)`. The dashboard is now live at:

```
http://<your-pi-ip>:8787
```

Find your Pi's IP with `hostname -I`. Open that URL in a browser on your phone or computer. You should see the CatScan dashboard (it'll be empty until you set up the ESP32 nodes).

---

## Auto-deploy (optional)

The setup script also installs an auto-deploy timer that checks for updates every 5 minutes. If you push changes to the repo, the Pi will automatically pull, rebuild, and restart. You can disable this if you prefer manual updates:

```sh
sudo systemctl disable catscan-deploy.timer
```

---

## Next step

Move on to [Step 4: Flash the ESP32 Nodes](04-flash-nodes.md).
