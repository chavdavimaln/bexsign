# 16 — Database Reference

Database: **`db_bex_sign`** (MySQL / MariaDB, `utf8mb4`). Connection settings come from `server/.env`
(`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`) and the pool is created in `server/db.js`.

This document says **what each table is for, which module owns it, and which code reads or writes it**, so you can
trace any screen back to its rows.

---

## 1. How the schema is created and changed

There is no migration tool. The server builds and patches its own schema while it boots, and every routine is
idempotent — running it again changes nothing.

| Routine | File | Creates / patches |
|---|---|---|
| `ensureRequestSchema()` | `server/utils/requestHelpers.js` | Missing columns on `documents`, `document_recipients`, `document_files` |
| `ensurePlatformSchema()` | `server/utils/platformSchema.js` | Permissions, notifications, settings, security-log, report and webhook tables; seeds the permission catalogue and default role grants |
| `ensureSigningFlowSchema()` | `server/utils/signingFlow.js` | `document_signing_flow`, `signing_email_dispatch` |
| `ensureEmployeeSignaturesTable()` | `server/utils/documentIdentifier.js` | `employee_signatures` (+ demo rows when empty) |
| `ensureValiditySchema()` | `server/utils/validityLog.js` | `document_validity` columns and indexes |
| `ensureWorkspaceSchema()` | `server/utils/workspaceSchema.js` | `integration_connections`, `integration_activity`, `signing_contacts`, `trash_items`, `oauth_apps`, `oauth_access_tokens`; adds `general_settings.trash_retention_days` and `api_logs.oauth_app_id`. Runs from `ensurePlatformSchema()` |

**Writing a new module?** Follow `server/utils/signingFlow.js`: one `ensureXSchema()` with
`CREATE TABLE IF NOT EXISTS`, a memoised promise, and a `console.warn` (never a throw) when the database is not ready.
Call it from the module's own functions and, if it must exist at boot, from `ensurePlatformSchema()`.

---

## 2. Map: screen → tables

| Screen / module | Main tables |
|---|---|
| Sign in, users, roles | `users`, `user_profiles`, `user_login_logs`, `user_sessions`, `password_reset_tokens`, `roles` |
| Roles & permissions | `permissions`, `role_permissions`, `user_permissions` |
| Documents list, Sent, Received | `documents`, `document_files`, `document_recipients` |
| Settings → Trash | `trash_items`, `general_settings.trash_retention_days` |
| Settings → Contacts | `signing_contacts` |
| Settings → Integrations | `integration_connections`, `integration_activity` |
| Settings → Developer → OAuth Apps | `oauth_apps`, `oauth_access_tokens`, `api_logs.oauth_app_id` |
| Send for signatures | `documents`, `document_files`, `document_fields`, `document_recipients`, `document_signing_flow` |
| Signing (recipient) | `document_recipients`, `document_fields`, `document_field_values`, `signature_events`, `activity_history` |
| Email sequence | `signing_email_dispatch`, `email_logs` |
| Completed documents | `document_identifiers`, `issued_pdf_fingerprints`, `document_versions` |
| Templates | `templates`, `template_fields`, `template_roles` |
| My signatures | `user_signatures`, `signature_usage_log`, `employee_signatures` |
| Sign yourself | `self_sign_documents`, `self_sign_events`, `self_sign_shares` |
| Verify & confirm | `document_verification`, `document_verification_events` |
| Notifications | `notifications`, `notification_preferences` |
| Reports | `reports`, `scheduled_reports`, `report_runs` |
| Settings → General / Developer | `general_settings`, `developer_settings` |
| Developer API | `api_keys`, `api_logs`, `webhooks`, `webhook_deliveries` |
| Security & logs | `failed_access_logs`, `document_validity`, `activity_logs`, `activity_history` |
| Portals, announcements, delegation | `portals`, `portal_users`, `announcements`, `delegates` |

---

## 3. People and access

### `users`
`id, first_name, last_name, email, username, password_hash, company, phone, role, is_verified, created_at, updated_at, job_title`

