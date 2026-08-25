# BexSign UI Pages & Modules Reference Manual

This manual documents all user interface screens and frontend workflows in **BexSign**.

---

## 1. Authentication Pages

### Login (`/login`)
- **Component**: `Login.jsx`
- **Features**: User authentication with Email & Password, error alerts, redirection to `/dashboard`, link to sign-up.

### Register (`/register`)
- **Component**: `Register.jsx`
- **Features**: Account creation form (First Name, Last Name, Email, Password), redirects to `/login` upon success.

---

## 2. Main Application Layout

### Sidebar Navigation & Header Layout (`/`)
- **Component**: `Layout.jsx`
- **Features**: Collapsible sidebar, brand logo, quick search header bar, notification bell indicator, user profile avatar, and logout handler.

---

## 3. Core Document & Signing Modules

### Create Document Workflow (`/documents/create`)
- **Component**: `CreateDocument.jsx`
- **Features**: Multi-source selection (Desktop, Cloud, Templates), drag-and-drop file upload, document name & recipient email fields, submits `FormData` to `/api/documents/upload`.

### Signature Placement Editor Canvas (`/documents/sign/:id`)
- **Component**: `DocumentSignEditor.jsx`
- **Features**: Standard signature field tools (✍️ Signature, 📅 Date, 👤 Name, 🛡️ Stamp), custom field adder, interactive PDF canvas preview, and "Send Document" dispatch trigger.

### Document Status Tracking Dashboard (`/documents`)
- **Component**: `DocumentsList.jsx`
- **Features**: Filterable sidebar categories (`All Documents`, `Draft`, `In Progress`, `Completed`, `Declined`, `Expired`, `Recalled`, `Scheduled`, `Bulk send`, and `Needs your action`), status pills, and timestamp rendering.

---

## 4. Administrative & Integration Modules

### Templates Management (`/templates`)
- **Component**: `Templates.jsx`
- **Features**: Reusable template repository, "+ Create Template" modal popup dialog, file upload, and active sign form counter.

### Reports & Timeline Audit (`/reports`)
- **Component**: `Reports.jsx`
- **Features**: Status Breakdown Summary Cards, graphical activity view, and complete audit trail timeline.

### Settings, Profile & Developer Settings (`/settings`)
- **Component**: `Settings.jsx`
- **Features**: Sub-sidebar tabs (`Profile`, `Integrations`, `Notifications`, `Contacts`, `Trash`, `Developer Settings`), profile editor form, app connectors (Zoho CRM, Google Workspace, Stripe), and OAuth Token generator.
