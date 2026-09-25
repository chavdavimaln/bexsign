# 14 — Integrations

Connect BexSign to the apps your team already uses: a CRM, sign-in with Google or Microsoft, identity checks,
cloud storage, automation, team chat, or any system that accepts a webhook.

Pages: `client/src/pages/settings/Integrations.jsx` (the catalogue), `client/src/pages/settings/IntegrationDetail.jsx`
(one app's Configure page), `client/src/components/integrations/integrationUi.jsx`.
Server: `server/routes/integrations.js` (mounted at `/api/integrations`), `server/utils/integrationCatalog.js` (what
each app needs), `server/utils/integrationStore.js` (saving, encryption, tests, delivery), `server/routes/oauth.js`
(“Continue with Google / Microsoft”).
Tables: `integration_connections`, `integration_activity` — see [16 — Database](16-database.md).

**Sidebar:** Settings → **Integrations** (`/settings/integrations`). One app's page is
`/settings/integrations/:key`, e.g. `/settings/integrations/slack`. The old `/integrations` link redirects here.

---

## 1. Overview

| | |
|---|---|
| **Who can see it** | Everyone who is signed in can open the page and see which apps are connected. |
| **Who can change it** | People with the `settings.integrations` permission (**Settings → Integrations**). Everybody else sees the Configure page read-only, with a notice saying so. |
| **What an integration does** | Either it **receives signing events** (Bexcode CRM, Zapier, Slack, Dropbox, custom integrations), or it **supplies settings** (Google Workspace and Microsoft 365 for sign-in, Stripe Identity for verification rules). |
| **One connection per app** | Each built-in app can be configured once for the whole organisation. You can add as many custom integrations as you like. |
| **Independent of the Developer API** | Integrations get their events whether or not the public API is turned on in Developer settings. Webhooks registered under Developer API are a separate feature — [15 — API Reference](15-api.md). |

### The catalogue page

- **Stat cards:** *Connected*, *Available* (not configured yet), *Events delivered*, *Needs attention*. Clicking
  Connected, Available or Needs attention filters the list.
- **Category chips:** All apps, CRM, Sign-in & identity, Identity verification, Cloud storage, Automation,
  Team messaging, Custom — each with its count.
- **Status filter:** Any status, Connected, Not configured, Turned off, Needs attention.
- **Search** by app name.
- **Recent activity:** the latest 8 tests and deliveries across all integrations.
- **Add integration** (managers only) — see section 5.

Each app card shows a status badge:

| Badge | Meaning |
|---|---|
| Not configured | Nothing has been saved for this app yet |
| Connected | Saved and turned on; the last test and deliveries worked |
| Turned off | Saved, but switched off — no events are sent, sign-in buttons are hidden |
| Needs attention | The last test failed, or a delivery has failed since the last successful one |

---

## 2. Providers

Every provider has **Connection** fields (credentials — secret ones are encrypted) and **Signing workflow**
options (how it behaves with your signature requests). The Configure page shows a **Setup guide** next to the
form; the steps below are the same text.

### 2.1 Bexcode CRM — category CRM

Posts every chosen signing event to your Bexcode CRM, so the deal record shows where the contract is.

| Field | Section | Required | Notes |
|---|---|---|---|
| CRM URL | connection | yes | The address of your Bexcode CRM workspace, e.g. `https://crm.bexcodeservices.com` |
| Workspace ID | connection | | e.g. `BEX-4821`; sent as the `X-Workspace-Id` header |
| CRM API key | connection, **secret** | yes | Sent as `Authorization: Bearer <key>` |
| Events endpoint | connection | | Leave empty to use `<CRM URL>/api/bexsign/events` |
| Attach the signed PDF to the CRM record | signing | | On by default. The `document.completed` event carries download links |
| Log each signing step as a CRM activity | signing | | On by default; sent as `crm.log_activity` |
| Move the deal to this stage when completed | signing | | `Do not change`, `Contract signed` (default), `Closed won`, `Onboarding`; sent as `crm.deal_stage` on the completed event |

Default events: sent, viewed, signed, completed, declined.

**Setup**
1. In Bexcode CRM open Settings > API and create an API key with the "Documents" scope.
2. Paste your CRM URL and the API key here. Add the Workspace ID if your CRM account has more than one workspace.
3. Pick the signing events the CRM should receive and how the deal should change when a document is completed.
4. Click **Test connection**: BexSign sends a ping event to the events endpoint. Save to start sending events.

**Test connection:** posts a `ping` event to the events endpoint with your API key; passes on any 2xx answer.

### 2.2 Google Workspace — category Sign-in & identity

Lets your team use **Continue with Google** on the sign-in and register pages, optionally only from your company
domain. Receives no signing events.

| Field | Section | Required | Notes |
|---|---|---|---|
| OAuth client ID | connection | yes | Must end with `.apps.googleusercontent.com` |
| OAuth client secret | connection, **secret** | yes | `GOCSPX-…` |
| Company domain | connection | | e.g. `bexcodeservices.com` |
| Show "Continue with Google" on the sign-in page | signing | | On by default |
| Only allow accounts from the company domain | signing | | Off by default. Needs the Company domain |
| Create a BexSign account on first Google sign-in | signing | | On by default |

**Setup**
1. In Google Cloud Console create an OAuth client ID of type "Web application".
2. Add the redirect URI shown on the Configure page to "Authorized redirect URIs".
3. Paste the client ID and secret here, and your company domain if you want to limit sign-in to it.
4. Click **Test connection**, then Save. "Continue with Google" on the sign-in page now uses these credentials.

**Test connection:** checks the client ID format and that Google's sign-in service is reachable
(`accounts.google.com/.well-known/openid-configuration`). **It cannot check the secret** — Google only confirms
the secret on the first real “Continue with Google”. Do one test sign-in after saving.

### 2.3 Microsoft 365 — category Sign-in & identity

Lets your team use **Continue with Microsoft** (Microsoft Entra ID work and school accounts), limited to your tenant
or company domain when you want. Receives no signing events.

| Field | Section | Required | Notes |
|---|---|---|---|
| Application (client) ID | connection | yes | A GUID, `00000000-0000-0000-0000-000000000000` |
| Client secret value | connection, **secret** | yes | Copy the secret's **Value**, not its ID |
| Directory (tenant) ID | connection | | Default `common` (any Microsoft account); your tenant ID limits sign-in to your organisation |
| Company domain | connection | | e.g. `bexcodeservices.com` |
| Show "Continue with Microsoft" on the sign-in page | signing | | On by default |
| Only allow accounts from the company domain | signing | | Off by default. Needs the Company domain |
| Create a BexSign account on first Microsoft sign-in | signing | | On by default |

**Setup**
1. In the Microsoft Entra admin center register an application (Web platform).
2. Add the redirect URI shown on the Configure page under Authentication > Web > Redirect URIs.
3. Create a client secret and paste the client ID, secret and tenant ID here.
4. Click **Test connection** to check the tenant, then Save.

**Test connection:** checks the client ID and that the tenant exists (reads
`login.microsoftonline.com/<tenant>/v2.0/.well-known/openid-configuration`; an unknown tenant fails with
“Microsoft does not know the tenant …”). Like Google, **the secret is only confirmed on the first real sign-in.**

### 2.4 Stripe Identity — category Identity verification

Stores your Stripe keys and the **default verification rules** for signature requests (government ID, optional
selfie, live capture).

> **Current limit:** saving this integration and passing the test **does not yet make recipients verify their
> identity** — the signing screen does not enforce Stripe Identity today. The integration keeps the keys and rules
> ready for when verification is added to the signing flow.

| Field | Section | Required | Notes |
|---|---|---|---|
| Publishable key | connection | yes | Must start with `pk_live_` or `pk_test_` |
| Secret key | connection, **secret** | yes | Must start with `sk_` or `rk_` (live or test). A restricted key with "Identity: write" is enough |
| Webhook signing secret | connection, **secret** | | `whsec_…`, optional, for results sent by Stripe |
| Verification type | signing | | `Government ID document` (default) or `ID number` |
| Also require a matching selfie | signing | | Off by default |
| Require a live photo (no uploads) | signing | | On by default |
| Ask for verification | signing | | `Only on requests where the sender turns it on` (default) or `On every signature request` |

**Setup**
1. Activate Identity in your Stripe Dashboard (Settings > Identity).
2. Create a restricted API key with "Identity: write" or use your secret key, and copy the publishable key.
3. Paste both keys here and choose how recipients are verified.
4. Click **Test connection**: BexSign calls the Stripe Identity API with your key. Save to keep the settings.

**Test connection:** lists one Identity verification session with the secret key and reports whether the key is in
`test` or `live` mode.

### 2.5 Dropbox — category Cloud storage

When a request is **completed**, BexSign uploads the signed PDFs (and optionally the Certificate of Completion) to a
Dropbox folder. Runs on one fixed event, `document.completed`.

| Field | Section | Required | Notes |
|---|---|---|---|
| Access token | connection, **secret** | yes | Dropbox App Console > your app > Settings > Generated access token (scope `files.content.write`) |
| Folder | connection | | Default `/BexSign`; created if it does not exist |
| Upload the Certificate of Completion too | signing | | On by default. Uploaded as `<document> - Certificate of Completion.pdf` |
| Organize files | signing | | `All in one folder`, `One folder per month` (default, `YYYY-MM`), `One folder per request` (`<name> (<id>)`) |

Files are uploaded with Dropbox's `autorename`, so an existing file is never overwritten.

**Setup**
1. In the Dropbox App Console create an app with "Scoped access" and enable files.content.write.
2. Generate an access token on the app's Settings tab.
3. Paste the token and the folder where signed documents should go.
4. Click **Test connection** to check the token, then Save. Completed requests are uploaded automatically.

**Test connection:** reads the Dropbox account the token belongs to and shows its name, email and the target folder.

### 2.6 Zapier — category Automation

Starts a Zap whenever something happens to a signature request, by posting each event to a Zapier **Catch Hook**.

| Field | Section | Required | Notes |
|---|---|---|---|
| Catch Hook URL | connection | yes | `https://hooks.zapier.com/hooks/catch/…` |
| Send a flat payload (easier to map in Zapier) | signing | | On by default. Adds `document_id`, `document_name`, `document_status`, `sender_email`, `recipient_name`, `recipient_email`, `recipient_status`, `completed_at` at the top level, next to the full event |

Default event: completed.

**Setup**
1. In Zapier create a Zap with the trigger "Webhooks by Zapier" > "Catch Hook".
2. Copy the hook URL Zapier gives you and paste it here.
3. Choose which signing events start the Zap.
4. Click **Test connection**: Zapier receives a sample event you can use to map fields. Save and turn the Zap on.

**Test connection:** posts a sample event to the Catch Hook URL.

### 2.7 Slack — category Team messaging

Posts a short message to a channel when documents are sent, viewed, signed, completed, declined or recalled, or a
template is created. Each message links to the document in BexSign; a decline includes the reason.

| Field | Section | Required | Notes |
|---|---|---|---|
| Incoming webhook URL | connection | yes | `https://hooks.slack.com/services/…` |
| Channel name (for your reference) | connection | | e.g. `#contracts` — only a label, the webhook decides the channel |
| Mention @channel when a document is declined | signing | | Off by default |

Default events: completed, declined.

**Setup**
1. In Slack add the "Incoming Webhooks" app and choose the channel for BexSign updates.
2. Copy the webhook URL and paste it here.
3. Pick the events to post, then click **Test connection** to see a message in the channel.

**Test connection:** posts "BexSign is connected to this channel" to the channel.

### 2.8 Custom integration — category Custom

Sends signing events to your own application, an internal tool, or any service that accepts webhooks.
Created with **Add integration** (section 5).

| Field | Section | Required | Notes |
|---|---|---|---|
| Endpoint URL | connection | yes | BexSign posts each event here as JSON |
| Authentication | connection | | `None`, `Bearer token`, `Custom header`, `Basic (user:password)` |
| Header name | connection | | Only for "Custom header", e.g. `X-API-Key` |
| Token / key / user:password | connection, **secret** | | Only for Bearer, Custom header and Basic |
| Signing secret | connection, **secret** | | Leave empty and BexSign generates one (`whsec_…`). Can be revealed on the Configure page |
| Include recipients in the payload | signing | | On by default |
| Include a link to the document in BexSign | signing | | On by default |

Default event: completed.

**Setup**
1. Create an HTTPS endpoint in your system that accepts JSON POST requests.
2. Enter its URL and how BexSign should authenticate.
3. Choose the signing events to send, then click **Test connection** to post a ping event.
4. Verify `X-BexSign-Signature` with the signing secret before trusting a request.

**Test connection:** posts a `ping` event to the endpoint.

### Validation rules when saving

| Rule | Message |
|---|---|
| URL fields must be full `http(s)` URLs (a trailing `/` is removed) | "<Field> must be a full http(s) URL." |
| Required fields must be filled (a saved secret counts) | "<Field> is required." |
| Google client ID format | "A Google OAuth client ID ends with ".apps.googleusercontent.com"." |
| Microsoft client ID format | "The Application (client) ID is a GUID like …" |
| Stripe key prefixes | "The publishable key starts with pk_live_ or pk_test_." / "The secret key starts with sk_ or rk_ (live or test)." |
| Domain restriction needs a domain | "Enter the company domain to limit sign-in to it." |
| Event-receiving apps need at least one event | "Choose at least one signing event." |

---

## 3. Configuring an app, step by step

1. Go to **Settings → Integrations** and click the app's card.
2. Read the **Setup guide** on the right. For Google and Microsoft, copy the **Redirect URI** shown there
   into the provider's console.
3. Fill in the **Connection** card. Secret fields show "Saved ••••••••abcd · leave empty to keep" once a value is
   stored — leave them empty to keep the stored value, type a new one to replace it.
4. Set the **Signing workflow** options.
5. Pick the **Signing events** (apps that receive events only; Dropbox has its one fixed event).
6. Click **Test connection**. The test uses the values *as typed*, even before you save, merged with the secrets
   already stored. The result appears under the button and is recorded as the app's “Last test”.
7. Click **Save & connect** (first time) or **Save changes**. Leaving the page with unsaved changes asks you to
   confirm; **Discard** puts the form back.

The top of the Configure page then shows the counters: **Events** delivered, **Last event**, **Last test**
(Passed / Failed).

### Turning an app on or off

The switch at the top of the Configure page (**Integration is on / off**) keeps every setting but:

- stops all event deliveries while off (only connections with status `connected` receive events);
- for Google / Microsoft, hides the “Continue with …” button and refuses sign-ins through that provider
  (“… sign-in is turned off by your administrator.”).

### Disconnect / Delete

**Disconnect** (built-in apps) or **Delete integration** (custom ones) removes the saved settings, the encrypted
credentials **and the activity log** of that app, and no more events are sent. A built-in app can be configured
again later; a custom integration is gone.

---

## 4. Signing events and payload

The same events as the Developer API webhooks:

| Event | When |
|---|---|
| `document.sent` | A signature request was emailed to its recipients |
| `document.viewed` | A recipient opened the signing link |
| `document.signed` | A recipient signed or approved |
| `document.completed` | Everyone signed; the signed PDF and certificate are ready |
| `document.declined` | A recipient declined to sign |
| `document.recalled` | The sender recalled the request |
| `template.created` | A new template was saved |

Delivery is fire-and-forget in the background: an integration outage never slows down or breaks signing. The
request times out after **10 seconds**. There is no automatic retry for integrations; a failure is recorded in the
activity log and raises the failure counter, which turns the app to **Needs attention**; the next successful
delivery resets the counter.

### Headers (Bexcode CRM, Zapier, custom integrations)

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `User-Agent` | `BexSign-Integrations/1.0` |
| `X-BexSign-Event` | The event, e.g. `document.completed` (`ping` for a test) |
| `X-BexSign-Delivery` | A unique delivery id, `idel_<hex>` |
| `X-BexSign-Signature` | `sha256=<hex HMAC-SHA256 of the raw body, keyed with the signing secret>` — **custom integrations only** (they are the only ones with a signing secret) |
| `Authorization` / custom header | Bexcode CRM: `Bearer <CRM API key>`. Custom: according to the Authentication setting |
| `X-Workspace-Id` | Bexcode CRM, when a Workspace ID is set |

### Body

```json
{
  "id": "evt_4f1c9a…",
  "event": "document.completed",
  "created_at": "2026-09-25T10:14:03.512Z",
  "source": "bexsign",
  "data": {
    "document": {
      "id": 81,
      "name": "Service Agreement",
      "status": "Completed",
      "signing_order": "sequential",
      "created_at": "…", "sent_at": "…", "completed_at": "…",
      "owner": { "id": 4, "name": "Priya Shah", "email": "priya@example.com" },
      "recipients": [
        { "id": 120, "name": "Ravi Patel", "email": "ravi@example.com", "role": "signer", "status": "signed",
          "signing_order": 1, "sent_at": "…", "viewed_at": "…", "signed_at": "…", "declined_at": null }
      ],
      "url": "https://sign.example.com/documents/81"
    },
    "recipient": { "…": "the recipient the event is about (viewed / signed / declined)" },
    "files": {
      "certificate": "https://api.example.com/uploads/completed/81/certificate-of-completion.pdf",
      "download_page": "https://sign.example.com/documents/81"
    }
  }
}
```

- `data.recipient` is present when the event is about one recipient; other event details (such as a decline
  `reason`) are added to `data` as they are raised.
- `data.files` is added to `document.completed` (for Bexcode CRM only when *Attach the signed PDF* is on).
- `template.created` carries `data.template` (`id, title, category, is_shared, created_at, owner`) instead of a
  document.
- Bexcode CRM adds `"crm": { "workspace_id", "log_activity", "deal_stage" }` (`deal_stage` only on completed, and
  `null` when set to *Do not change*).
- Zapier with *flat payload* adds the flat fields listed in 2.6 at the top level.
- Custom: *Include recipients* off removes `data.document.recipients`; *Include a link* off removes
  `data.document.url`.
- A **test** sends the same shape with `"event": "ping"`, `"test": true` and sample data only (document id `0`,
  `recipient@example.com`) — never real people's details.

### Verifying the signature (custom integrations)

Compute the HMAC over the **raw** request body, before parsing JSON:

```js
const crypto = require('crypto');

function isFromBexSign(rawBody, header, secret) {
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return header && expected.length === header.length
    && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}
```

The signing secret can be read with **Reveal** on the custom integration's Configure page (managers only; the
reveal is written to the activity history). Other secrets are never sent back to the browser.

