# 20 — Deployment Overview

A one-page summary. The full, step-by-step instructions live in
**[21 — Live Server Deployment](21-live-server-deployment.md)**.

## The shape of a deployment

```
                    ┌──────────────────────────┐
  browser  ───────▶ │  NGINX (TLS, :443)       │
                    └───────────┬──────────────┘
                                │ proxy
                    ┌───────────▼──────────────┐      ┌──────────────┐
                    │  Node / Express  :5000   │ ───▶ │  MySQL       │
                    │  API + optional client   │      │  db_bex_sign │
                    └───────────┬──────────────┘      └──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │ server/uploads/          │  documents, signed PDFs, certificates
                    └──────────────────────────┘
```

## The five things that make it work anywhere

| Setting | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | `client/.env` (build time) | Which API the browser calls. Empty = the origin the app is served from. |
| `CLIENT_URL` | `server/.env` | The public address written into signing emails. |
| `CORS_ORIGINS` | `server/.env` | Which browser origins may call the API. Empty = all (local only). |
| `SERVE_CLIENT` | `server/.env` | `true` lets the API serve `client/dist`, so app and API share one domain. |
| `TRUST_PROXY` | `server/.env` | Records the real signer IP behind NGINX. |

Nothing else changes between a laptop and a live server.

## Commands

```bash
# API
cd server && npm ci --omit=dev && pm2 start index.js --name bexsign-api

# Client
cd client && npm ci && npm run build
```

The database schema is created and patched automatically when the API boots — there is no migration step.

Checklists, NGINX configuration, backup, update and troubleshooting: see
[21 — Live Server Deployment](21-live-server-deployment.md).
