# Device Setup & Configuration

This guide explains how to connect LoRaWAN network servers and generic HTTP devices to uplotr.

## Authentication Mode

Authentication for ingest endpoints is managed in **System Settings -> API Keys -> Webhook Auth Mode**.

- `OFF`: no authentication required
- `OPTIONAL`: missing key is allowed; invalid provided key is rejected
- `REQUIRED`: all requests must include a valid key

If mode is `OPTIONAL` or `REQUIRED`, include one of:

- `Authorization: Bearer <API_KEY>`
- `x-uplotr-key: <API_KEY>`
- `x-heyiot-token: <API_KEY>` (backward compatibility)

## 1. LoRaWAN Devices (Helium / TTN / ChirpStack)

uplotr provides a unified webhook endpoint:

- **URL**: `https://<YOUR-DOMAIN>/api/lorawan/webhook`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Helium Console

1. Go to **Integrations** -> **Add New Integration** -> **HTTP**.
2. Set **Endpoint URL**: `https://.../api/lorawan/webhook`.
3. Set **Method**: `POST`.
4. Add auth header if mode is `OPTIONAL` or `REQUIRED`.
5. Apply integration to devices/labels.

### TTN v3

1. Go to **Applications** -> **Integrations** -> **Webhooks** -> **Add** -> **Custom Webhook**.
2. Set **Base URL**: `https://.../api/lorawan/webhook`.
3. Enable **Uplink message**.
4. Use JSON format.
5. Add auth header if mode is `OPTIONAL` or `REQUIRED`.

### ChirpStack

1. Go to **Applications** -> **Integrations** -> **HTTP**.
2. Set **Event endpoint URL(s)**: `https://.../api/lorawan/webhook`.
3. Set marshaler to JSON.
4. Add auth header if mode is `OPTIONAL` or `REQUIRED`.

### Sample LoRaWAN Payload

```json
{
  "dr": 3,
  "fCnt": 901,
  "time": "2026-02-12T02:49:16.295+00:00",
  "fPort": 5,
  "object": {
    "Battery": 68,
    "Latitude": 37.53808,
    "Longitude": -122.281512,
    "Location": {
      "lat": 37.53808,
      "lon": -122.281512
    },
    "Air_Temperature": 19.6,
    "Light": 0
  },
  "rxInfo": [
    {
      "snr": 12.5,
      "rssi": -98,
      "metadata": {
        "gateway_name": "wonderful-midnight-gorilla"
      }
    }
  ],
  "devAddr": "480009a3",
  "deviceInfo": {
    "devEui": "2cf7f1c0538005e1",
    "deviceName": "T1000A_01",
    "deviceProfileName": "T1000A"
  }
}
```

## 2. Generic Devices (WiFi / 4G / NB-IoT)

For non-LoRaWAN devices sending HTTP directly, use:

- **URL**: `https://<YOUR-DOMAIN>/api/v1/ingest`
- **Method**: `POST`
- **Content-Type**: `application/json`

Example:

```json
{
  "device_id": "my-tracker-01",
  "lat": 34.0522,
  "lon": -118.2437,
  "battery": 95,
  "timestamp": 1707638400000,
  "type": "4g"
}
```

## Mapping Notes

uplotr expects coordinates and telemetry in decoded payload fields.

Common coordinate field names:

- `latitude` or `lat`
- `longitude` or `lon`

Common battery field names:

- `battery` or `bat`

For custom payloads, configure a mapper in device settings and reprocess historical events if needed.

## Quick Test

```bash
curl -X POST http://localhost:3000/api/lorawan/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <api-key>" \
  -d '{
    "deviceInfo": { "devEui": "A840410000000123" },
    "time": "2026-02-12T10:00:00Z",
    "object": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "battery": 85
    }
  }'
```