---

## 5. Adding a custom integration

1. **Settings → Integrations → Add integration** (needs `settings.integrations`).
2. Enter a **Name** (required) and a **Description**.
3. Enter the **Endpoint URL**, pick the **Authentication** and fill in the header name / token when asked.
4. Tick the **Signing events to send** (default: Document completed).
5. Click **Add integration**. BexSign creates it with the key `custom-<name>-<random>`, generates a signing secret,
   and the integration is on straight away.
6. Open it from the catalogue to **Test connection**, reveal the signing secret, or change the name and settings.

---

## 6. Activity log

Every integration has an **Activity** list on its Configure page (latest 25 entries; the catalogue shows the latest
8 across all apps). The database keeps the latest **500 entries per integration**.

| Action | Label | Written when |
|---|---|---|
| `connected` | Connected | First save, or a custom integration was created |
| `updated` | Settings saved | A later save |
| `test` | Connection test | Test connection (with the result message, HTTP status, duration) |
| `event` | Event delivered | A signing event was posted (success or failure) |
| `upload` | Files uploaded | Dropbox uploaded the files of a completed request |
| `enabled` / `disabled` | Turned on / Turned off | The on/off switch |

Configuring, turning on/off, adding, disconnecting and revealing a signing secret are also recorded in
**Activity History** (category `integrations`).