Every account. `role` is one of `manager`, `leader`, `team_member` and decides the default permission grants.
`password_hash` is bcrypt. Written by `server/routes/auth.js` (register, reset) and `server/routes/users.js`
(invite, edit, deactivate). `job_title` was added later by `ensurePlatformSchema()`.

### `user_profiles`
`user_id, profile_image, timezone, language, date_format, department, designation, phone, avatar_url, status, …`
Per-user preferences shown on My Profile. One row per user.

### `user_login_logs`
`user_id, email, role, ip_address, user_agent, status, login_at` — one row per sign-in attempt outcome. Feeds
Activity History. Written in `server/routes/auth.js`.

### `user_sessions`, `password_reset_tokens`
Session records and single-use password-reset tokens (`token_hash`, `expires_at`, `used_at`, `requested_ip`).
Reset tokens are written by `POST /api/send-reset-email` and consumed by `POST /api/reset-password`.

### `roles`
`role_key, role_name, description, permissions, is_system, color` — the three built-in roles plus any custom role
created in Settings → Roles & permissions. `is_system = 1` cannot be deleted.

### `permissions`, `role_permissions`, `user_permissions`
The permission model, owned by `server/utils/permissions.js`:

- `permissions` — the catalogue (34 keys: `documents.*`, `templates.*`, `signatures.manage`, `reports.*`, `users.*`,
  `roles.manage`, `settings.*` — including `settings.trash`, "Organization trash" —, `security.*`, `api.*`,
  `notifications.broadcast`). Seeded at boot.
- `role_permissions` — `(role_key, permission_key, allowed)`: what a role may do.
- `user_permissions` — per-user overrides: `allowed` 1 = extra grant, 0 = explicit deny, plus `reason`,
  `expires_at`, `granted_by`. An override beats the role; an expired override is ignored.

Effective rights are computed by `getEffectivePermissions(userId)` and enforced by `requirePermission(key)` on the
server and `usePermissions().can(key)` in the client.

---

## 4. Documents and requests

### `documents` — one row per signing request
`id, user_id, document_name, file_path, folder_name, status, signing_order, recipient_email, template_used,
custom_message, reminder_days, expiration_days, scheduled_at, completed_at, created_at, updated_at, sent_at,
document_type, description, validity, auto_reminders, allow_comments`

- `user_id` is the **owner/sender**.
- `status`: `Draft`, `Scheduled`, `In Progress`, `Completed`, `Declined`, `Expired`, `Recalled`, `Trashed`.
- `signing_order`: `parallel` | `sequential`, kept in step with `document_signing_flow.mode` for reports and
  certificates.
- A request can carry several files — see `document_files`.

Written by `server/routes/documents.js` (create, save, send, recall, extend, trash) and by the signing flow when a
request completes.

### `document_files` — the documents inside a request
`document_id, file_name, file_path, file_size, file_type, uploaded_at, document_text, signed_file_path, sort_order`

`document_text` holds the editable body for documents created in the app (templates, the rich-text editor);
`file_path` points into `server/uploads/` for uploads. `signed_file_path` is the finished copy.

### `document_recipients` — who has to act
`document_id, name, email, role, signing_order_index, status, secure_token, otp_code, signed_at, role_label,
delivery_mode, private_note, sent_at, viewed_at, signed_ip, signed_user_agent, signature_image, declined_at,
decline_reason, physical_copy_path, delegated_from, delegated_reason`

- `role`: `signer`, `approver`, `viewer`, `cc`, `reviewer` (`role_label` keeps the wording the UI showed).
- `signing_order_index` is the **step**. Recipients sharing a step are emailed together and sign in parallel.
- `status`: `pending` → `sent` → `viewed` → `signed` / `declined`.
- `signed_ip`, `signed_user_agent`, `signature_image` are the evidence printed on the certificate of completion.

### `document_fields` and `document_field_values`
`document_fields`: `document_id, recipient_id, page_number, field_type, label, description, is_required, pos_x,
pos_y, width, height, options`.

