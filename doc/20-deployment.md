# 20 — Production Deployment Guide

## Production Setup
- **Server**: Run Express with PM2 (`pm2 start index.js --name bexsign-api`).
- **Frontend**: Build React bundle with Vite (`npm run build`) and serve via NGINX.
- **SSL**: Enable TLS/SSL certificates via Certbot for HTTPS encryption.