---

## 7. Secrets and encryption

- Secret fields (API keys, tokens, client secrets, signing secrets) are encrypted with **AES-256-GCM** before they
  are stored in `integration_connections.secrets` (format `v1:<iv>:<tag>:<data>`, base64).
- The key is the SHA-256 of **`INTEGRATION_SECRET_KEY`** from `server/.env`, falling back to **`JWT_SECRET`**.
- **Keep that value stable.** If it changes, stored secrets can no longer be decrypted: those fields show as not
  set and have to be entered again. Set `INTEGRATION_SECRET_KEY` explicitly on a live server so rotating
  `JWT_SECRET` does not wipe integration credentials.
- The browser only ever receives whether a secret is set and a masked form (`••••••••` plus the last 4 characters).

```env
# server/.env
INTEGRATION_SECRET_KEY=a-long-random-value-that-never-changes
```

---

## 8. Google and Microsoft sign-in

The **Continue with Google** / **Continue with Microsoft** buttons on the sign-in and register pages are driven by
`server/routes/oauth.js` (mounted at `/api/auth/oauth`).

### Where the credentials come from

1. **The integration first.** If the Google Workspace / Microsoft 365 integration has both a client ID and a client
   secret saved, those are used — together with its tenant, domain restriction and sign-up rule.
