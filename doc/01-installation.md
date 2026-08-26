# 01 — Installation Guide

## Overview
Bexsign is an enterprise-grade electronic signature and document workflow management application built with React.js, Node.js, Express.js, and MySQL.

## Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **MySQL**: v8.0 or higher
- **Git**: Latest version

## Environment Configuration

### Client (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Server (`server/.env`)
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=db_bex_sign
JWT_SECRET=bexsign_super_secret_jwt_key_2026
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@bexsign.com
SMTP_PASS=your_smtp_password
```

## Quick Start Installation

1. **Clone & Setup Server**:
   ```bash
   cd server
   npm install
   node init-db.js
   npm start
   ```

2. **Setup Client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **Access Application**:
   Open browser at `http://localhost:5173`.