`options` is JSON and carries everything the columns do not: `assignee`, `assigneeEmail`, `assigneeId`, `docIndex`,
`value`, `gridValue`, `checked`, `signatureImage`, `signatureStyle`, `signerName`, `signerEmail`, `signedAt`.
**A field belongs to the recipient in `assigneeEmail` first, then `recipient_id`, then the assignee label** — that
order matters and is implemented in `requestHelpers.fieldBelongsToRecipient()` and in `server/routes/signing.js`.

`document_field_values` keeps one row per submitted value (`field_id, recipient_id, field_value, submitted_at`) as an
append-only record, even though the current value also lives in `document_fields.options`.

### `document_signing_flow` — how a request is delivered
`document_id (UNIQUE), mode, signing_order, show_previous_fields, current_step, updated_by, created_at, updated_at`

`mode` is one of:

| mode | Emails | Field visibility |
|---|---|---|
| `sequential_shared` | one recipient at a time, the next is emailed when the previous signs | the next recipient sees what earlier recipients completed |
| `sequential_private` | one at a time | each recipient sees only their own fields |
| `parallel_private` | everyone at once | each recipient sees only their own fields |

Owned by `server/utils/signingFlow.js`. The sender picks it with the two checkboxes in Send for signatures, and the
organisation default lives in `general_settings.default_signing_order`.

### `signing_email_dispatch` — the email sequence, auditable
`document_id, recipient_id, recipient_email, recipient_name, step_index, email_type, trigger_source, status,
error_message, sent_at, created_at`

One row per signing email. `email_type` is `invitation` or `reminder`; `trigger_source` is `send`, `next_in_order`,
`reminder`, `catch_up` or `assign`. This is how you answer "who was emailed, in which step, and when" —
`GET /api/documents/:id/signing-flow` returns it.

### `trash`, `document_versions`
`trash` is the older, unused bin table (`document_id, deleted_by, deleted_at`); the Trash module uses
`trash_items` (section 9d). A trashed request keeps its `documents` row with `status = 'Trashed'`.
`document_versions` keeps generated copies (`version_number, file_path, version_label, created_by, details,
action_type`).

---

## 5. Proof: identifiers, fingerprints, audit

### `document_identifiers`
`document_id, bexsign_doc_id, prefix, year, seq_number, unique_hash, signer_name, signer_email, signature_style,
signature_image, signature_status, audit_ip, audit_hash, qr_payload, signed_at`

The human-readable BexSign ID printed on every page (`BEX-DOC-2026-0081-…`) plus the signing evidence used on the
certificate. Managed by `server/utils/documentIdentifier.js`.

### `issued_pdf_fingerprints`
`sha256, document_id, file_index, kind, file_name, recipient_email, file_path, layout_version, created_at`

The SHA-256 of **every PDF BexSign issues**. Document Validity checks an uploaded file against this registry:
an exact match is authentic, a file that merely starts with an issued PDF is "modified", anything else is unknown.
Written by `server/utils/pdfFingerprints.js` when a signed copy or certificate is produced.

### `signature_events`, `activity_history`, `activity_logs`, `audit_logs`
- `signature_events` — machine-readable document events (`event_type`: `sent`, `viewed`, `signed`, `declined`,
  `reminded`, `email_failed`) with IP and user agent.
- `activity_history` — the human sentence shown in the document timeline (`activity_description`, `ip_address`).
- `activity_logs` — account and settings actions (`user_id`, `user_email`, `category`, `action`, `entity_type`,
  `entity_id`, `details`), shown in Settings → Activity History.
- `audit_logs` — checksum snapshots (`action_summary`, `checksum_hash`).

Both document logs are written through `requestHelpers.logRequestEvent()`; account logs through
`platformEvents.logActivity()`.

### `document_validity`
`document_id, certificate_id, hash_signature, is_valid, checked_at, file_name, sha256, result, message, source,
checked_by, ip_address`