2. **Otherwise `server/.env`:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`,
   `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT` (default `common`).
3. Neither set: clicking the button returns to the page with "Google sign-in is not set up yet. Configure it in
   Settings > Integrations, or add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to server/.env."

The server caches these settings for 30 seconds; a save, on/off switch or disconnect clears the cache at once.

### Which buttons show

`GET /api/auth/oauth/providers` (public) returns, per provider, `{ label, configured, hidden }`. The sign-in page
hides a button when `hidden` is true — that is, the integration is configured but **turned off**, or
*Show "Continue with …"* is unchecked. If the check fails, both buttons show.

### Redirect URIs

| Provider | Redirect URI to register |
|---|---|
| Google | `<API origin>/api/auth/oauth/google/callback` |
| Microsoft | `<API origin>/api/auth/oauth/microsoft/callback` |

The Configure page shows the exact URI with a copy button. It is built from `PUBLIC_API_URL`, else
`OAUTH_CALLBACK_BASE_URL`, else `http://localhost:<PORT>`. The URI actually sent to Google/Microsoft during sign-in
is built from `OAUTH_CALLBACK_BASE_URL`, else the request's own origin. **On a live server set
`OAUTH_CALLBACK_BASE_URL`** (e.g. `https://sign.example.com`) so both are the same and match what you registered.

