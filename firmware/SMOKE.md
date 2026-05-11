# CatScan Firmware Smoke Checklist

Run this checklist after every firmware change that touches BLE scanning, MQTT publishing, or the connection state machine. Each box represents a manual verification.

## Setup
- [ ] `firmware/include/secrets.h` exists and contains real WiFi + MQTT credentials.
- [ ] Pi 3B is running Mosquitto with the same credentials.
- [ ] An AirTag is **physically separated from its paired iPhone** (move the phone to another room or airplane-mode it for the duration of the smoke).

## Flash
- [ ] `pio run -e esp32dev -t upload --upload-port /dev/cu.usbserial-XXXX` succeeds.
- [ ] `pio device monitor -b 115200` shows the boot banner: `CatScan node node-XXXXXXXX booting`.

## Connectivity
- [ ] Serial monitor shows WiFi connect (WL_CONNECTED).
- [ ] On the Pi: `mosquitto_sub -t 'catscan/health/+' -u catscan -P <password>` prints `online` from the new node within 30 seconds.
- [ ] On the Pi: `mosquitto_sub -t 'catscan/raw/+' -u catscan -P <password>` prints valid JSON within 60 seconds of the AirTag entering range (~5 m).

## Wire-format validation
- [ ] Each JSON payload matches the §6.4 schema: `n`, `m`, `r`, optional `t`.
- [ ] `n` matches the format `node-XXXXXXXX` (uppercase hex).
- [ ] `m` is an uppercase colon-separated MAC.
- [ ] `r` is a negative integer between -120 and 0.

## Recovery
- [ ] Power-cycle the broker. The ESP32 reconnects within 60 seconds and resumes publishing.
- [ ] Take the AirTag out of range; the publish stream stops within ~5 seconds. Bring it back; resumes within ~5 seconds.