One row per verification performed in Settings → Document Validity or through `POST /api/documents/verify`.
`result` is `valid`, `modified`, `unknown` or `invalid`; `certificate_id` is the check reference (`VRF-…`).
Written by `server/utils/validityLog.js` → `recordValidityCheck()`.

### `failed_access_logs`
`ip_address, reason, attempt_time, email, user_id, source, user_agent, document_id, resolved, resolved_by,
resolved_at`

Failed sign-ins, signing links opened with a non-recipient email, rejected API keys. `source` is `login`,
`signing_link`, `api` … Written by `platformEvents.logFailedAccess()`, which also raises a security notification
after 3 and 10 failures within 15 minutes.

---

## 6. Templates

- `templates` — `user_id, title, description, file_path, category, content, is_shared, usage_count,
  source_template, created_at, updated_at`. `content` is the editable body; `is_shared` publishes it to the
  organisation; `usage_count` is bumped by `POST /api/templates/:id/use`.
- `template_fields` — default field placements per role (`role_name, field_type, pos_x, pos_y, is_required`).
- `template_roles` — the roles a template expects (`role_name, signing_order_index`).

The 100-template library that ships with the app lives in code (`client/src/utils/templateLibrary.js`), not in the
database; saving one to the account creates a `templates` row.

---

## 7. Notifications

- `notifications` — `user_id, title, message, is_read, type, category, severity, link, entity_type, entity_id,
  actor_name, read_at, email_sent, created_at`. Categories: `document`, `signing`, `email`, `user`, `security`,
  `template`, `report`, `api`, `system`.
- `notification_preferences` — `user_id, preferences (JSON per category: {inApp, email}), email_digest,
  muted_until, updated_at`. Security notifications cannot be switched off in-app; `muted_until` pauses emails.

Written by `platformEvents.notify()`, which respects preferences and sends the email copy when one is enabled.

---

## 8. Settings, reports, developer API

| Table | Purpose |
|---|---|
| `general_settings` | Single row: organisation identity, regional formats, signing defaults (`default_expiry_days`, `reminder_frequency_days`, `auto_reminders`, `default_signing_order`), `allow_decline`, `allow_reassign`, `allow_print_sign`, `require_signer_otp`, `session_timeout_minutes`, `email_footer`, `trash_retention_days` (INT, default 30 — see 9d) |
| `developer_settings` | Single row: `api_enabled`, `sandbox_mode`, `rate_limit_per_minute`, `allowed_origins`, `ip_allowlist`, `webhook_signing_secret`, `webhook_retry_count`, `webhook_timeout_seconds`, `log_retention_days` |
| `reports` | Saved report payloads (`report_type`, `report_data`) |
| `scheduled_reports` | Recurring reports: `frequency`, `report_type`, `format`, `recipients`, `filters`, `day_of_week`, `day_of_month`, `time_of_day`, `is_active`, `next_run_at`, `last_status` |
| `report_runs` | One row per run: `triggered_by`, `status`, `row_count`, `file_name`, `error`, `run_at` |
| `api_keys` | `key_prefix`, `key_hash` (the secret is never stored), `environment`, `expires_at`, `revoked_at`, `request_count` |
| `api_logs` | Public-API traffic: `api_key_id`, `oauth_app_id` (INT NULL — set when the call used an OAuth access token), `endpoint`, `method`, `status_code`, `duration_ms`, `ip_address`, `user_agent` |
| `webhooks` | Endpoint registrations: `url`, `events`, `secret_token`, `is_active`, `last_status`, `failure_count` |
| `webhook_deliveries` | Every attempt: `event`, `payload`, `status_code`, `response_body`, `success`, `duration_ms`, `attempt`, `error` |

---

## 9. Signatures

### `employee_signatures` (the legacy directory the signing flow reads)
`employee_id (UNIQUE), employee_name, employee_email, designation, department, initials, signature_id (UNIQUE),
signature_image, signature_style, status, created_at, updated_at`

