# 03 — Authentication

Pages: `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`.
Server: `server/routes/auth.js` (mounted at both `/api` and `/api/auth`), `server/middleware/authMiddleware.js`.

See [19 — Security](19-security.md) for roles and permissions.

---

## 1. Endpoints

| Endpoint | Body | Result |
|---|---|---|
| `POST /api/register` | first_name, last_name, email, password, company, phone | Creates the account and returns a token |
| `POST /api/login` | email (or username) + password | `{ token, user }` |
| `POST /api/change-password` | currentPassword, newPassword | Confirms by email |
| `POST /api/send-reset-email` | email | Emails a single-use reset link (also `/forgot-password`) |
| `GET /api/reset-password/verify?token=` | — | Whether a reset link is still valid |
| `POST /api/reset-password` | token, newPassword | Sets the new password and invalidates the token |

Every one is also reachable under `/api/auth/...`.

---

## 2. Sessions

A successful sign-in returns a JWT signed with `JWT_SECRET`. The client stores it in `localStorage` and
`client/src/utils/api.js` attaches `Authorization: Bearer <token>` to every request.

`authenticateUser` verifies the token and puts the account on `req.user`. A JWT-shaped token that fails
verification returns **401** with `sessionExpired: true`; `apiFetch` then clears the session and sends the user back
to the sign-in page.

Changing `JWT_SECRET` invalidates every existing session.

---

## 3. Password reset

1. The user asks for a link. The address is never confirmed or denied in the response — an unknown address gets the
   same answer, and the attempt is written to `failed_access_logs`.
2. A random token is stored **hashed** in `password_reset_tokens` with an expiry and the requesting IP.
3. The email contains `CLIENT_URL/reset-password?token=…`. On a live server `CLIENT_URL` must be the public address,
   or the link is dead.
4. Using the link consumes the token (`used_at`), sets the new bcrypt hash, logs the change and emails a
   confirmation.

---

## 4. What is recorded

| Event | Where |
|---|---|
| Every sign-in attempt and outcome | `user_login_logs` |
| Wrong password, deactivated account, reset for an unknown address, invalid reset link | `failed_access_logs` |
| Registration, sign-in, password change and reset | `activity_logs` |
| New account | a notification to everyone with `users.view` |

---

## 5. Notes

- The first account created becomes a **manager** and holds every permission.
- A deactivated account is refused at sign-in and the attempt is logged.
- A request with no token at all still falls back to the default account so the demo login works — remove that
  fallback before putting an installation on the public internet ([19](19-security.md)).
