# 27 — Sign in with Google and Microsoft

"Sign in with Google" and "Sign in with Microsoft" on the login and register pages. The code is complete; what each
installation needs is its **own credentials** (a client ID and a client secret) from Google and from Microsoft.
Nobody else can create these for you: they are issued inside your Google Cloud and Microsoft Entra accounts.

Until the credentials are entered, the two buttons show *"… sign-in is not set up on this server yet"* and nothing
else happens.

Client: `client/src/components/auth/SocialAuthButtons.jsx`, `client/src/pages/OAuthCallback.jsx`.
Server: `server/routes/oauth.js` (`/api/auth/oauth`), credentials read through `server/utils/integrationStore.js`.

---

## 1. Before you start: the two addresses

Every step below uses two addresses. Write them down first.

| | Local development | Live server (example) |
|---|---|---|
| **App address** (where people open BexSign) | `http://localhost:3003` | `https://sign.example.com` |
| **API address** (the BexSign server) | `http://localhost:5000` | `https://sign.example.com` |

The **redirect URI** is where Google or Microsoft sends the browser back after the person has signed in. It is always
the API address followed by a fixed path:

| Provider | Redirect URI (local) |
|---|---|
| Google | `http://localhost:5000/api/auth/oauth/google/callback` |
| Microsoft | `http://localhost:5000/api/auth/oauth/microsoft/callback` |

On a live server replace `http://localhost:5000` with your API address, for example
`https://sign.example.com/api/auth/oauth/google/callback`.

> The redirect URI must match **exactly**: same `http`/`https`, same host, same port, no trailing slash. A mismatch is
> the most common reason sign-in fails (Google: `redirect_uri_mismatch`, Microsoft: `AADSTS50011`).

You do not have to type these by hand: **Settings > Integrations > Google Workspace** (or **Microsoft 365**) shows the
exact redirect URI of your server with a copy button.

On a live server set these in `server/.env` so the shown and used address is the public one:

```
CLIENT_URL=https://sign.example.com
PUBLIC_API_URL=https://sign.example.com
```

---

## 2. Google — create the credentials

You need a Google account that may use Google Cloud Console (any Gmail or Google Workspace account).

1. Open **https://console.cloud.google.com/** and sign in.
2. **Create a project**: project picker at the top > **New project** > name it `BexSign` > **Create**. Make sure the
   new project is selected in the picker.
3. **Consent screen**: menu > **APIs & Services** > **OAuth consent screen** (newer consoles call it
   **Google Auth Platform** > **Branding** / **Audience**).
   1. User type: **Internal** if only people of your Google Workspace organization sign in; **External** for any
      Google account.
   2. App name `BexSign`, user support email, developer contact email > **Save**.
   3. Scopes: add `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (the three basic sign-in scopes).
   4. *External only*: while the app is in **Testing**, add every Google account that should be able to sign in under
      **Test users**. To let any Google account in, click **Publish app** (these basic scopes need no Google review).
4. **Create the client**: **APIs & Services** > **Credentials** > **Create credentials** > **OAuth client ID**.
   1. Application type: **Web application**. Name: `BexSign sign-in`.
   2. **Authorized JavaScript origins**: add the app address (`http://localhost:3003`).
   3. **Authorized redirect URIs**: add the Google redirect URI from section 1
      (`http://localhost:5000/api/auth/oauth/google/callback`). Add the live one as a second line when you go live.
   4. **Create**.
5. A dialog shows the **Client ID** (ends with `.apps.googleusercontent.com`) and the **Client secret** (starts with
   `GOCSPX-`). Copy both. The secret can be shown again later under Credentials > your client.

## 3. Google — enter the credentials in BexSign

1. Sign in to BexSign as a manager (permission **Settings > Integrations**).
2. **Settings > Integrations > Google Workspace > Configure**.
3. Paste the **OAuth client ID** and the **OAuth client secret**.
4. Optional:
   - **Company domain** `yourcompany.com` and **Only allow accounts from the company domain** — every other Google
     account is refused.
   - **Create a BexSign account on first Google sign-in** — off means only people who already have a BexSign account
     can use the button.
   - **Show "Continue with Google" on the sign-in page** — off hides the button.
5. Click **Test connection**. BexSign asks Google whether it recognises the client ID and secret:
   - *"Google recognised the client ID and secret"* — good.
   - *"Google does not recognise this client ID and secret"* — copy both again from the console.
6. **Save**. The button works immediately; the server does not need a restart.

**Check it:** sign out, open the login page, click **Sign in with Google**, pick an account. You land on the dashboard.

---

## 4. Microsoft — create the credentials

You need an account that may register applications in Microsoft Entra ID (formerly Azure Active Directory). A free
Azure account is enough.

