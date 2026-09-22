# 01 — Installation (local development)

BexSign is an electronic-signature and document-workflow application: **React 18 + Vite + Tailwind** in `client/`,
**Express 4 + MySQL** in `server/`.

For a live server see [21 — Live Server Deployment](21-live-server-deployment.md).

---

## 1. Prerequisites

| | Version | Notes |
|---|---|---|
| Node.js | 18 or newer (20 LTS recommended) | `node -v` |
| npm | 9 or newer | ships with Node |
| MySQL / MariaDB | MySQL 5.7+ / MariaDB 10.4+ | XAMPP is fine on Windows |
| Git | any | |

---

## 2. Get the database running

**Windows / XAMPP** — start MySQL from the XAMPP control panel, or:

```bash
G:\xampp\mysql\bin\mysqld.exe --defaults-file=G:\xampp\mysql\bin\my.ini --standalone
```

Create the database (the application creates its own tables on first boot):

```bash
mysql -u root -e "CREATE DATABASE db_bex_sign CHARACTER SET utf8mb4;"
```

To start from an existing dump instead (the repository root holds dated dumps):

```bash
mysql -u root db_bex_sign < db_bex_sign_190926.sql
```

---

## 3. Configure and start the API

```bash
cd server
copy .env.example .env      # macOS/Linux: cp .env.example .env
npm install
npm start                   # http://localhost:5000
```

A local `server/.env` usually needs nothing more than:

```ini
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=db_bex_sign
CLIENT_URL=http://localhost:3003
JWT_SECRET=any-long-random-string
EMAIL_DRY_RUN=true
```

`EMAIL_DRY_RUN=true` writes every email to `server/email_outbox/*.eml` instead of sending it — the right setting
while developing. Set real `SMTP_*` values and `EMAIL_DRY_RUN=false` when you want mail to leave the machine.

A healthy first boot prints:

```
Bexsign Backend Server listening on http://localhost:5000
Connected to MySQL Database: db_bex_sign
[Schema] Platform module tables ready
```

Check it: <http://localhost:5000/api/health>

### Seed data (optional)

```bash
cd server
node init-db.js
```

---

## 4. Start the client

```bash
cd client
copy .env.example .env      # optional; the defaults already work locally
npm install
npm run dev                 # http://localhost:3003
```

`client/.env`:

```ini
# empty => http://localhost:5000 in dev, and the serving origin in a production build
VITE_API_URL=
VITE_PORT=3003
```

---

## 5. First sign-in

Open <http://localhost:3003>. Register the first account, or sign in with an account from the dump you imported.
The first account created takes the **manager** role, which holds every permission (see
[19 — Security](19-security.md)).

---

## 6. Everyday commands

```bash
cd server && npm start        # API
cd server && npm run dev      # API with nodemon (restarts on save)
cd client && npm run dev      # client with hot reload
cd client && npm run build    # production build into client/dist
cd client && npm run preview  # serve that build locally
```

---

## 7. When something does not work

| Symptom | Cause | Fix |
|---|---|---|
| "Could not reach the BexSign server at http://localhost:5000" | API not running, or a different project owns port 5000 | Start the API; check `http://localhost:5000/api/health` reports `db_bex_sign` |
| "This feature needs the latest BexSign server" | The API is running older code | Restart it — new routes only exist after a restart |
| `ER_ACCESS_DENIED_ERROR` on boot | Wrong `DB_USER` / `DB_PASSWORD` | Fix `server/.env` |
| `ECONNREFUSED 3306` | MySQL is not running | Start MySQL/XAMPP |
| No emails anywhere | `EMAIL_DRY_RUN=true` | Look in `server/email_outbox/`, or configure SMTP |
| Signing links point at the wrong host | `CLIENT_URL` | Set it to where the client runs |
| Port already in use | Another process on 5000/3003 | Change `PORT` / `VITE_PORT`, or stop the other process |

---

## 8. Where things are

| Path | Contents |
|---|---|
| `client/src/pages` | Screens |
| `client/src/components` | Shared UI (`ui/kit.jsx` is the component kit) |
| `client/src/utils/api.js` | The single place the API address is decided |
| `server/routes` | HTTP endpoints |
| `server/utils` | Business logic, PDFs, email, schema |
| `server/uploads` | Uploaded documents, signed PDFs, certificates |
| `doc/` | This documentation |
