# BexSign - Complete System & Modules Documentation

## 1. Executive Summary & Architecture Overview

**BexSign** is a enterprise-grade electronic document signing and lifecycle management application inspired by Zoho Sign. It provides secure document creation, multi-recipient field positioning, color-coded assignee tracking, compliant digital signature stamping, automated reminder scheduling, physical document upload, and automated email dispatch via Gmail SMTP.

```
+-----------------------------------------------------------------------------------+
|                                 BexSign Platform                                  |
+-----------------------------------------------------------------------------------+
|  +---------------------+   +---------------------+   +-------------------------+  |
|  | Send for Signatures |-->|   Document Editor   |-->|   Recipient Signing     |  |
|  | (/send-for-signatures)  | (/documents/:id/edit)   | (/documents/sign/:id)   |  |
|  +---------------------+   +---------------------+   +-------------------------+  |
|             |                         |                           |               |
|             v                         v                           v               |
|  +---------------------+   +---------------------+   +-------------------------+  |
|  |  Signatures Module  |   | In-Progress Actions |   |      Email Service      |  |
|  |    (/signatures)    |   |  (/documents/all)   |   |   (Gmail SMTP SSL)      |  |
|  +---------------------+   +---------------------+   +-------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Database Schema & Tables

The BexSign backend uses MySQL (`db_bex_signature`). The core tables include:

### 2.1 `employee_signatures` Table
Stores registered employee signatures for the dedicated `/signatures` directory and auto-fetch pipeline.
```sql
CREATE TABLE IF NOT EXISTS employee_signatures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE,
  employee_name VARCHAR(150) NOT NULL,
  employee_email VARCHAR(150) NOT NULL UNIQUE,
  designation VARCHAR(100),
  department VARCHAR(100),
  initials VARCHAR(10),
  signature_id VARCHAR(100) UNIQUE,
  signature_image LONGTEXT,
  signature_style VARCHAR(50) DEFAULT 'font-signature-1',
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (employee_email)
);
```

### 2.2 `document_identifiers` Table
Guarantees globally unique, audit-proof document identifiers formatted as `BEX-DOC-2026-XXXX-[HASH]`.
```sql
CREATE TABLE IF NOT EXISTS document_identifiers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  bexsign_doc_id VARCHAR(120) NOT NULL UNIQUE,
  hash_code VARCHAR(64) NOT NULL,
  year INT DEFAULT 2026,
  status VARCHAR(30) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_doc_id (document_id),
  INDEX idx_bexsign_id (bexsign_doc_id)
);
```

### 2.3 `documents` Table
Core document entity tracking title, status, sender, recipient, file path, signature image, and timestamps.
```sql
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  owner VARCHAR(100) DEFAULT 'Manu Yadav',
  recipient_email VARCHAR(150),
  signer_name VARCHAR(150),
  status ENUM('Draft', 'In Progress', 'Completed', 'Recalled', 'Declined', 'Correction') DEFAULT 'Draft',
  signature_image LONGTEXT,
  signature_style VARCHAR(50),
  signed_at TIMESTAMP NULL,
  days_to_complete INT DEFAULT 15,
  reminder_frequency_days INT DEFAULT 5,
  auto_reminder BOOLEAN DEFAULT TRUE,
  recall_reason TEXT,
  file_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 3. Authentic Signature Stamp Engine

The signature stamp conforms to the reference image specification:
```
By:  ┌ Signed by: [Employee Name]
     │ [ Handwritten / Cursive Employee Signature ]
     └ Sign ID: [BEX-SIGN-VC-EMP001-2026-361682B4]
```

### Key Visual & Structural Properties:
1. **Left Baseline Tag**: `By:` in sleek slate typography.
2. **Left Continuous Blue Bracket**: `#1c4b82` frame with top horizontal arm, vertical spine, and bottom horizontal arm with rounded corners.
3. **1st Element (Top)**: `Signed by:` label followed by signer's name in `#1c4b82`.
4. **2nd Element (Center)**: Authentic signature (drawn canvas image, uploaded PNG, or styled cursive font).
5. **3rd Element (Bottom)**: Unique sign ID formatted as `BEX-SIGN-VC-EMP001-2026-XXXX`.
6. **Integrity Badge**: Top-right "Digitally Certified" badge with checkmark.