1. Open **https://entra.microsoft.com/** (or https://portal.azure.com/ > Microsoft Entra ID) and sign in.
2. **Identity** > **Applications** > **App registrations** > **New registration**.
   1. Name: `BexSign`.
   2. **Supported account types** — choose who may sign in:
      - *Accounts in this organizational directory only* — only your company (single tenant).
      - *Accounts in any organizational directory and personal Microsoft accounts* — everyone.
   3. **Redirect URI**: platform **Web**, value the Microsoft redirect URI from section 1
      (`http://localhost:5000/api/auth/oauth/microsoft/callback`).
   4. **Register**.
3. On the **Overview** page copy:
   - **Application (client) ID** — a GUID such as `1a2b3c4d-....`
   - **Directory (tenant) ID** — needed only for the single-tenant choice.
4. **Certificates & secrets** > **Client secrets** > **New client secret** > description `BexSign`, pick an expiry >
   **Add**. Copy the **Value** column **now** — it is shown only once. (Not the "Secret ID" column.)
5. **API permissions**: `User.Read` (Microsoft Graph, delegated) is there by default; that is all sign-in needs. If
   your organization requires it, click **Grant admin consent**.
6. Going live later: **Authentication** > **Web** > **Add URI** and add the live redirect URI.

> A client secret **expires** (6 to 24 months). Put a reminder in your calendar: after that date Microsoft sign-in stops
> until a new secret is created and pasted into BexSign.

## 5. Microsoft — enter the credentials in BexSign

1. **Settings > Integrations > Microsoft 365 > Configure**.
2. Paste the **Application (client) ID** and the **Client secret value**.
3. **Directory (tenant) ID**:

   | You chose in step 4.2 | Enter |
   |---|---|
   | Any organization and personal accounts | `common` |
   | Only work or school accounts, any organization | `organizations` |
   | Only personal Microsoft accounts | `consumers` |
   | Only your organization | your Directory (tenant) ID |

4. Optional: company domain, "only allow accounts from the company domain", "create an account on first sign-in",
   "show the button" — same meaning as for Google.
5. **Test connection** checks that the tenant exists. Microsoft does not confirm a secret without a real sign-in, so
   the secret is proven by the first sign-in.
6. **Save**.

**Check it:** sign out, click **Sign in with Microsoft**, pick an account. You land on the dashboard.

---

## 6. Alternative: credentials in `server/.env`

The Integrations page is the recommended place (encrypted, changeable without a restart). The same credentials can
instead be put in `server/.env`; a configured integration always wins over these values.

```
GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
MICROSOFT_CLIENT_ID=00000000-0000-0000-0000-000000000000
MICROSOFT_CLIENT_SECRET=xxxxxxxx
MICROSOFT_TENANT=common
# Only when the API is reached under a different public address than PUBLIC_API_URL
OAUTH_CALLBACK_BASE_URL=
```

Restart the server after changing `.env` (`npm start` in `server/`).

---

## 7. What happens when someone signs in

1. The button opens `GET /api/auth/oauth/google?mode=login` (or `microsoft`, or `mode=register`).
2. The server sends the browser to the provider's consent screen with a signed, 10-minute `state`.
3. The provider returns to the redirect URI with a one-time code.
4. The server swaps the code for the person's email and name (server to server, using the client secret).
5. The email decides the account:
   - an existing BexSign user with that email is signed in (a deactivated account is refused);
   - otherwise a new account is created — unless "create an account on first sign-in" is off.
6. The browser goes to `<app address>/oauth/callback?ticket=…`; the app swaps the 2-minute ticket for the normal
   session. The provider's tokens are never stored and never reach the browser.

Accounts created this way have no usable password; "Forgot password?" sets one if the person wants both.

---

## 8. Troubleshooting

| What you see | Cause and fix |
|---|---|
| "… sign-in is not set up on this server yet" | No credentials. Do sections 2–3 or 4–5. |
| "… sign-in is turned off by your administrator" | The integration is switched off or "Show the button" is off. |
| Google: `Error 400: redirect_uri_mismatch` | The redirect URI in Google Cloud is not exactly the one BexSign shows. Copy it from the Configure page. |
| Google: `Error 403: access_denied`, "app is being tested" | The consent screen is in Testing and this account is not a test user. Add it or publish the app. |
| Google: `Error 401: invalid_client` | Wrong client ID, or the client was deleted. |
| Microsoft: `AADSTS50011` | Redirect URI mismatch. Add the exact URI under Authentication > Web. |
| Microsoft: `AADSTS7000215` or `AADSTS7000222` | Wrong or expired secret. Create a new secret and paste its **Value**. |
| Microsoft: `AADSTS50020` / `AADSTS700016` | The account is not in the allowed tenant, or the tenant field does not match "Supported account types". |
| "Only yourcompany.com accounts can sign in" | Domain restriction is on and the account is from another domain. |
| "There is no BexSign account for …" | "Create an account on first sign-in" is off. Add the user first under Users. |
| "The sign-in session expired" | More than 10 minutes on the consent screen, or `JWT_SECRET` changed in between. Try again. |
| After sign-in the browser opens the wrong site | `CLIENT_URL` in `server/.env` is not the app address. |

Sign-ins and refusals are recorded under **Settings > Activity history** and **Failed access**.
