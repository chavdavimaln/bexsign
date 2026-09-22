# 21 — Live Server Deployment

How to put BexSign on a real server, and how the same code keeps running on a developer's machine without changes.
Nothing in the application is tied to `localhost` any more: every address, credential and mail setting comes from
environment variables, so one codebase serves both.

Related: [01 — Installation](01-installation.md) for the local setup, [16 — Database](16-database.md) for the
schema, [17 — Email](17-email.md) for SMTP, [19 — Security](19-security.md).

---

## 1. What has to be decided before you start

| Decision | Options | What it changes |
|---|---|---|
| **One domain or two** | `https://sign.example.com` serves both app and API **or** app on `sign.example.com` + API on `api.example.com` | One domain needs no CORS and no `VITE_API_URL`; two domains need both |
| **Who serves the React build** | The Node server (`SERVE_CLIENT=true`) or NGINX/Apache | Node is simplest; a web server is faster for static files |
| **Process manager** | PM2, systemd, Docker | How the API restarts after a crash or reboot |
| **Database host** | Same server or managed MySQL | `DB_HOST` and firewall rules |

The rest of this guide covers the two common shapes:

- **Shape A — single server, one domain.** Node serves the API *and* the built client. Simplest, no CORS.
- **Shape B — separate front end.** NGINX serves the build, Node serves `/api`. Needed when the front end is on a CDN
  or a different host.

---

## 2. Requirements

- **Node.js 18 or newer** (20 LTS recommended) and npm.
- **MySQL 5.7+ / MariaDB 10.4+** with a database and a user that can `CREATE TABLE` (the app creates and patches its
  own tables at boot).
