# Changelog

All notable changes are documented here. uplotr follows semantic versioning while in Public Beta.

## [0.2.0-beta.1] - 2026-09-02

### Added

- Public English landing page, built-in Markdown documentation, status page, and deterministic read-only demo
- Private console at `/app` and `app.uplotr.com` host routing
- Route-level user/admin authorization and stable JSON 401/403 responses
- Hashed, high-entropy API keys with one-time secret display and legacy-key migration
- Persistent login and ingest rate limiting plus request size and data validation
- Public health endpoint, protected Vercel Cron cleanup, security headers, robots, sitemap, and Open Graph metadata
- Node.js 22 standalone Docker image, automatic migrations, health checks, and non-root runtime
- Unit, PostgreSQL integration, browser, Docker, audit, and release CI workflows

### Changed

- Upgraded Next.js to 16.3.4 and React to 19.2.8
- Made MapLibre + OpenFreeMap the token-free default
- Added cascade deletion and query indexes for device history
- Stopped full LoRaWAN payload and precise-location logging

### Fixed

- Prevented concurrent first packets for a new device from losing position or event data
- Moved Bruno request authentication and base URLs to environment variables

### Removed

- Anonymous database-writing demo endpoint
- Unimplemented telemetry placeholder endpoint
- Claims that alerts and native MQTT/Kafka are currently available
