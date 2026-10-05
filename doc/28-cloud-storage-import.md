# 28 — Add Documents from Cloud Storage

**Send for signatures > Add document > Cloud** lets a sender pick files from **Google Drive, Dropbox, OneDrive or
Box** instead of uploading them from the computer.

It works in two levels:

1. **Once per installation** — an administrator registers BexSign as an "app" with each provider and enters that
   app's ID and secret in BexSign (sections 3–6). A provider that is not set up shows *"… is not set up yet"*.
2. **Once per user** — each person clicks **Connect** and signs in to *their own* cloud account in a popup. After
   that the dialog shows their folders and files.

You only need to set up the providers your team uses. Each takes about ten minutes.

Client: `client/src/components/documents/CloudImportModal.jsx` (opened from `SendForSignatures.jsx`).
Server: `server/routes/cloud.js` (`/api/cloud`), `server/utils/cloudStorage.js`.
Table: `cloud_connections` (created automatically).

---

## 1. How it behaves for the sender

1. **Add document > Cloud** opens the dialog with the four providers on the left and their state: *Not set up*,
   *Not connected*, or the connected account's email.
2. **Connect** opens the provider's own sign-in window. BexSign asks for **read-only** access; it cannot change or
   delete anything.
3. When the window closes the dialog shows the account: folders first, then files. Click a folder to open it, use
   the path at the top to go back, or type in the search box to search by file name.
4. Tick one or more files and click **Add documents**. They are added to the request exactly like uploaded files.
5. **Disconnect** removes the stored connection (and asks the provider to forget it).

What can be added: **PDF, DOC, DOCX, PNG, JPG, TXT, MD**, up to **25 MB** each. Google Docs, Sheets and Slides are
exported as PDF. Other files are listed greyed out with the reason.

**Document text.** BexSign signs the text of a document. For a PDF, a `.docx`, a text file or a Google Doc the server
reads the text out of the file and uses it as the document text. An image, a scanned PDF or an old `.doc` has no
readable text: the file is added, a notice says so, and the sender checks the text before sending.

---

## 2. The address you will need: the redirect URI

Each provider asks where to send the browser back after sign-in. It is the **API address** plus a fixed path:

| Provider | Redirect URI (local development) |
|---|---|
| Google Drive | `http://localhost:5000/api/cloud/google-drive/callback` |
| Dropbox | `http://localhost:5000/api/cloud/dropbox-files/callback` |
| OneDrive | `http://localhost:5000/api/cloud/onedrive/callback` |
| Box | `http://localhost:5000/api/cloud/box/callback` |

On a live server replace `http://localhost:5000` with the public API address (`PUBLIC_API_URL` in `server/.env`),
for example `https://sign.example.com/api/cloud/google-drive/callback`.

Each provider's **Configure** page in **Settings > Integrations** shows the exact URI of your server with a copy
button. It must match character for character.

---

## 3. Google Drive

1. Open **https://console.cloud.google.com/** and select your project (or create one: project picker > **New
   project**). You can reuse the project made for Google sign-in ([27](27-google-microsoft-sign-in.md)).
2. **Enable the API**: **APIs & Services** > **Library** > search **Google Drive API** > **Enable**.
3. **Consent screen**: **APIs & Services** > **OAuth consent screen**.
   1. Fill in app name and emails if this is a new project.
   2. **Scopes** (or **Data access**) > **Add or remove scopes** > tick `.../auth/drive.readonly`
      ("See and download all your Google Drive files") > **Update** > **Save**.
   3. While the publishing status is **Testing**, add each Google account that will connect under **Test users**
      (up to 100).
4. **Create the client**: **Credentials** > **Create credentials** > **OAuth client ID** > **Web application**.
   Under **Authorized redirect URIs** add `http://localhost:5000/api/cloud/google-drive/callback`. **Create**.
   (Reusing the sign-in client is fine: just add this redirect URI to it.)
5. Copy the **Client ID** and **Client secret**.
6. In BexSign: **Settings > Integrations > Google Drive > Configure** > paste both > **Test connection** > **Save**.

