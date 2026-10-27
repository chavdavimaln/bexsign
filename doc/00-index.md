# BexSign Documentation

Electronic signatures and document workflow: **React 18 + Vite** client, **Express 4 + MySQL** server.
Start with [01 — Installation](01-installation.md); to put it on a server, go to
[21 — Live Server Deployment](21-live-server-deployment.md).

## Getting started
| | |
|---|---|
| [01 — Installation](01-installation.md) | Run it locally, step by step |
| [02 — Project Structure](02-project-structure.md) | Where everything lives and the conventions to follow |
| [03 — Authentication](03-authentication.md) | Sign in, sessions, password reset |

## Using the product
| | |
|---|---|
| [04 — Dashboard](04-dashboard.md) | The landing screen |
| [05 — Documents](05-documents.md) | Lists, document details, actions |
| [06 — Send for Signatures](06-sending-signatures.md) | Create and send a request, signing order, field visibility |
| [07 — Received Requests](07-receiving-signatures.md) | When somebody asks you to sign |
| [08 — Signing](08-signing.md) | The recipient's experience |
| [09 — Templates](09-templates.md) | The 100-template library and your own |
| [10 — Reports](10-reports.md) | Overview, timeline, scheduled reports |
| [11 — Contacts](11-contacts.md) | Contact book: synced from sent requests, import/export, tags, recipient suggestions |
| [12 — Signatures](12-signatures.md) | Your stamps, the team directory, usage history |
| [13 — Notifications](13-notifications.md) | Bell, page, preferences |
| [22 — Sign Yourself](22-sign-yourself.md) | Documents you sign on your own |
| [23 — Verify & Confirm](23-verify-and-confirm.md) | The final check on a completed request |
| [24 — Trash](24-trash.md) | Restore or permanently delete documents, self-sign documents, templates, signatures, contacts; retention |
| [26 — Settings Navigation](26-settings-navigation.md) | The Settings sidebar, every settings route, old-link redirects |

## Platform and integration
| | |
|---|---|
| [14 — Integrations](14-integrations.md) | Bexcode CRM, Google / Microsoft sign-in, Stripe Identity, Dropbox, Zapier, Slack, custom webhooks |
| [27 — Google and Microsoft Sign-in](27-google-microsoft-sign-in.md) | Creating the Google and Microsoft credentials and entering them, step by step |
| [28 — Cloud Storage Import](28-cloud-storage-import.md) | Add document > Cloud: setting up Google Drive, Dropbox, OneDrive and Box |
| [29 — Mail Merge Template](29-mail-merge.md) | One template, a personal signature request for every recipient row |
| [15 — API Reference](15-api.md) | Every endpoint |
| [25 — OAuth Apps](25-oauth-apps.md) | OAuth client credentials for external apps: tokens, revoke, introspect |
| [16 — Database](16-database.md) | Every table, who writes it, how to query it |
| [30 — Database Migration](30-database-migration.md) | `npm run db:migrate`: create or update the database on any server, safely |
| [17 — Email](17-email.md) | SMTP, the messages, dry-run mode |
| [18 — Storage and PDFs](18-storage.md) | Uploads, signed PDFs, certificates, fingerprints |
| [34 — Reading an Uploaded Document](34-document-contents.md) | How a PDF, Word file, scan or picture becomes the text on the page |
| [31 — The Doc Bucket](31-doc-bucket.md) | One setting decides where documents are kept: this server, S3, Azure or Google Cloud — and how to use it from backend code |
| [33 — Popup Modals](33-popup-modals.md) | Messages, confirmations and prompts: no browser `alert`, `confirm` or `prompt` anywhere |
| [35 — Recovering a Deleted Document](35-document-archive.md) | The archive under "delete for good" for requests, self-sign documents and templates, and how a developer hands one back |
| [19 — Security](19-security.md) | Roles, the 34 permissions, what is logged |

## Running it for real
| | |
|---|---|
| [20 — Deployment Overview](20-deployment.md) | The shape of a deployment, in one page |
| [21 — Live Server Deployment](21-live-server-deployment.md) | Full instructions, NGINX, backups, troubleshooting |
| [32 — Documents in AWS S3](32-s3-document-storage-live.md) | The runbook for storing documents in S3 on the live server, and moving the existing ones |
| [Local vs Live](server_integration_local_live.md) | Exactly what differs between a laptop and a server |

## The rule that keeps it portable

No file contains a hard-coded address. The client resolves the API through `client/src/utils/api.js`
(`VITE_API_URL`, else localhost in development, else the origin serving the app), and the server takes its
database, mail, public URL and allowed origins from `server/.env`. The same build runs on a laptop and on a live
server — see [21](21-live-server-deployment.md).
