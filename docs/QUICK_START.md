# Quick start

uplotr is a self-hosted tracking console for devices that can send latitude and longitude over REST or LoRaWAN webhooks.

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
  -d '{"device_id":"tracker-01","lat":37.7749,"lon":-122.4194,"battery":98}'
```

Return to the console and select the new device.
