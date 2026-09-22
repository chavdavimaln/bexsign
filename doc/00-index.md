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
| [11 — Contacts](11-contacts.md) | Address book |
| [12 — Signatures](12-signatures.md) | Your stamps, the team directory, usage history |
| [13 — Notifications](13-notifications.md) | Bell, page, preferences |
| [22 — Sign Yourself](22-sign-yourself.md) | Documents you sign on your own |
| [23 — Verify & Confirm](23-verify-and-confirm.md) | The final check on a completed request |

## Platform and integration
| | |
|---|---|
| [14 — Integrations](14-integrations.md) | Webhooks, the public API, what is not built yet |
| [15 — API Reference](15-api.md) | Every endpoint |
| [16 — Database](16-database.md) | Every table, who writes it, how to query it |
| [17 — Email](17-email.md) | SMTP, the messages, dry-run mode |
| [18 — Storage and PDFs](18-storage.md) | Uploads, signed PDFs, certificates, fingerprints |
| [19 — Security](19-security.md) | Roles, the 33 permissions, what is logged |

## Running it for real
| | |
|---|---|
| [20 — Deployment Overview](20-deployment.md) | The shape of a deployment, in one page |
| [21 — Live Server Deployment](21-live-server-deployment.md) | Full instructions, NGINX, backups, troubleshooting |
| [Local vs Live](server_integration_local_live.md) | Exactly what differs between a laptop and a server |

## The rule that keeps it portable

No file contains a hard-coded address. The client resolves the API through `client/src/utils/api.js`
(`VITE_API_URL`, else localhost in development, else the origin serving the app), and the server takes its
database, mail, public URL and allowed origins from `server/.env`. The same build runs on a laptop and on a live
server — see [21](21-live-server-deployment.md).