> **About Google's review.** `drive.readonly` is a *restricted* scope. In **Testing** mode it works straight away for
> the test users you listed, and a **Google Workspace** organization can mark the app **Internal** and skip review
> entirely. Publishing it to any Google account requires Google's verification (and, for restricted scopes, a
> security assessment). For a company tool, Internal or Testing is the practical choice.
>
> In Testing mode Google expires the connection after 7 days; the user simply clicks Connect again.

## 4. Dropbox

1. Open **https://www.dropbox.com/developers/apps** and sign in > **Create app**.
2. **Choose an API**: *Scoped access*. **Type of access**: *Full Dropbox* (so people can pick any of their files).
   Name the app, for example `BexSign-YourCompany` (the name must be unique across Dropbox) > **Create app**.
3. **Permissions** tab: tick `account_info.read`, `files.metadata.read` and `files.content.read` > **Submit**.
   Do this *before* anyone connects: permissions are fixed at the moment an account connects.
4. **Settings** tab > **OAuth 2** > **Redirect URIs**: add
   `http://localhost:5000/api/cloud/dropbox-files/callback` > **Add**.
5. Still on Settings, copy the **App key** and click **Show** to copy the **App secret**.
6. In BexSign: **Settings > Integrations > Dropbox file import > Configure** > paste the App key and App secret >
   **Test connection** (Dropbox confirms the pair) > **Save**.

> A new Dropbox app is in **development** status: up to 50 Dropbox accounts can connect (click *Enable additional
> users* on the Settings tab). For more, apply for **production** on the same page.
>
> *Dropbox file import* is separate from the existing **Dropbox** integration, which **saves** completed documents to
> one Dropbox folder using an access token. You can use either or both.

## 5. OneDrive

1. Open **https://entra.microsoft.com/** > **Identity** > **Applications** > **App registrations**.
   Reuse the app made for Microsoft sign-in, or **New registration** (name `BexSign`, choose the supported account
   types — include *personal Microsoft accounts* if people use personal OneDrive).
2. **Authentication** > **Add a platform** > **Web** (or **Add URI** if Web exists) >
   `http://localhost:5000/api/cloud/onedrive/callback` > **Save**.
3. **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions** > tick
   `Files.Read`, `User.Read` and `offline_access` > **Add permissions**. If your organization requires it, click
   **Grant admin consent**.
4. **Certificates & secrets** > **New client secret** > copy the **Value** immediately (shown once).
5. From **Overview** copy the **Application (client) ID** and, for a single-organization app, the
   **Directory (tenant) ID**.
6. In BexSign: **Settings > Integrations > OneDrive > Configure** > paste the client ID and secret. **Directory
   (tenant) ID**: `common` (work, school and personal accounts), `organizations`, `consumers` (personal only) or your
   tenant ID (your organization only) — it must agree with the supported account types of step 1.
   **Test connection** > **Save**.

> `Files.Read` covers the person's own OneDrive. The client secret expires on the date you chose: renew it before then.

## 6. Box

1. Open **https://app.box.com/developers/console** > **Create Platform App** (or **Create New App**) >
   **Custom App**.
2. Authentication method: **User Authentication (OAuth 2.0)**. Name the app `BexSign` > **Create App**.
3. **Configuration** tab:
   1. **OAuth 2.0 Redirect URI**: `http://localhost:5000/api/cloud/box/callback`.
   2. **Application Scopes**: tick **Read all files and folders stored in Box**. Leave the others off.
   3. **Save Changes** (top right).
4. Copy the **Client ID** and **Client Secret** from **OAuth 2.0 Credentials** on the same tab.
5. In BexSign: **Settings > Integrations > Box > Configure** > paste both > **Test connection** > **Save**.

> In a Box Enterprise account an admin may have to approve the app first: Admin Console > **Apps** > **Custom Apps
> Manager**.

---

## 7. Alternative: credentials in `server/.env`

The Integrations pages are recommended (encrypted, no restart). The same values can be put in `server/.env`; a
configured integration wins over them.

```
GOOGLE_DRIVE_CLIENT_ID=            # falls back to GOOGLE_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET=        # falls back to GOOGLE_CLIENT_SECRET
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
ONEDRIVE_CLIENT_ID=                # falls back to MICROSOFT_CLIENT_ID
ONEDRIVE_CLIENT_SECRET=            # falls back to MICROSOFT_CLIENT_SECRET
ONEDRIVE_TENANT=common             # falls back to MICROSOFT_TENANT
BOX_CLIENT_ID=
BOX_CLIENT_SECRET=
```

