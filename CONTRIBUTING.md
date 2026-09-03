# Contributing to uplotr

Thanks for helping make device tracking easier for IoT developers and makers.

## Choose the right channel

- Ask setup and usage questions in [Discussions](https://github.com/iblh/uplotr/discussions).
- Use an Issue template for reproducible bugs or scoped feature requests.
- Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

Never publish credentials, session cookies, database URLs, exact private coordinates, or raw production payloads.

## Development setup

You need Node.js 22, pnpm 10, Docker, and PostgreSQL.

```bash
git clone https://github.com/YOUR_USERNAME/uplotr.git
cd uplotr
pnpm install
cp .env.example .env
pnpm exec prisma migrate dev
pnpm dev
```

Create branches from `main`. Keep changes focused, add tests for behavior changes, and update the Markdown documentation when an API or deployment workflow changes.

## Required checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod --audit-level=high
```

CI additionally starts PostgreSQL, applies every migration, runs integration and Playwright tests, and builds the production Docker image.

## Project conventions

- Next.js 16 App Router, React 19, and strict TypeScript
- Route handlers enforce authorization themselves; do not rely on `proxy.ts` for API security
- Public demo data must be deterministic, read-only, and independent of PostgreSQL
- MapLibre + OpenFreeMap must remain functional without a token
- New API keys are hashed and may reveal the full secret only in the create response
- Logs must not contain secrets, raw payloads, or precise locations
- Database changes require a Prisma migration and a documented rollback strategy

By participating you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Contributions are licensed under Apache-2.0.
