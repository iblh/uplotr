# API reference

All responses use JSON. Ingest failures include a `requestId` for sanitized log correlation. API requests never redirect to the HTML login page: private endpoints return JSON `401` or `403`.

## Ingest authentication

Production defaults to `AUTH_MODE=REQUIRED`.

- `Authorization: Bearer <API_KEY>` (recommended)
- `x-uplotr-key: <API_KEY>`
- `x-heyiot-token: <API_KEY>` (legacy compatibility)

`UPLOTR_API_SECRET` or the legacy `WEBHOOK_SECRET` may be configured as a static deployment secret. Named keys created in the console are preferred. They are high-entropy, stored as SHA-256 hashes, and shown in full only once.

`OPTIONAL` accepts requests without a token but rejects an invalid supplied token. `OFF` disables ingest authentication and should not be used on an internet-facing instance.

## Common ingest limits

- Maximum body: 128 KiB (`413` when exceeded)
- Default persistent rate limit: 600 requests per key or source IP per minute (`429` with `Retry-After`)
- Device ID: 1–128 characters
- Latitude: -90 through 90; longitude: -180 through 180
- Numeric fields must be finite; timestamps must parse as valid dates
- Late events are stored in history but never overwrite a newer device's current state

## `POST /api/v1/ingest`

```json
{
  "device_id": "tracker-01",
  "lat": 37.7749,
  "lon": -122.4194,
  "timestamp": "2026-09-02T12:00:00Z",
  "battery": 85,
  "type": "generic",
  "temp": 22.5,
  "light": 100,
  "payload": { "firmware": "1.4.0" }
}
```

`device_id`, `lat`, and `lon` are required unless an assigned payload mapper supplies coordinates. `timestamp` accepts ISO 8601, Unix milliseconds, or Unix seconds. Successful requests return `201`:

```json
{ "success": true, "deviceId": "database-uuid", "requestId": "request-uuid" }
```

## `POST /api/lorawan/webhook`

Accepts common TTN, Helium, ChirpStack, and HeyIoT-compatible shapes. Device identity may come from `devEui`, `dev_eui`, `deviceInfo.devEui`, or `end_device_ids.dev_eui`; decoded coordinates may come from the provider payload or an assigned mapper.

```json
{
  "end_device_ids": { "device_id": "field-node", "dev_eui": "A840410000000123" },
  "received_at": "2026-09-02T12:00:00Z",
  "uplink_message": {
    "decoded_payload": { "latitude": 37.7749, "longitude": -122.4194, "battery": 85 },
    "rx_metadata": [{ "rssi": -92, "snr": 7.5 }]
  }
}
```

An event without coordinates may still update telemetry and event history. Full payloads and precise positions are not written to application logs.

## API key management

These routes require an authenticated administrator session and same-origin mutations.

- `GET /api/keys` returns only `id`, `name`, `prefix`, `createdAt`, and `lastUsedAt`.
- `POST /api/keys` accepts `{ "name": "Field gateway" }` and returns the full `key` only in that successful response.
- `DELETE /api/keys/:id` revokes a key.

## Console data and administration

Authenticated users may read:

- `GET /api/devices`
- `GET /api/positions?deviceId=...&range=24h`
- `GET /api/events?deviceId=...`

Administrator access is required for users, API keys, system settings, mapping templates, device updates/deletion, manual retention cleanup, and mapper assignment.

## Health and cleanup

`GET /api/health` is public and returns only overall status, database availability, and the package version. It never exposes configuration or credentials.

`GET /api/maintenance/cleanup` is reserved for Vercel Cron and requires an existing, matching `CRON_SECRET`. Authenticated administrators may use `POST` from the console.

## Error codes

| Status | Meaning |
| --- | --- |
| `400` | Invalid JSON, identifier, coordinate, timestamp, or number |
| `401` | Missing or invalid session/API key |
| `403` | Authenticated but insufficient role, wrong origin, or invalid Cron secret |
| `413` | Request body exceeds 128 KiB |
| `429` | Persistent rate limit exceeded; inspect `Retry-After` |
| `500` | Internal error; use `requestId` to correlate sanitized logs |
| `503` | Health check cannot reach PostgreSQL |
