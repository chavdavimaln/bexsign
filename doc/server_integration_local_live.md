# Server Integration: Local Development vs. Live Production Guide

This guide describes how to run and deploy **BexSign** in local development environments and live production servers.

---

## 1. Running in Local Development Mode

### Backend Express Server (`server/`)

```bash
cd server
npm install
node index.js
```
- Server starts on `http://localhost:5000`.
- Connects to MySQL instance on `localhost:3306` (`db_bex_sign`).

### Frontend React Client (`client/`)

```bash
cd client
npm install
npm run dev
```
- Vite dev server starts on `http://localhost:5173`.
- Communicates with Express server via REST API (`http://localhost:5000/api`).

---

## 2. Deploying to Production Servers

### Backend Production Deployment (Node.js / PM2 / Nginx)

1. Set environment variables on server:
   ```env
   NODE_ENV=production
   PORT=5000
   DB_HOST=127.0.0.1
   DB_USER=bex_prod_user
   DB_PASSWORD=SecurePassword123!
   DB_NAME=db_bex_sign
   ```
2. Process Manager (PM2):
   ```bash
   pm2 start index.js --name "bexsign-backend"
   ```

### Frontend Production Build (Vite)

```bash
cd client
npm run build
```
- Output build folder: `client/dist/`.
- Serve static assets using Nginx or Caddy with proxy rules for `/api` pointing to `http://localhost:5000`.
