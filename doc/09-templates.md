# 09 — Templates

Ready-made document bodies you can drop into a signing request and then edit.
Page: `client/src/pages/Templates.jsx`. Picker: `client/src/components/templates/TemplatePickerModal.jsx`.
Library: `client/src/utils/templateLibrary.js`. Server: `server/routes/templates.js`. Table: `templates`.

---

## 1. Two kinds of template

| | Where it lives | Notes |
|---|---|---|
| **Library** | in the code (`templateLibrary.js`) | 100 ready templates in 9 categories, available to everyone |
| **Saved** | the `templates` table | created by a user; `is_shared` publishes it to the organisation |

### The nine categories

Business & Corporate · Employment & HR · Sales & Customer · Real Estate · Legal · Finance & Accounting ·
Healthcare · Education · Procurement & Vendors.

Two categories carry a standing notice shown with the template and on the document:

- **Legal** — the templates are examples and should be reviewed for the relevant jurisdiction before use.
- **Healthcare** — these documents can contain health information; check your privacy, security and compliance
  obligations before sending.

---

## 2. Using one

- **Templates page** — search, filter by category, preview, use, save a copy, edit, share or delete
  (`templates.view`, `.create`, `.edit`, `.share`, `.delete`).
- **Send for signatures → Add document → Template(s)** — pick one or several; each becomes a document in the
  request. "Replace with a template" swaps the body of the current document.
- **Sign yourself → Add document → Template(s)** — the same picker.

**Template text is always editable** once it is in a request: use *Edit text* on the document card, or open the
editor. Placeholders such as `[Company Name]` are counted and highlighted so none are missed.

---

## 3. Saving your own

Any document body can be saved as a template with a name, category and description. Saved templates can be shared
with the organisation, and `usage_count` tracks how often one is used (`POST /api/templates/:id/use`).
Creating a shared template notifies everyone with `templates.view`.

---

## 4. Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/templates?userId=` | saved templates visible to the user |
| `POST /api/templates` | save a template |
| `PUT /api/templates/:id` | edit |
| `DELETE /api/templates/:id` | delete |
| `POST /api/templates/:id/use` | bump the usage count |

Template actions are written to `activity_logs`, and a `template.created` webhook is dispatched.

---

## 5. Bulk send (mail merge)

`client/src/pages/BulkSend.jsx` personalises one template for many recipients from a CSV (`name`, `email`,
`company`, …) and creates one request per row. The columns map to the placeholders in the template body.
