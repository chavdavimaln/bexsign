# 13 — Notifications

In-app notifications (the header bell and the Notifications page) and their email copies.

Pages: `client/src/pages/Notifications.jsx`, `client/src/pages/settings/NotificationSettings.jsx`,
`client/src/components/notifications/NotificationBell.jsx`. Server: `server/routes/notifications.js`,
`server/utils/platformEvents.js`. Tables: `notifications`, `notification_preferences`.

---

## 1. Categories

| Category | Raised by |
|---|---|
| `document` | viewed, signed, completed, declined, recalled, expired |
| `signing` | a signing request or reminder addressed to you |
| `email` | a signing email could not be delivered |
| `user` | new users, role changes, permission changes, password changes |
| `security` | failed sign-ins, signing links opened by a non-recipient, repeated failures |
| `template` | a shared template was created |
| `report` | a scheduled report ran |
| `api` | API key and webhook events; an OAuth app registered in your name ([25](25-oauth-apps.md)) |
| `system` | announcements and broadcasts |

Each notification carries a severity (`info`, `success`, `warning`, `error`), a link to the thing it is about, and
the actor's name where there is one.

---

## 2. Where they appear

- **The bell** shows the unread count, the latest items, All/Unread tabs, "Mark all read" and a link to the full
  page. It refreshes every 30 seconds, on route changes, and whenever the app raises the
  `bexsign-notifications-changed` event.
- **The Notifications page** adds search, category chips, grouping by day, mark read/unread, delete, "clear read",
  and — for holders of `notifications.broadcast` — an announcement to chosen roles.

---

## 3. Preferences

**Settings → My notifications** has an in-app and an email switch per category, plus "pause emails until …".

- In-app **security** notifications cannot be switched off.
- Signing emails to recipients are *not* affected by these settings — they are part of the signing process, not
  personal notifications.
- Preferences are stored as JSON per category in `notification_preferences.preferences`.

---

## 4. Raising one from code

```js
const { notify } = require('../utils/platformEvents');

await notify({
  userIds: [ownerId],          // or emails: ['a@b.com'], or permission: 'security.failed_access'
  category: 'document',
  severity: 'success',
  title: `${name} signed "${doc.document_name}"`,
  message: 'Two recipients still need to sign.',
  link: `/documents/${doc.id}`,
  entityType: 'document',
  entityId: doc.id,
  actorName: name
});
```

`notify()` respects every recipient's preferences, sends the email copy when the category has email enabled and
emails are not paused, and never throws — a notification failure must not break the action that caused it.

---

## 5. Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/notifications` | list with filter, category, search, pagination |
| `GET /api/notifications/summary` | unread count + latest, for the bell |
| `PATCH /api/notifications/:id/read` | mark one read or unread |
| `POST /api/notifications/read-all` | mark all (optionally one category) read |
| `POST /api/notifications/clear-read` | delete the read ones |
| `GET` / `PUT /api/notifications/preferences` | read and save preferences |
| `POST /api/notifications/broadcast` | announcement to roles (`notifications.broadcast`) |
| `POST /api/notifications/test` | send yourself a test notification |