Restart the server after changing `.env`.

To hide a provider from the dialog, switch its integration off (or untick *Offer … in "Add document > Cloud"*).

---

## 8. Going live checklist

1. `PUBLIC_API_URL` and `CLIENT_URL` in `server/.env` are the public addresses (https).
2. In **every** provider console add the live redirect URI next to the local one.
3. Keep `INTEGRATION_SECRET_KEY` (or `JWT_SECRET`) unchanged: it encrypts the stored secrets and tokens. If it
   changes, the app credentials must be entered again and every user reconnects.
4. Providers require **https** for redirect URIs (only `localhost` may use http).

---

## 9. How it works

| Step | What happens |
|---|---|
| Connect | `POST /api/cloud/:provider/connect` returns the provider's consent URL with a signed 10-minute `state` that names the user. The client opens it in a popup. |
| Return | The provider calls `GET /api/cloud/:provider/callback`. The server swaps the code for an access token and a refresh token, reads the account's email, and stores the tokens **encrypted** (AES-256-GCM) in `cloud_connections`, one row per user and provider. The popup closes. |
| Browse | `GET /api/cloud/:provider/files?folder=&q=&cursor=` lists a folder or searches by name. An expired access token is renewed with the refresh token automatically. |
| Add | `POST /api/cloud/:provider/import { fileId }` downloads the file on the server, checks type and size, reads its text, and returns both. The client adds it to the request like an uploaded file. |
| Disconnect | `DELETE /api/cloud/:provider` asks the provider to revoke the grant and deletes the row. |

Tokens never reach the browser. Requested access per provider:

| Provider | Scope |
|---|---|
| Google Drive | `drive.readonly` |
| Dropbox | `account_info.read files.metadata.read files.content.read` |
| OneDrive | `offline_access User.Read Files.Read` |
| Box | the app's "Read all files and folders" scope |

Endpoints (all need a signed-in user except the callback; connect, files and import need `documents.create`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/cloud/providers` | providers, whether each is set up and connected for this user |
| POST | `/api/cloud/:provider/connect` | consent URL |
| GET | `/api/cloud/:provider/callback` | provider return (public) |
| GET | `/api/cloud/:provider/files` | folders and files |
| POST | `/api/cloud/:provider/import` | download one file |
| DELETE | `/api/cloud/:provider` | disconnect |

`:provider` is `google-drive`, `dropbox-files`, `onedrive` or `box`.

---

## 10. Troubleshooting

| What you see | Cause and fix |
|---|---|
| "… is not set up yet" | No app credentials for that provider. Do its section above. A user without **Settings > Integrations** permission sees "Ask a manager to set it up". |
| The sign-in window does not open | The browser blocked the popup. Use the link "The window was blocked: open it here", or allow popups for the app. |
| Google: `redirect_uri_mismatch` | Add the exact redirect URI to the OAuth client. |
| Google: `access_denied`, app not verified / being tested | The account is not a test user of the consent screen. |
| Google: "Google Drive API has not been used in project…" | Enable the Google Drive API (section 3, step 2). |
| Dropbox: "Invalid redirect_uri" | Add the redirect URI on the app's Settings tab. |
| Dropbox: a folder lists but files fail with a permission error | Permissions were ticked after the account connected. Disconnect and connect again. |
| OneDrive: `AADSTS50011` | Redirect URI missing under Authentication > Web. |
| OneDrive: `AADSTS65001` or "needs admin approval" | An administrator must grant consent for `Files.Read` (API permissions > Grant admin consent). |
| Box: `redirect_uri_mismatch` | The Redirect URI on the Configuration tab differs. Save Changes after editing. |
| "The connection to this account has expired. Connect it again." | The person removed BexSign from their account, the refresh token ran out, or (Google, Testing mode) seven days passed. Click Connect. |
| "This file type cannot be signed" / "Larger than 25 MB" | Only the listed types up to 25 MB can be added. |
| A file was added but the text is a generic sample | The file has no readable text (image, scan, `.doc`). Edit the document text, or use a PDF or `.docx` with real text. |
| Everyone must reconnect after a server move | `INTEGRATION_SECRET_KEY` / `JWT_SECRET` changed, so the stored tokens cannot be decrypted. |
