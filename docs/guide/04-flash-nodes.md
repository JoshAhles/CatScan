# Step 4: Flash the ESP32 Nodes

Each ESP32 board needs to be flashed with the CatScan firmware. This is done from your computer (not the Pi), one board at a time.

---

## Install PlatformIO

PlatformIO is the tool that compiles and uploads the firmware. On your computer:

**macOS:**
```sh
brew install platformio
```

**Windows/Linux:**
```sh
pip install platformio
```

Or install the [PlatformIO IDE extension](https://platformio.org/install/ide) for VS Code.

---

## Set up credentials

The ESP32 needs to know your WiFi password and the MQTT broker address. These go in a secrets file that stays on your computer (it's gitignored — never uploaded to GitHub).

```sh
cd firmware
cp include/secrets.example.h include/secrets.h
```

Open `include/secrets.h` in a text editor and fill in:

```c
#define CATSCAN_WIFI_SSID     "your-wifi-name"      // 2.4GHz only
#define CATSCAN_WIFI_PASS     "your-wifi-password"
#define CATSCAN_MQTT_HOST     "192.168.1.10"         // Your Pi's IP address
#define CATSCAN_MQTT_PORT     1883
#define CATSCAN_MQTT_USER     "catscan"
#define CATSCAN_MQTT_PASS     "the-password-from-step-3"
#define CATSCAN_NTP_HOST      "pool.ntp.org"
```

**Important:** Use your Pi's actual IP address for `CATSCAN_MQTT_HOST`. Find it by running `hostname -I` on the Pi.

---

## Flash each board

1. Plug an ESP32 board into your computer via USB.
2. Find the USB port:
   - **macOS:** `ls /dev/cu.usb*` — look for something like `/dev/cu.usbserial-0001`
   - **Windows:** Check Device Manager for a COM port (e.g., `COM3`)
   - **Linux:** `ls /dev/ttyUSB*`
3. Flash:

```sh
pio run -e esp32dev -t upload --upload-port /dev/cu.usbserial-0001
```

(Replace the port with yours.)

4. Verify — open the serial monitor:

```sh
pio device monitor -b 115200
```

You should see:
```
CatScan node node-XXXXXXXX booting
Waiting for WiFi. connected
```

Each board gets a unique node ID based on its hardware. You don't need to configure anything per-board — they're all identical.

5. **Unplug and repeat** for each ESP32 board.

---

## Tips

- **WiFi trouble?** The ESP32 only supports 2.4GHz WiFi. If your router has separate 2.4GHz and 5GHz networks, use the 2.4GHz one. If they're combined, it should work automatically.
- **Upload failed?** Hold the "BOOT" button on the ESP32 while starting the upload.
- **Can't find the USB port?** Try unplugging and re-plugging the board, then check for new devices.

---

## Next step

Move on to [Step 5: Deploy and Calibrate](05-deploy-and-calibrate.md).