- **SMTP credentials** that may send on behalf of your sending address.
- A domain with DNS pointing at the server, and a TLS certificate (Let's Encrypt is fine).
- Outbound access to the SMTP port (465 or 587). Many hosts block these by default — ask before you debug for hours.

---

## 3. Get the code and the dependencies onto the server

```bash
git clone <your-repository> /var/www/bexsign
cd /var/www/bexsign

cd server && npm ci --omit=dev && cd ..
cd client && npm ci && cd ..
```

`npm ci` installs exactly what the lock file says. Use `npm install` only if there is no lock file.

---

## 4. Create the database

```bash
mysql -u root -p -e "CREATE DATABASE db_bex_sign CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -p -e "CREATE USER 'bexsign'@'localhost' IDENTIFIED BY 'a-strong-password';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON db_bex_sign.* TO 'bexsign'@'localhost'; FLUSH PRIVILEGES;"
```

Then load a dump if you are migrating existing data (the repository root holds dated dumps such as
`db_bex_sign_190926.sql`):

```bash
mysql -u bexsign -p db_bex_sign < db_bex_sign_190926.sql
```

A fresh install needs no dump. On first boot the server creates every table it needs and adds any missing columns —
see [16 — Database](16-database.md) for which module owns which table, and section 9 below for what happens at boot.

---

## 5. Configure the API

Copy `server/.env.example` to `server/.env` and fill it in. The values that matter on a live server:

```ini
PORT=5000

# Shape A (one domain): the API also serves the built client, so no CORS list is needed
SERVE_CLIENT=true
CORS_ORIGINS=

# Shape B (separate front end): list every origin that may call the API
# SERVE_CLIENT=
# CORS_ORIGINS=https://sign.example.com

# Always set this behind NGINX, or the audit trail records the proxy's IP instead of the signer's
TRUST_PROXY=1

DB_HOST=localhost
DB_USER=bexsign
DB_PASSWORD=a-strong-password
DB_NAME=db_bex_sign
DB_PORT=3306

# The public address recipients open from signing emails. Wrong value = dead links in every email.
CLIENT_URL=https://sign.example.com

# Long random string. Changing it invalidates every existing session.
JWT_SECRET=<openssl rand -hex 32>

SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@example.com
SMTP_PASSWORD=<mailbox password or app password>
SMTP_FROM_NAME=BexSign
EMAIL_DRY_RUN=false
```

`EMAIL_DRY_RUN=true` writes every email to `server/email_outbox/*.eml` instead of sending it. Useful for a staging
server; never leave it on in production, because recipients then receive nothing.

---

## 6. Build the client

Vite reads its variables at **build** time, so the API address is baked into the bundle. Rebuild after changing them.

**Shape A — one domain.** Leave `VITE_API_URL` empty: a production build calls the origin it is served from, so the
same build works on any domain.

```bash
cd client
cp .env.example .env.production   # optional; an empty VITE_API_URL is already the default
npm run build                     # writes client/dist
```

**Shape B — separate front end.** Point the build at the API:

```bash
cd client
printf 'VITE_API_URL=https://api.example.com\n' > .env.production
npm run build
```

Copy `client/dist` to wherever the web server serves it (Shape B), or leave it in place for Node to serve (Shape A).

---

## 7. Run the API as a service

### PM2

```bash
npm install -g pm2
cd /var/www/bexsign/server
pm2 start index.js --name bexsign-api
pm2 save
pm2 startup        # prints a command to run once, so PM2 restarts on reboot
pm2 logs bexsign-api
```

### systemd

```ini
# /etc/systemd/system/bexsign-api.service
[Unit]
Description=BexSign API
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/bexsign/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
EnvironmentFile=/var/www/bexsign/server/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now bexsign-api
sudo journalctl -u bexsign-api -f
```

---

## 8. NGINX

### Shape A — one domain, Node serves everything

```nginx
server {
    listen 443 ssl http2;
    server_name sign.example.com;

    ssl_certificate     /etc/letsencrypt/live/sign.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sign.example.com/privkey.pem;

    # Signed PDFs and uploads travel through here
    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;   # generating signed PDFs for a large request takes a while
    }
}

server {
    listen 80;
    server_name sign.example.com;
    return 301 https://$host$request_uri;
}
```

### Shape B — NGINX serves the build, proxies the API

```nginx
server {
    listen 443 ssl http2;
    server_name sign.example.com;
    root /var/www/bexsign/client/dist;
    client_max_body_size 30m;

    # React Router: every unknown path must return index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # Uploaded and generated files are served by the API
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }
}
```

Certificates:

```bash
sudo certbot --nginx -d sign.example.com
```

---

## 9. What happens on the first boot

The server prepares its own schema, so there is no migration tool to run:

1. `requestHelpers.ensureRequestSchema()` adds any missing columns to the request tables.
2. `ensurePlatformSchema()` creates the platform tables (permissions, notifications, settings, security logs,
   reports) and seeds the permission catalogue and the default role grants.
3. `ensureSigningFlowSchema()` creates `document_signing_flow` and `signing_email_dispatch`.
4. The report scheduler starts, and signed PDFs issued with an older layout are refreshed in the background.

Watch the first boot; these lines confirm a healthy start:

```
Bexsign Backend Server listening on http://localhost:5000
Connected to MySQL Database: db_bex_sign
[Schema] Platform module tables ready
[Client] Serving the built app from /var/www/bexsign/client/dist     (only with SERVE_CLIENT=true)
[SMTP] ...
```

---

## 10. Verify the deployment

```bash
# 1. The API is alive and talking to the right database
curl -s https://sign.example.com/api/health

# 2. The app is served (Shape A) and deep links work
curl -sI https://sign.example.com/documents/all | head -1

# 3. The browser build points at the right API — open the site, sign in, and confirm
#    the dashboard counters load with no "Could not reach the BexSign server" message.
```

Then walk one real request end to end: create a document, send it to an address you control, open the link from the
email, sign, and confirm the completed copy arrives. That single pass exercises the database, uploads, PDF
generation, SMTP and the public signing link at once.

---

## 11. Files that must survive a deploy

| Path | Holds | Notes |
|---|---|---|
| `server/uploads/` | Uploaded documents | Back it up; never wipe it on deploy |
| `server/uploads/completed/` | Signed PDFs and certificates of completion | The legal record — back it up |
| `server/uploads/physical/` | Scanned "signed on paper" copies | |
| `server/.env` | All credentials | Never commit it |
| The database | Everything else | Take a dump before every deploy |

A simple nightly backup:

```bash
mysqldump -u bexsign -p db_bex_sign | gzip > /backup/bexsign-$(date +%F).sql.gz
tar czf /backup/bexsign-uploads-$(date +%F).tar.gz /var/www/bexsign/server/uploads
```

---

## 12. Updating a running installation

```bash
cd /var/www/bexsign
git pull
cd server && npm ci --omit=dev && cd ..
cd client && npm ci && npm run build && cd ..
pm2 restart bexsign-api          # or: sudo systemctl restart bexsign-api
curl -s https://sign.example.com/api/health
```

New columns and tables are added automatically at boot. Restart the API after every deploy — a running Node process
keeps the old code in memory, which is the usual reason a new endpoint answers `404` right after an update.

---

## 13. Running locally (unchanged by any of the above)

```bash
# 1. MySQL (XAMPP on Windows)
G:\xampp\mysql\bin\mysqld.exe --defaults-file=G:\xampp\mysql\bin\my.ini --standalone

# 2. API
cd server
copy .env.example .env      # DB_USER=root, empty password, CLIENT_URL=http://localhost:3003
npm install
npm start                   # http://localhost:5000

# 3. Client
cd client
npm install
npm run dev                 # http://localhost:3003
```

With `VITE_API_URL` empty, `npm run dev` talks to `http://localhost:5000` and `npm run build` talks to whatever domain
serves it. Nothing has to be edited when moving between the two.

---

## 14. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Could not reach the BexSign server at …" | Wrong `VITE_API_URL`, API down, or CORS blocked | `curl /api/health`; check `CORS_ORIGINS` includes the exact site origin (scheme + host, no trailing slash) |
| A new page says "This feature needs the latest BexSign server" | The API was not restarted after the deploy | Restart the service |
| Signing links in emails point at localhost | `CLIENT_URL` not set | Set it to the public URL and restart |
| No emails arrive | `EMAIL_DRY_RUN=true`, wrong SMTP credentials, or the host blocks the port | Check the boot `[SMTP]` line and `server/email_outbox/` |
| Every audit entry shows the same IP | `TRUST_PROXY` not set behind NGINX | `TRUST_PROXY=1` |
| Refreshing a deep link gives 404 | Web server not falling back to `index.html` | Add `try_files … /index.html` (Shape B) |
| Uploads fail over ~1 MB | `client_max_body_size` too small | Raise it in NGINX (the API itself accepts 25 MB per file) |
| `ER_ACCESS_DENIED_ERROR` at boot | DB credentials or host wrong | Check `DB_*` in `server/.env` |

---

## 15. Production checklist

- [ ] `JWT_SECRET` is a long random value, different from any development value.
- [ ] `EMAIL_DRY_RUN=false` and a test email actually arrives.
- [ ] `CLIENT_URL` is the public HTTPS address.
- [ ] `CORS_ORIGINS` lists only your own origins (Shape B).
- [ ] `TRUST_PROXY=1` behind a proxy.
- [ ] HTTPS enforced, HTTP redirected.
- [ ] `server/.env` is not readable by other users and is not in version control.
- [ ] Database and `server/uploads/` are backed up on a schedule.
- [ ] The API restarts automatically after a reboot (`pm2 save` / `systemctl enable`).
- [ ] The default seeded accounts have had their passwords changed.
