# Local vs. Live: what actually differs

BexSign runs the same code on a developer machine and on a live server. Only environment values change — no file in
`client/src` or `server/` contains a hard-coded address any more.

Full instructions: [21 — Live Server Deployment](21-live-server-deployment.md).
Installation from scratch: [01 — Installation](01-installation.md).

---

## Side by side

| | Local development | Live server |
|---|---|---|
| Client | `npm run dev` on **http://localhost:3003** (Vite, hot reload) | `npm run build` → static files in `client/dist` |
| API | `npm start` on **http://localhost:5000** | Same process behind PM2/systemd and NGINX on :443 |
| API address used by the browser | `VITE_API_URL` empty → `http://localhost:5000` | `VITE_API_URL` empty → the site's own origin, or set it to the API domain |
| Database | XAMPP MySQL, user `root`, no password, `db_bex_sign` | Dedicated MySQL user with a password |
| CORS | `CORS_ORIGINS` empty → every origin allowed | `CORS_ORIGINS=https://sign.example.com` |
| Signing links in emails | `CLIENT_URL=http://localhost:3003` | `CLIENT_URL=https://sign.example.com` |
| Email | `EMAIL_DRY_RUN=true` writes `.eml` files to `server/email_outbox/` | `EMAIL_DRY_RUN=false`, real SMTP |
| Client IP in the audit trail | Direct connection | `TRUST_PROXY=1` so `X-Forwarded-For` is honoured |
| Uploads | `server/uploads/` on the dev machine | Same path, on a backed-up volume |

---

## How the client resolves the API

`client/src/utils/api.js`:

1. `VITE_API_URL` if it is set (any environment).
2. Otherwise, in `npm run dev`: `http://localhost:5000`.
3. Otherwise, in a production build: `window.location.origin` — the domain serving the app.

Because Vite inlines the value at build time, **rebuild after changing `.env`**. Every request in the app goes
through `apiFetch` / `API_BASE` / `apiUrl` from that file, so this is the only place the address is decided.

---

## How the server decides who may call it

`server/index.js`:

- `CORS_ORIGINS` empty → `cors()` accepts every origin (what local development needs).
- `CORS_ORIGINS` set → only those origins, plus requests with no `Origin` header (server-to-server, the public API,
  curl). A refused origin gets a clear error naming the setting.
- `SERVE_CLIENT=true` → the API also serves `client/dist` and sends `index.html` for any non-`/api`, non-`/uploads`
  path, so React Router deep links such as `/documents/sign/12` survive a refresh.

---

## Two mistakes that cost the most time

1. **Forgetting to rebuild the client** after changing `VITE_API_URL`. The old address stays in the bundle.
2. **Forgetting to restart the API** after a deploy. New routes answer `404` and the UI says
   *"This feature needs the latest BexSign server"*.