Created and seeded by `server/utils/documentIdentifier.js`. The signing flow looks a signature up **by email**
(`getEmployeeSignatureByEmail`) to prefill a signer's saved signature, and writes one back
(`upsertEmployeeSignature`) whenever somebody signs. Note that `employee_email` is *not* unique, so duplicates are
possible; the lookup takes the first match.

### `user_signatures` — who owns which stamp
`owner_user_id, owner_email, display_name, employee_code, designation, department, initials, signature_id (UNIQUE),
method ('type'|'draw'|'upload'), signature_image, signature_style, is_default, status, legacy_employee_id`

The store behind **My signatures**. Ownership lives here: a row can only be changed by `owner_user_id` (or a
matching `owner_email`), which is what makes other people's signatures read-only. Existing `employee_signatures`
rows were copied in at first boot and the two tables are kept in step, so the signing flow keeps working.
Owned by `server/utils/signatureStore.js`.

### `signature_usage_log` — where a signature has been used
`signature_id, owner_email, document_id, document_name, context ('signing_request'|'self_sign'|
'directory_prefill'|'manual'), recipient_id, signer_name, signer_email, field_count, ip_address, used_at`

One row each time a saved signature signs something. This is the usage history shown on the signature card.

### `signatures`
`user_id, signature_name, signature_type, signature_data, is_default` — an older per-user table that no code uses.
Left in place; do not build on it.

See [12 — Signatures](12-signatures.md) for the module itself, its ownership rules and the usage history.

---

## 9b. Sign yourself

| Table | Holds |
|---|---|
| `self_sign_documents` | one row per self-sign document: `user_id`, `document_id` (the normal `documents` row behind it), `title`, `stage` (`draft`/`prepared`/`signed`), `source`, `template_name`, `has_fields`, `field_count`, `page_count`, `signed_at`, `signed_file_path` |
| `self_sign_events` | its history: `action`, `detail`, `actor_id`, `actor_name`, `ip_address`, `created_at` |
| `self_sign_shares` | every copy emailed to somebody: `recipient_email`, `recipient_name`, `message`, `status`, `error_message`, `shared_by`, `shared_at` |

A self-sign document is a normal `documents` row plus one `self_sign_documents` row, which is what makes it
distinguishable from a sent request. See [22 — Sign Yourself](22-sign-yourself.md).

## 9c. Verify & confirm

| Table | Holds |
|---|---|
| `document_verification` | one row per request: `required`, `status` (`pending`/`confirmed`/`rejected`/`not_required`), `integrity_result`, `integrity_message`, `confirmed_by`, `confirmed_at`, `note`, `rejected_reason` |
| `document_verification_events` | every check and decision: `action`, `actor_id`, `actor_name`, `result`, `message` |

See [23 — Verify and Confirm](23-verify-and-confirm.md).

---

## 9d. Workspace modules: integrations, contacts, trash, OAuth apps

Created by `ensureWorkspaceSchema()` (`server/utils/workspaceSchema.js`). Each module has its own table; the older
`integrations`, `contacts` and `trash` tables are left untouched and unused.

### `integration_connections` — one row per configured app
Owned by `server/utils/integrationStore.js`. See [14 — Integrations](14-integrations.md).

| Column | Type | Purpose |
|---|---|---|
| `id` | INT PK | |
| `provider_key` | VARCHAR(80), **UNIQUE** | `bexcode-crm`, `google-workspace`, `microsoft-365`, `stripe-identity`, `dropbox`, `zapier`, `slack`, or `custom-<slug>-<hex>` |
| `name` | VARCHAR(120) | Display name (editable for custom integrations) |
| `description` | VARCHAR(255) NULL | Custom integrations only |
| `category` | VARCHAR(40), default `custom` | `crm`, `identity`, `verification`, `storage`, `automation`, `messaging`, `custom` |
| `is_custom` | TINYINT(1) | 1 for integrations made with "Add integration" |
| `status` | VARCHAR(20), default `connected` | `connected` or `disabled` (turned off) |
| `config` | LONGTEXT (JSON) | Non-secret field values |
| `secrets` | LONGTEXT (JSON) | Secret field values, each AES-256-GCM encrypted (`v1:iv:tag:data`) |
| `events` | LONGTEXT (JSON) | Subscribed signing events |
| `options` | LONGTEXT NULL | Reserved |
| `last_tested_at`, `last_test_ok`, `last_test_message` | DATETIME, TINYINT(1), VARCHAR(500) | Result of the last "Test connection" |
| `last_event_at`, `event_count`, `failure_count` | DATETIME, INT, INT | Delivery counters; `failure_count` resets to 0 on a successful delivery |
| `created_by`, `updated_by` | INT NULL | User ids |
| `created_at`, `updated_at` | TIMESTAMP | |

