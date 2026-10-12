# BexSign

Electronic signature and document workflow suite: a React + Vite client in `client/` and an Express + MySQL API
in `server/`.

## Run it

Requirements: Node.js 18 or newer, and a running MySQL 5.7+ / MariaDB 10.4+.

```bash
npm install
npm start
```

Run both in this folder, on Windows, macOS or Linux. `npm install` sets up `server/` and `client/` and creates
their `.env` files from the examples; `npm start` prepares the database and starts the API
(<http://localhost:5000>) and the client (<http://localhost:3003>) together. Ctrl+C stops both.

| Command | |
|---|---|
| `npm run start:api` / `npm run start:web` | one side only |
| `npm run serve` | build the client and serve it from the API (one port) |
| `npm run build` | production build of the client |
| `npm run db:migrate` / `npm run db:status` | database migration |

Configuration lives in `server/.env` (database, email, sign-in providers) and `client/.env` (API address, port).

## Documentation

Start at [doc/00-index.md](doc/00-index.md): installation, every module, the API, the database, deployment.
