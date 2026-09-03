# Integrations & Device Adapters

uplotr is designed to be **protocol-agnostic**. Regardless of whether your device runs on LoRaWAN, Cellular, Wi-Fi, or Bluetooth, as long as it can form an HTTP `POST` request, uplotr can track it.

This guide provides examples for integrating common ecosystems and devices directly into uplotr.

---

## 1. Apple Device (iOS / Shortcuts)

You can easily turn your iPhone or iPad into a tracked device using the built-in Shortcuts app. This is perfect for personal tracking without any extra hardware.

**Goal:** Send your location to uplotr whenever you arrive at or leave a specific location, or on a set schedule.

**Steps:**
1. Open the **Shortcuts** app on your iPhone.
2. Go to the **Automation** tab and tap the `+` to create a new Personal Automation.
3. Choose a trigger (e.g., "Time of Day", "Arrive", or "Leave").
4. Add the action **Get Current Location**.
5. Add the action **Get Contents of URL**.
6. Configure the URL Action:
   - **URL:** `https://your-uplotr-domain.com/api/v1/ingest`
   - **Method:** `POST`
   - **Headers:** Add a new header -> Key: `Authorization`, Value: `Bearer <YOUR_API_KEY>`
   - **Request Body:** Select `JSON` and add the following keys:
     - `device_id` (Text): `my-iphone`
     - `lat` (Number): Tap and select the variable `Location` -> `Latitude`.
     - `lon` (Number): Tap and select the variable `Location` -> `Longitude`.
     - `battery` (Number): Add action "Get Battery Level" beforehand and link it here (Optional).
     - `type` (Text): `ios`

Every time the automation runs, a new dot will appear on your uplotr map.

---

## 2. ESP32 / Arduino (Wi-Fi or Cellular)

For custom hardware makers, here is a minimal C++ snippet using the standard Arduino core for ESP32. This assumes your ESP32 already has a network connection (via Wi-Fi or a cellular modem like SIM7000/TinyGSM) and has acquired a GPS fix.

```cpp
#include <HTTPClient.h>

const char* serverName = "https://your-uplotr-domain.com/api/v1/ingest";
const char* apiKey = "YOUR_API_KEY";

void sendTelemetryToUplotr(float latitude, float longitude, int batteryPercent) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverName);
    
    // Required headers
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + apiKey);
    
    // Construct the standard JSON payload
    char jsonPayload[200];
    snprintf(jsonPayload, sizeof(jsonPayload), 
             "{\"device_id\":\"esp32-tracker-01\", \"lat\":%.6f, \"lon\":%.6f, \"battery\":%d, \"type\":\"wifi\"}", 
             latitude, longitude, batteryPercent);
             
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      Serial.printf("HTTP Response code: %d\n", httpResponseCode);
    } else {
      Serial.printf("Error code: %d\n", httpResponseCode);
    }
    http.end();
  }
}
```

---

## 3. Meshtastic (Long Range Radio)

Meshtastic nodes communicate over LoRa independently of the internet. To get their locations onto uplotr, you need a bridging node connected to Wi-Fi.

**Architecture:**
Meshtastic Node (LoRa) -> Meshtastic Gateway Node (Wi-Fi) -> MQTT Broker -> Python Bridge Script -> uplotr API

1. Configure your Meshtastic Gateway node to report to an MQTT broker. Ensure `Position` packets are being published.
2. Run a simple Python bridge on a Raspberry Pi or server listening to that MQTT topic.

**Python Bridge Example (`paho-mqtt` & `requests`):**

```python
import paho.mqtt.client as mqtt
import requests
import json

UPLOTR_URL = "https://your-uplotr-domain.com/api/v1/ingest"
UPLOTR_KEY = "Bearer YOUR_API_KEY"

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        
        # Filter for Meshtastic Position Packets
        if "position" in payload:
            pos = payload["position"]
            if "latitudeI" in pos and "longitudeI" in pos:
                data = {
                    "device_id": f"mesh-{payload['from']}",
                    "lat": pos["latitudeI"] / 1e7,
                    "lon": pos["longitudeI"] / 1e7,
                    "battery": payload.get("deviceMetrics", {}).get("batteryLevel", 0),
                    "type": "meshtastic"
                }
                
                # Push to uplotr
                requests.post(UPLOTR_URL, json=data, headers={"Authorization": UPLOTR_KEY})
                print(f"Forwarded node {data['device_id']}")
    except Exception as e:
        pass

client = mqtt.Client()
client.on_message = on_message
client.connect("your.mqtt.broker.com", 1883, 60)
client.subscribe("msh/+/+/Position")
client.loop_forever()
```

---

## 4. Raspberry Pi / Linux Host (Heartbeat Monitor)

You can use uplotr to track the health, status, or location (if using a USB GPS dongle) of Linux computers or Raspberry Pis in the field.

### A. Simple Heartbeat via Cron (Bash/Curl)
If the device doesn't move, but you want its online/offline status to stay current in uplotr, run this cron job every 5 minutes:

```bash
# Run `crontab -e` and add:
*/5 * * * * curl -X POST https://your-uplotr-domain.com/api/v1/ingest \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_API_KEY" \
-d '{
  "device_id": "rpi-home-server",
  "lat": 51.5074, 
  "lon": -0.1278,
  "type": "linux"
}' >/dev/null 2>&1
```

### B. Live GPS via Python (`gpsd`)
If your Raspberry Pi is in a vehicle with a USB GPS receiver (`gpsd` running):

```python
import gps
import requests
import time

UPLOTR_URL = "https://your-uplotr-domain.com/api/v1/ingest"
HEADERS = {"Authorization": "Bearer YOUR_API_KEY"}

session = gps.gps("localhost", "2947")
session.stream(gps.WATCH_ENABLE | gps.WATCH_NEWSTYLE)

while True:
    try:
        report = session.next()
        # Wait for a 3D TPV fix
        if report['class'] == 'TPV' and hasattr(report, 'lat') and hasattr(report, 'lon'):
            data = {
                "device_id": "rpi-dashboard-cam",
                "lat": report.lat,
                "lon": report.lon,
                "type": "linux"
            }
            requests.post(UPLOTR_URL, json=data, headers=HEADERS)
            time.sleep(30) # Only send every 30 seconds
    except KeyError:
        pass
```

---

## 5. Third-Party LoRaWAN Network Servers (LNS)

For Helium, TTN (The Things Network), or ChirpStack, uplotr provides an automatic mapping engine tailored to their webhook formats.

Please see the [DEVICE_SETUP.md](DEVICE_SETUP.md) guide for exact LNS configuration screenshots and instructions.