Implementation: [SignatureStamp.jsx](file:///d:/react/bexsign/client/src/components/SignatureStamp.jsx).

---

## 4. Dedicated Signatures Module (`/signatures`)

Located at route `/signatures` (and `/settings/signatures`), accessible via the sidebar under **Signatures -> My Signatures**.

### Features:
- **Search & Filter**: Filter signatures by employee name, email, employee ID, and department.
- **View Toggle**: Grid cards view with live 3-tier blue bracket stamp preview vs. Compact Table view.
- **Add New Signature Modal**:
  - Employee Name, Email, Employee ID, Designation, Department, Initials.
  - Signature creation tabs: **TYPE** (with live cursive typography styles), **DRAW** (smooth canvas with touch/stylus support), and **UPLOAD** (PNG/JPG image).
  - Automatically generates unique Sign ID.
- **Edit Signature Modal**: Allows updating employee details or updating signature style/drawing.
- **Automatic Database Persistence**: Directly commits to MySQL via `/api/documents/employees/signatures` with instant local cache fallback for zero downtime.

Implementation: [SignaturesModule.jsx](file:///d:/react/bexsign/client/src/pages/SignaturesModule.jsx), [signatureDirectory.js](file:///d:/react/bexsign/client/src/utils/signatureDirectory.js).

---

## 5. Auto-Fetch Signature Pipeline

When a document is being processed or signed, BexSign automatically looks up the recipient's email in the database:
1. `fetchSignatureForEmail(email)` queries `/api/documents/employees/by-email/:email` (or lists from `/api/documents/employees/signatures`).
2. If an employee signature exists:
   - Signer name is pre-populated.
   - Signature data (canvas drawing or font style) is adopted automatically.
   - The authentic 3-tier blue bracket signature stamp is rendered with the document's unique BexSign ID.
3. When saved or submitted, `/api/signatures/submit` updates the database record so future documents for this email will reuse the signature automatically.

---

## 6. Document Creation & Editor Workflow (PDF 1 & PDF 3)

### 6.1 Send for Signatures (`/send-for-signatures`)
- **Add Documents Dropdown**:
  - From Desktop (drag-and-drop or file browser)
  - Cloud (Google Drive, OneDrive, Dropbox, WorkDrive)
  - Template(s)
  - Create (opens rich text document editor and returns card preview)
- **Document Card 3-Dots Menu**:
  - Edit document (opens editor)
  - Replace (swaps attached file)
  - Delete (removes card)
- **Recipient Management**:
  - "Send in order" checkbox
  - Add recipient, customize passcode/auth (Email OTP), private notes.
- **More Settings**:
  - Days to complete, valid until, document type, folder, notes, auto-reminders.

### 6.2 Document Editor (`/documents/:id/editor`)
- **Multi-Recipient Color Coding**:
  - Each recipient receives a distinctive color (e.g., Manu Yadav `#00a884`, Vimal Chavda `#0284c7`, Aakash `#f97316`). Placed fields render with that recipient's border color, label, and background tint.
- **Standard Fields Tab**:
  - Signature, Initial, Stamp (with shape crop, zoom, rotation modal), Company, Full name, Email, Sign date, Text, Split text (direct cell typing), Job title, Checkbox.
- **Custom Fields Tab**:
  - `+ Create` dashed button opening the comprehensive Create Custom Field modal (PDF 3 p.7):
    - Name, Type (Text, Number, Date, Email, Checkbox, Dropdown), Required, Read-only, Fixed width, Fixed height, Default value, Internal field name, Char limit (2048), Data label, Validation rules, Formatting (font, size, B, I, S), Description.
  - Search custom fields filter.
- **Actions Menu**:
  - **Apply Field Template** modal: Select template (NDA, Onboarding, Vendor) and batch-apply fields.
  - **Edit Documents** modal: View doc card and open inline rich text editor. Saves in place without creating duplicate documents and auto-adjusts field positions.
- **Schedule / Send Later**:
  - Date & time picker, timezone selector (`Asia/Kolkata`, `America/New_York`, `UTC`).
- **Send -> Confirm Details Modal**:
  - Verifies recipient emails and field counts before final dispatch.
  - On confirm, triggers Gmail SMTP Digital Signature Request email and navigates to documents list.

---

## 7. Recipient Public Signing Flow (PDF 1 p.8-11)

### 7.1 Step 1: Document Info Landing Screen
Displays document name, sender, organization, sent date, expiry notice, and "Proceed to document" button.

### 7.2 Step 2: Disclosure Consent & Actions
- Disclosure agreement checkbox: *"I confirm that I have read and understood the 'Electronic Record and Signature Disclosure' and consent to use electronic records and signatures."*
- "Agree & Continue" button.
- "More actions" dropdown: Quickly fill and sign, Assign to someone else, Print and physically sign, Decline, Skip signing.

### 7.3 Step 3: Fields Remaining Step Counter
Top bar highlights "Fields remaining: [N]" in a green badge with next/previous field navigation.

### 7.4 Step 4: Signature Adoption Modal
- Tabs: TYPE, DRAW, UPLOAD.
- Auto-fetches saved employee signature from database when opened.
- Generates 3-tier blue bracket stamp with unique BexSign Doc ID.

### 7.5 Step 5: Completion & Post-Signing Actions
- "You have signed this document" screen.
- **Email to me**: Dispatches certified copy to recipient via Gmail SMTP.
- **Print**: Opens formatted printable window with execution metrics and audit trail.
- **Download**: Instant PDF download or "Download with password" modal.

---

## 8. In Progress Document Actions (PDF 2)

Managed from `/documents/all` and `/documents/:id`:

1. **Correct Document**: Puts signature process on hold, displays top warning banner, allows modifying signers/fields, and resends.
2. **Extend Expiry Date**: Extends expiration date by N days and updates database.
3. **Send Reminder**: Immediately dispatches reminder email via Gmail SMTP.
4. **Automatic Reminder Settings**: Configures auto-reminder frequency (e.g. every 5 days).
5. **Recall Document**: Marks document as 'Recalled' with reason, voiding active workflow, and notifies signers.
6. **Upload Signed Document**: Uploads physical signed copy, sets status to 'Completed', and dispatches completed email.
7. **Edit as New (Clone)**: Clones document attributes into a new draft with a fresh BexSign ID.

---

## 9. Gmail SMTP Mailer Integration

Configured using `nodemailer` in [server/utils/emailService.js](file:///d:/react/bexsign/server/utils/emailService.js):
- **Host**: `smtp.gmail.com`
- **Port**: `465` (SSL)
- **User**: `info@bexcodeservices.com`
- **Branded HTML Templates**:
  - `sendSignatureRequestEmail`: Zoho Sign Digital Signature Request with "Start Signing" CTA.
  - `sendReminderEmail`: Signature Reminder notification with link to sign.
  - `sendDocumentRecalledEmail`: Document Recalled notice detailing the reason for recall.
  - `sendDocumentCompletedEmail`: Document Completed notice with attachment support.
  - `sendDocumentCopyEmail`: Certified document copy delivery.

---

## 10. Responsive Design Specifications

| Viewport | Breakpoint | Adaptations |
| :--- | :--- | :--- |
| **Mobile** | `< 640px` | Single-column forms, collapsible sidebar, stacked cards, touch-optimized signature canvas, full-width modal popups. |
| **iPad / Tablet** | `640px - 1024px` | 2-column signature grids, scrollable document table with touch-scroll, responsive editor toolbar, compact action menus. |
| **Desktop** | `> 1024px` | 3-column signature grid, dual-pane document editor (canvas + properties), multi-panel navigation, full audit trail. |

---

## 11. API Endpoints Reference Matrix

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/documents` | List all documents with filter and search |
| `GET` | `/api/documents/:id` | Get document details and fields |
| `POST` | `/api/documents/send/:id` | Send document for signatures & dispatch SMTP email |
| `POST` | `/api/documents/remind/:id` | Send reminder email via SMTP |
| `POST` | `/api/documents/recall/:id` | Recall document with reason & notify signers |
| `POST` | `/api/documents/extend/:id` | Extend document expiry date |
| `POST` | `/api/documents/reminder-settings/:id` | Update automatic reminder schedule |
| `POST` | `/api/documents/upload-signed/:id` | Upload physical signed copy & mark Completed |
| `POST` | `/api/documents/email-copy/:id` | Email document copy to up to 3 recipients |
| `POST` | `/api/documents/clone/:id` | Clone document as new draft |
| `GET` | `/api/documents/employees/signatures` | List all employee signatures |
| `GET` | `/api/documents/employees/by-email/:email` | Auto-fetch signature by employee email |
| `POST` | `/api/documents/employees/signatures` | Add new employee signature |
| `PUT` | `/api/documents/employees/signatures/:id` | Update existing employee signature |
| `DELETE`| `/api/documents/employees/signatures/:id` | Delete employee signature |
| `POST` | `/api/signatures/submit` | Submit recipient signature, mark Completed & dispatch email |