### `integration_activity` — what each integration did
`id, connection_id (INT), action (VARCHAR 40: connected, updated, test, event, upload, enabled, disabled),
event (VARCHAR 60), success (TINYINT), message (VARCHAR 500), status_code (INT), duration_ms (INT),
document_id (INT), user_id (INT), created_at` — index `(connection_id, created_at)`. The latest 500 rows per
integration are kept; disconnecting deletes them.

### `signing_contacts` — the contact book
Owned by `server/routes/contacts.js`. See [11 — Contacts](11-contacts.md).

| Column | Type | Purpose |
|---|---|---|
| `id` | INT PK | |
| `owner_id` | INT | The user the contact belongs to |
| `name` | VARCHAR(150) | |
| `email` | VARCHAR(255) | Lower-case; **UNIQUE with `owner_id`** |
| `company`, `job_title`, `phone`, `country_code` | VARCHAR(150 / 120 / 40 / 8) NULL | |
| `notes` | TEXT NULL | |
| `tags` | LONGTEXT (JSON array) | Up to 10 tags |
| `is_favorite` | TINYINT(1) | |
| `source` | VARCHAR(20), default `manual` | `manual`, `import` or `recipient` (synced from sent requests) |
| `documents_sent`, `documents_signed` | INT | Refreshed by the sync |
| `last_sent_at`, `last_signed_at` | DATETIME NULL | Refreshed by the sync |
| `deleted_at` | DATETIME NULL | Set while the contact is in the trash |
| `created_at`, `updated_at` | TIMESTAMP | |

Index `(owner_id, deleted_at)`.

### `trash_items` — the trash bin
Owned by `server/utils/trashStore.js`. See [24 — Trash](24-trash.md).

| Column | Type | Purpose |
|---|---|---|
| `id` | INT PK | The trash item id used by `/api/trash/items/*` |
| `item_type` | VARCHAR(30) | `document`, `self_sign`, `template`, `signature`, `contact` |
| `item_id` | INT | Id of the original row; **UNIQUE with `item_type`** |
| `title`, `subtitle` | VARCHAR(255) | What the list shows, e.g. "Was In Progress" |
| `owner_id` | INT NULL | Owner of the item (visibility) |
| `deleted_by`, `deleted_by_name` | INT NULL, VARCHAR(150) | Who deleted it |
| `previous_status` | VARCHAR(40) NULL | Documents: the status restored; self-sign: the stage; signatures: `default` |
| `snapshot` | LONGTEXT NULL | Self-sign, template, signature: `[{ table, rows }]` of the removed rows, parent first |
| `size_hint` | VARCHAR(60) NULL | e.g. "2 recipients", "3 pages", a contact's company |
| `deleted_at` | DATETIME | |
| `purge_after` | DATETIME NULL | `deleted_at` + retention; deleted for good after this |

Indexes on `deleted_at` and `owner_id`. The retention period is `general_settings.trash_retention_days`
(INT NOT NULL DEFAULT 30); changing it recalculates `purge_after` for every row.

### `oauth_apps` — OAuth client credentials
Owned by `server/routes/oauthApps.js`. See [25 — OAuth Apps](25-oauth-apps.md).

