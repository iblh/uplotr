# Security policy

## Supported versions

Security fixes are provided for the newest published Beta release. Public Beta software may change quickly, so operators should follow releases and upgrade promptly.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private vulnerability reporting at:

https://github.com/iblh/uplotr/security/advisories/new

Include the affected version, deployment model, reproduction steps, impact, and any suggested mitigation. Remove real API keys, passwords, session cookies, exact coordinates, and private device payloads.

We aim to acknowledge a report within 5 business days and provide an initial assessment within 10 business days. Timelines for a fix depend on severity and complexity. Please allow a reasonable remediation window before public disclosure.

## Deployment responsibility

Self-hosters are responsible for TLS, database access controls, backups, secret rotation, dependency upgrades, and local privacy obligations. Keep `AUTH_MODE=REQUIRED` on internet-facing instances.
