# 26 — Settings Navigation

Where every settings page lives in the sidebar, which route it uses, and who sees it.

Files: `client/src/components/Layout.jsx` (the `NAV_SECTIONS` menu), `client/src/App.jsx` (routes and redirects),
`client/src/utils/permissions.js` (`usePermissions().can`).

---

## 1. What changed

- The separate **Organization** group is gone. **General**, **Users & Roles**, **Roles & Permissions**,
  **Integrations**, **Contacts** and **Trash** now sit **directly under Settings**.
- **Contacts** ([11](11-contacts.md)) and **Trash** ([24](24-trash.md)) are new, full pages; **Integrations**
  ([14](14-integrations.md)) is rebuilt with one Configure page per app.
- The **Developer** group gained **OAuth Apps** ([25](25-oauth-apps.md)).
- The old combined settings pages (`client/src/pages/Settings.jsx`, `client/src/pages/Integrations.jsx`) were
  removed; their links redirect (section 4).

---

## 2. The sidebar under Settings

Settings is in the **Manage** section of the sidebar. Groups open one at a time (opening one closes the other), and
the group holding the current page opens by itself.

```
Settings
├── General
├── Users & Roles                 (users.view)
├── Roles & Permissions           (roles.manage or users.view)
├── Integrations
├── Contacts
├── Trash
├── My Account
│   ├── My Profile
│   └── My Notifications
├── Security & Logs
│   ├── Failed Access             (security.failed_access)
│   ├── Document Validity         (security.document_validity)
│   └── Activity History          (security.activity_history)
└── Developer
    ├── Developer Settings        (settings.developer)
    ├── Developer API             (api.keys, api.webhooks or api.logs)
    └── OAuth Apps                (api.keys)
```

An item is hidden when the user lacks its permission, and a group that ends up empty is hidden too (for example
**Developer** for a user with none of the developer permissions).

---

## 3. Routes

| Sidebar item | Route | Needed to see / open it | Doc |
|---|---|---|---|
| General | `/settings/general` | Everyone can open it; saving needs `settings.general` | — |
| Users & Roles | `/users` | `users.view` | [19](19-security.md) |
| Roles & Permissions | `/settings/permissions` | `roles.manage` or `users.view` | [19](19-security.md) |
| Integrations | `/settings/integrations` | Everyone (read-only); configuring needs `settings.integrations` | [14](14-integrations.md) |
| — one integration | `/settings/integrations/:key` (e.g. `/settings/integrations/google-workspace`) | as above | [14](14-integrations.md) |
| Contacts | `/settings/contacts` | Everyone (own contacts) | [11](11-contacts.md) |
| Trash | `/settings/trash` | Everyone (own items); everyone's with `settings.trash` | [24](24-trash.md) |
| My Profile | `/settings/profile` | Everyone | — |
| My Notifications | `/settings/notifications` | Everyone | [13](13-notifications.md) |
| Failed Access | `/settings/failed-access` | `security.failed_access` | [19](19-security.md) |
| Document Validity | `/settings/document-validity` | `security.document_validity` | [19](19-security.md) |
| Activity History | `/settings/activity-history` | `security.activity_history` | [19](19-security.md) |
| Developer Settings | `/settings/developer` | `settings.developer` | [15](15-api.md) |
| Developer API | `/settings/developer-api` | `api.keys`, `api.webhooks` or `api.logs` | [15](15-api.md) |
| OAuth Apps | `/settings/developer/oauth-apps` | `api.keys` | [25](25-oauth-apps.md) |

Routes marked with a permission are wrapped in `<RequirePermission any={[…]}>` in `App.jsx`, so typing the URL
without the permission does not open the page either. Pages open to everyone still enforce permissions on the
server for anything that changes data.

---

## 4. Redirects (old links keep working)

| Old link | Goes to |
|---|---|
| `/settings` | `/settings/general` |
| `/settings/:tab` — any other old tab link that is not a page listed above | `/settings/general` |
| `/settings/users` | `/users` |
| `/settings/signatures` | `/signatures` |
| `/integrations` | `/settings/integrations` |
| `/others/failed-access` | `/settings/failed-access` |
| `/others/document-validity` | `/settings/document-validity` |
| `/others/activity-history` | `/settings/activity-history` |
| `/others/api` | `/settings/developer-api` |
| `/others/<anything else>` | `/settings/general` |

The sidebar also highlights the right item for these old paths (`match` in `NAV_SECTIONS`), and any path under
`/settings/integrations/` highlights **Integrations**.

---

## 5. Adding a settings page

1. Create the page in `client/src/pages/settings/`.
2. Add the route inside the `<Route element={<Layout />}>` block in `App.jsx`, **before** the catch-all
   `/settings/:tab` redirect, wrapped in `RequirePermission` when it needs a permission.
3. Add the item to the `settings` children in `NAV_SECTIONS` (`Layout.jsx`) with `label`, `to`, `icon` and, when
   needed, `perm` (a key or an array — any of them is enough) and `match` for old paths.
4. Enforce the same permission on the server with `requirePermission(key)`.