| Column | Type | Purpose |
|---|---|---|
| `id` | INT PK | |
| `user_id` | INT | Owner; tokens act as this user |
| `name`, `description`, `homepage_url` | VARCHAR(120 / 255 / 500) | |
| `redirect_uris` | LONGTEXT (JSON array) | Kept for records; not used by the client credentials grant |
| `client_id` | VARCHAR(64), **UNIQUE** | `bxc_…` |
| `client_secret_hash` | CHAR(64) | SHA-256 of the secret (the secret itself is never stored) |
| `secret_last4` | VARCHAR(8) | For the `bxcs_••••1234` hint |
| `scopes` | LONGTEXT (JSON array) | Scopes the app may request |
| `token_ttl_minutes` | INT, default 60 | 5–1440 |
| `is_active` | TINYINT(1), default 1 | Off = tokens revoked and refused |
| `last_used_at`, `token_count`, `secret_rotated_at` | DATETIME, INT, DATETIME | |
| `created_at`, `updated_at` | TIMESTAMP | |

### `oauth_access_tokens` — issued access tokens
`id, app_id (INT), user_id (INT), token_hash (CHAR 64, UNIQUE — SHA-256 of the bxo_ token), token_prefix
(VARCHAR 24, first 12 characters for display), scopes (JSON), grant_type (VARCHAR 40: client_credentials or
console), expires_at, revoked_at, last_used_at, request_count, created_ip, created_at` — index
`(app_id, created_at)`. Tokens that expired more than a day ago are removed when the app gets a new token.

### New columns on existing tables

| Table | Column | Type | Purpose |
|---|---|---|---|
| `general_settings` | `trash_retention_days` | INT NOT NULL DEFAULT 30 | Days a deleted item stays in the trash |
| `api_logs` | `oauth_app_id` | INT NULL | The OAuth app whose token made the call (NULL for API keys) |

---

## 10. Odds and ends

| Table | Purpose |
|---|---|
| `contacts` | Older address book, no longer used — the Contacts module uses `signing_contacts` (9d) |
| `delegates` | Out-of-office delegation (`delegate_to_email, start_date, end_date, status`) |
| `emails`, `email_logs`, `email_queue`, `email_templates` | Mail records; `email_logs` is the one that matters (`email_type`, `status`, `error_message`) |
| `integrations` | Older, unused connection table — the Integrations module uses `integration_connections` (9d) |
| `portals`, `portal_users` | Customer portals |
| `announcements` | In-app announcements |
| `signature_requests` | Legacy per-recipient token rows, superseded by `document_recipients.secure_token` |

---

## 11. Working with the database

```bash
# Windows / XAMPP
"G:/xampp/mysql/bin/mysql.exe" -uroot db_bex_sign -e "SHOW TABLES;"

# Linux
mysql -u bexsign -p db_bex_sign -e "DESCRIBE documents;"
```

Useful questions:

```sql
-- Where is a request in its signing order, and who was emailed?
SELECT r.signing_order_index AS step, r.name, r.email, r.status, r.sent_at
FROM document_recipients r WHERE r.document_id = 81 ORDER BY step, r.id;

SELECT step_index, email_type, trigger_source, recipient_email, status, sent_at
FROM signing_email_dispatch WHERE document_id = 81 ORDER BY id;

-- Everything that happened to a document
SELECT created_at, activity_description FROM activity_history
WHERE document_id = 81 ORDER BY id;

-- Which permissions does a user effectively have?
SELECT permission_key, allowed FROM user_permissions WHERE user_id = 4;
SELECT permission_key FROM role_permissions WHERE role_key = 'team_member' AND allowed = 1;
```

**Rules of thumb**

- Never delete a `documents` row by hand without clearing its children (`document_fields`, `document_field_values`,
  `document_recipients`, `document_files`, `document_identifiers`, `issued_pdf_fingerprints`, `signature_events`,
  `activity_history`, `signing_email_dispatch`, `document_signing_flow`). Use the Trash feature instead.
- `options` and `preferences` columns hold JSON as text. Read them with the helpers
  (`requestHelpers.parseFieldRow`, `parseJsonInput`) rather than parsing by hand.
- Take a dump before schema experiments: `mysqldump -u root db_bex_sign > backup.sql`.
