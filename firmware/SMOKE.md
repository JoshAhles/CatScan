# CatScan Firmware Smoke Checklist

Run this checklist after every firmware change that touches BLE scanning, MQTT publishing, or the connection state machine.

## Setup
- [ ] `firmware/include/secrets.h` exists and contains real WiFi + MQTT credentials.
- [ ] Raspberry Pi is running Mosquitto with the same credentials.
- [ ] A Tile Sticker is powered on and nearby.

## Flash
- [ ] `pio run -e esp32dev -t upload --upload-port /dev/cu.usbserial-XXXX` succeeds.
- [ ] `pio device monitor -b 115200` shows the boot banner: `CatScan node node-XXXXXXXX booting`.

## Connectivity
- [ ] Serial monitor shows WiFi connect (WL_CONNECTED).
- [ ] On the Pi: `mosquitto_sub -t 'catscan/health/+' -u catscan -P <password>` prints `online` from the new node within 30 seconds.
- [ ] On the Pi: `mosquitto_sub -t 'catscan/raw/+' -u catscan -P <password>` prints valid JSON within 60 seconds of the Tile entering range.

## Wire-format validation
- [ ] Each JSON payload matches: `{"n":"node-XXXXXXXX","m":"AA:BB:CC:DD:EE:FF","r":-65,"t":1234567890}`
- [ ] `n` matches the format `node-XXXXXXXX` (uppercase hex).
- [ ] `m` is an uppercase colon-separated MAC.
- [ ] `r` is a negative integer between -120 and 0.

## Recovery
- [ ] Power-cycle the broker. The ESP32 reconnects within 60 seconds and resumes publishing.
- [ ] Take the Tile out of range; the publish stream stops within ~5 seconds. Bring it back; resumes within ~5 seconds.