### Rules applied at sign-in

| Setting | Effect |
|---|---|
| Only allow accounts from the company domain | Google shows only accounts of that domain (`hd` parameter). For both providers the server refuses any email not ending in `@<domain>` ("Only <domain> accounts can sign in with Google.") and records a failed-access entry |
| Create a BexSign account on first sign-in | Off: a person without a BexSign account is refused ("There is no BexSign account for … Ask your administrator to add you."). On: an account is created with a random password (password sign-in stays closed until "Forgot password?") and holders of `users.view` are notified |
| Directory (tenant) ID (Microsoft) | Sign-in goes to `login.microsoftonline.com/<tenant>/…` |
| Deactivated accounts | Always refused, logged as a failed sign-in |

Every sign-in is written to `user_login_logs` and Activity History ("Signed in with Google").

### The flow

1. `GET /api/auth/oauth/:provider?mode=login|register` → redirect to the provider's consent screen (state valid
   10 minutes).
2. The provider returns to `/api/auth/oauth/:provider/callback`; BexSign exchanges the code, reads the profile,
   applies the rules above, and redirects to `<CLIENT_URL>/oauth/callback?ticket=…` (ticket valid 2 minutes).
3. The client page `/oauth/callback` calls `POST /api/auth/oauth/exchange { ticket }` and receives the usual
   `{ token, user }` session.

