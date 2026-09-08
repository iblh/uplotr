# Changelog

All notable changes are documented here. uplotr follows semantic versioning while in Public Beta.

## [0.3.1-beta.1] - 2026-09-04

### Added

- Drone flight-log import for GPX and generic, PX4, ArduPilot, and Betaflight decoded CSV files
- Flight reports for altitude, climb, ground and vertical speed, distance from home, and GPS satellite health
- Run-scoped route viewing and segment coloring by built-in or maker-defined telemetry
- Explicit activity type, expected reporting interval, minimum sample protocol, and run-comparability checks

### Changed

- Promoted drone and DIY aircraft testing to a first-class maker workflow
- Increased run-scoped position retrieval to 10,000 samples for flight replay

## [0.3.0-beta.1] - 2026-09-04

### Added

- Structured field-test runs with hardware, firmware, goals, notes, and automatic position capture
- Arbitrary maker-defined telemetry metrics on position records and replay panels
- Deterministic run reports for route statistics, battery use, reporting cadence, and data quality
- Explainable detection for long reporting gaps, possible GPS jumps, and timestamp problems
- Baseline-to-candidate comparison for completed runs from the same device
- A field-test workflow in the private console and richer field-test data in the public demo

### Changed

- Repositioned uplotr around field testing for moving hardware instead of generic fleet tracking
- Updated landing, Open Graph, quick-start, and API documentation for the 0.3 workflow

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
