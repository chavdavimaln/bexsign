# 02 — Project Structure Guide

## Application Architecture

```
bexsign/
├── client/          # Frontend React.js application
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── common/
│       │   ├── layout/
│       │   ├── modal/
│       │   ├── forms/
│       │   ├── tables/
│       │   ├── documents/
│       │   ├── signatures/
│       │   ├── templates/
│       │   └── notifications/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       ├── utils/
│       ├── constants/
│       ├── validations/
│       ├── App.jsx
│       └── main.jsx
├── server/          # Backend Node.js / Express.js REST API
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── emails/
│   ├── storage/
│   ├── jobs/
│   ├── database/
│   ├── uploads/
│   ├── logs/
│   ├── app.js
│   └── server.js
└── doc/             # Comprehensive documentation guides (01 - 20)
```
