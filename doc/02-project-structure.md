# 02 — Project Structure

Two applications in one repository, plus this documentation.

```
bex_sign/
├── client/                 React 18 + Vite + Tailwind (the browser app)
├── server/                 Express 4 + MySQL (the API)
├── doc/                    This documentation
└── db_bex_sign_*.sql       Dated database dumps
```

---

## 1. Client

```
client/
├── .env.example            VITE_API_URL, VITE_PORT
├── vite.config.js          dev port + proxy, both read from .env
└── src/
    ├── main.jsx            React root
    ├── App.jsx             every route
    ├── api/axios.js        axios instance (legacy; most code uses utils/api.js)
    ├── components/
    │   ├── ui/kit.jsx      the component kit: PageHeader, Card, StatCard, Badge, Button,
    │   │                   Tabs, SearchInput, Pagination, Modal, ConfirmDialog, EmptyState,
    │   │                   LoadingBlock, Toggle, useToast, formatDateTime, formatRelative
    │   ├── Layout.jsx      shell: sidebar (NAV_SECTIONS), header, notification bell
    │   ├── BexDocumentSheet.jsx   the A4 document sheet with its placed fields
    │   ├── SignatureStamp.jsx     the signature block printed on documents
    │   ├── developer/      API keys, webhooks, request logs, API docs panels
    │   ├── notifications/  bell dropdown + category icons
    │   ├── reports/        charts
    │   ├── security/       shared pieces of the security-log pages
    │   ├── settings/       settings building blocks
    │   ├── templates/      template picker + helpers
    │   └── selfsign/       Sign yourself building blocks
    ├── pages/
    │   ├── Dashboard.jsx, DocumentsList.jsx, DocumentDetails.jsx
    │   ├── SendForSignatures.jsx   create a request (documents, recipients, settings)
    │   ├── DocumentEditor.jsx      place fields, send  (also used by Sign yourself)
    │   ├── PublicSigning.jsx       the recipient's signing page
    │   ├── SignYourself.jsx + selfsign/   self-signing module
    │   ├── SignaturesModule.jsx    My signatures + organisation directory
    │   ├── Templates.jsx, Reports.jsx, Notifications.jsx, UserManagement.jsx
    │   ├── Login.jsx, Register.jsx, ForgotPassword.jsx, ResetPassword.jsx
    │   └── settings/       GeneralSettings, Permissions, NotificationSettings,
    │                       FailedAccess, DocumentValidity, ActivityHistory,
    │                       DeveloperSettings, DeveloperApi
    └── utils/
        ├── api.js          API_ORIGIN / API_BASE / apiFetch / apiDownload / apiUrl
        ├── permissions.jsx PermissionsProvider + usePermissions().can()
        ├── pdfGenerator.js, signedPdf.js, documentPrinter.js
        ├── templateLibrary.js   the built-in template library
        └── signatureDirectory.js, signatureInk.js, documentDefaults.js
```

**Rules that keep the client portable**

- Never write `http://localhost:5000`. Use `apiFetch` / `API_BASE` / `apiUrl` from `utils/api.js`.
- Reuse `components/ui/kit.jsx` instead of new one-off styling.
- Permission-sensitive screens use `RequirePermission` (route level) and `can()` (inside a page).

---

## 2. Server

```
server/
├── .env.example
├── index.js               express app: CORS, JSON limits, /uploads, route mounts,
│                          optional static client, boot-time schema + schedulers
├── db.js                  mysql2 pool
├── init-db.js             optional seed data
├── middleware/
│   └── authMiddleware.js  authenticateUser (JWT; an invalid JWT gets 401)
├── routes/
│   ├── auth.js            /api  and /api/auth   sign in, register, password reset
│   ├── documents.js       /api/documents        requests, files, fields, send, verify
│   ├── signing.js         /api/signatures       the recipient's actions
│   ├── templates.js       /api/templates
│   ├── reports.js         /api/reports
│   ├── users.js           /api/users
│   ├── permissions.js     /api/permissions      roles and per-user overrides
│   ├── notifications.js   /api/notifications
│   ├── security.js        /api/security         failed access, validity, activity
│   ├── platformSettings.js /api/platform-settings
│   ├── developer.js       /api/developer        API keys, webhooks, logs
│   ├── publicApi.js       /api/v1               the public REST API (API-key auth)
│   ├── signatureDirectory.js  /api/signature-directory  signatures + usage history
│   ├── selfSign.js        /api/self-sign        the Sign yourself module
│   ├── verification.js    /api/verification     verify & confirm a completed request
│   ├── settings.js, trash.js
│   └── ../contacts.js     /api/contacts
├── utils/
│   ├── requestHelpers.js      recipients, fields, invitations, audit entries
│   ├── signingFlow.js         the three signing flows + the email dispatch log
│   ├── requestCompletion.js   finalising a completed request
│   ├── completedPdfGenerator.js, pdfGenerator.js, pdfCertification.js,
│   │   pdfLock.js, pdfFingerprints.js, pdfMerge.js
│   ├── emailService.js        every email the product sends
│   ├── platformEvents.js      notify(), logActivity(), logFailedAccess()
│   ├── permissions.js         catalogue, role defaults, requirePermission()
│   ├── platformSchema.js      boot-time schema for the platform modules
│   ├── signatureStore.js      signatures, ownership, usage history
│   ├── selfSign.js            self-sign documents, events, shares
│   ├── documentVerification.js  verify & confirm records
│   ├── validityLog.js, webhooks.js, reportData.js, reportScheduler.js
│   └── documentIdentifier.js  BexSign IDs and the signature directory table
└── uploads/
    ├── <uploaded files>
    ├── completed/<documentId>/   signed PDFs + certificate of completion
    └── physical/                 scanned "signed on paper" copies
```

---

## 3. How a request flows through the code

```
SendForSignatures.jsx ──POST /api/documents/upload──▶ documents.js
        │                                                 └─ requestHelpers.saveRecipients / syncDocumentFiles
        ▼ Continue
DocumentEditor.jsx ────POST /api/documents/:id/save──▶ documents.js  (fields)
        │ Send
        ▼
POST /api/documents/send/:id ─▶ signingFlow.getSigningFlow()  → which step is emailed now
                               requestHelpers.sendSigningInvitations() → email + signing_email_dispatch
                                                    │
recipient opens the link ─▶ PublicSigning.jsx ─▶ GET /api/signatures/token/:id
                                                    │
                          POST /api/signatures/submit ─▶ completeRecipientSigning()
                                                    ├─ stores field values, marks the recipient signed
                                                    ├─ emails the next step (sequential flows)
                                                    └─ on the last signature: requestCompletion →
                                                       signed PDFs + certificate + fingerprints + emails
```

---

## 4. Conventions worth following

- **Schema**: each module owns an idempotent `ensureXSchema()` (see `utils/signingFlow.js`) — never a manual
  migration step.
- **Permissions**: server `requirePermission('key')`, client `can('key')`; the catalogue is in `utils/permissions.js`.
- **Notifications and audit**: `notify()`, `logActivity()`, `logRequestEvent()` — never write those tables directly.
- **Email**: add a sender to `utils/emailService.js` so dry-run mode keeps working.
- **Errors**: return `{ success: false, error: 'a sentence the user can act on' }`.
