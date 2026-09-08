# Quick start

uplotr is a self-hosted field-test workbench for devices that send location and sensor telemetry over REST or LoRaWAN webhooks.

## 1. Configure the instance

```bash
git clone https://github.com/iblh/uplotr.git
cd uplotr
cp .env.prod.example .env
```

Generate strong values for `AUTH_SECRET`, `DB_PASSWORD`, and `CRON_SECRET`. Keep ingest authentication set to `REQUIRED` on internet-facing instances.

## 2. Start Docker Compose

```bash
docker compose -f docker-compose.prod.yml up -d
```

Open `http://localhost:3000/login`, create the owner account, and keep the default MapLibre + OpenFreeMap provider for a token-free start.

## 3. Create an API key

Open **Settings → Access and security → API keys**. Copy the new key immediately; the full value is shown only once.

## 4. Send a location

```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"tracker-01","lat":37.7749,"lon":-122.4194,"battery":98,"metrics":{"altitude":32,"voltage":4.08}}'
```

Return to the console and select the new device.

## 5. Record a field test

Select the device, then use the **Field tests** card to start a run. Record the hardware version, firmware version, and what the test should prove. All new positions are attached automatically until you finish the run.

The completed report calculates distance, duration, speed, battery use, custom telemetry summaries, and an explainable data-quality score. Complete two runs for the same device to compare a baseline with a candidate.

## 6. Import a DIY drone flight

Select or create the aircraft device, choose **Import flight**, name the test, and upload a GPX file or a decoded/exported CSV. The importer recognizes common PX4, ArduPilot, Betaflight, and generic DIY logger column names for coordinates, timestamps, altitude, speed, attitude, satellite count, voltage, current, RSSI, and SNR.

Open the completed report for flight-specific results, or use the map button beside the run to replay only that flight. The telemetry selector above the map can color each route segment by altitude, speed, signal, power, or any numeric custom metric.

Raw `.ulg`, `.bin`, `.bbl` files and DJI account synchronization are not parsed in this release; export or decode them to CSV first.
