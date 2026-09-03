
# Device Adapters

uplotr is designed to be protocol-agnostic. While it provides a unified tracking schema, different devices and networks speak different languages. This directory compiles example adapter code and payload decoders for various common IoT devices and networks.

uplotr supports payload mapping internally via JSONPath, but sometimes you need to decode binary payloads *before* they hit the mapper, or use a script within your LNS (LoRaWAN Network Server).

## Included Examples

- `LoraWan_SenseCap_Codec.js`: A JavaScript decoder for Seeed Studio SenseCap LoRaWAN sensors. Compatible with TTN/ChirpStack payload formatters.

## Implementation Guide

### 1. The "Universal" Approach (Recommended)

The most robust way to ingest data is to normalize it *before* sending it to uplotr, or rely on uplotr's built-in JSONPath mapper if the data is already JSON.

**Endpoint:** `POST /api/v1/ingest`
**Header:** `Authorization: Bearer <YOUR_API_KEY>`

**Target Payload Structure:**
```json
{
  "id": "device_123",
  "lat": 34.0522,
  "lon": -118.2437,
  "ts": 1678886400000,
  "batt": 98,
  "temp": 21.5
}
```

### 2. LoRaWAN Network Servers (TTN / Helium / ChirpStack)

Most LoRaWAN servers allow you to run a custom JavaScript decoder (uplink formatter) to convert binary data to JSON *before* calling the webhook.

**Copy the example code** (e.g., `LoraWan_SenseCap_Codec.js`) into your LNS "Payload Formatters" tab.

Ensure your webhook URL is configured:
`https://your-uplotr-instance.com/api/lorawan/webhook`

(See `docs/DEVICE_SETUP.md` for more details)