---

## 9. API endpoints

`/api/integrations` — all need a signed-in user.

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/` | any signed-in user | Every built-in app with its connection (or `null`), custom integrations, recent activity, categories, events, the custom template, `canManage` |
| POST | `/custom` | `settings.integrations` | Create a custom integration `{ name, description, config, secrets, events }` |
| GET | `/:key` | any signed-in user | One app: provider definition (fields, steps, test, redirect URI), connection, latest 25 activity rows, events, `canManage` |
| PUT | `/:key` | `settings.integrations` | Save `{ config, secrets, events, enabled, name?, description? }`. An empty secret keeps the stored one; `null` clears it |
| POST | `/:key/test` | `settings.integrations` | Test with `{ config?, secrets?, events? }` (unsaved values are tested as typed). Returns `{ ok, message, statusCode, durationMs }` |
| POST | `/:key/enable` | `settings.integrations` | Turn on/off `{ enabled }`. 404 "Configure this integration first." if never saved |
| POST | `/:key/reveal-signing-secret` | `settings.integrations` | Custom integrations only: returns `{ secret }` |
| DELETE | `/:key` | `settings.integrations` | Disconnect: remove settings, secrets and activity |

`/api/auth/oauth` — public.

| Method | Path | Purpose |
|---|---|---|
| GET | `/providers` | Which sign-in buttons to show: `{ google: { label, configured, hidden }, microsoft: {…} }` |
| GET | `/:provider?mode=login\|register` | Start Google / Microsoft sign-in |
| GET | `/:provider/callback` | Provider callback |
| POST | `/exchange` | Swap the 2-minute ticket for `{ token, user }` |

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "The test event was not accepted: HTTP 401/403" | The endpoint rejected the credentials — check the CRM API key or the custom Authentication settings |
| "Timed out after 10 s" | The endpoint did not answer within 10 seconds; it must answer quickly (queue the work on your side) |
| Google test passes but sign-in fails with `invalid_client` | The secret is wrong — the test cannot check it. Paste the secret again |
| Google/Microsoft: `redirect_uri_mismatch` | The registered redirect URI differs from the one BexSign sends. Set `OAUTH_CALLBACK_BASE_URL` and register exactly the URI on the Configure page |
| "Microsoft does not know the tenant …" | Wrong Directory (tenant) ID; use your tenant GUID or `common` |
| "Continue with Google" disappeared | The integration is turned off, or *Show "Continue with Google"* is unchecked |
| "Only <domain> accounts can sign in…" | Domain restriction is on and the person used another account |
| Secrets show as not set after a deploy | `INTEGRATION_SECRET_KEY` (or `JWT_SECRET`) changed — re-enter the secrets and keep the key stable |
| Dropbox: "Dropbox refused …" | The token expired or lacks `files.content.write`; generate a new token |
| App shows **Needs attention** | Open its Activity list. A passing **Test connection** clears a failed test; the next successful delivery resets the failure counter. Both must be clean |
| Stripe Identity is connected but signers are not asked to verify | Expected today — see the limit in 2.4 |

**Careful:** endpoint URLs are not restricted to public addresses, so an internal URL can be configured (SSRF).
Only give `settings.integrations` to people you trust.
