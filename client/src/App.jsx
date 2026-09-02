import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layout
import Layout from './components/Layout';
import GlobalAlertModal from './components/GlobalAlertModal';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Dashboard & Core Pages
import Dashboard from './pages/Dashboard';
import CreateDocument from './pages/CreateDocument';
import RichTextDocumentEditor from './components/RichTextDocumentEditor';
import DocumentEditor from './pages/DocumentEditor';
import DocumentDetails from './pages/DocumentDetails';
import SendDocument from './pages/SendDocument';
import SendForSignatures from './pages/SendForSignatures';
import EmailInvitationPreview from './pages/EmailInvitationPreview';
import DocumentsList from './pages/DocumentsList';
import PublicSigning from './pages/PublicSigning';
import SignYourself from './pages/SignYourself';
import BulkSend from './pages/BulkSend';
import Templates from './pages/Templates';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import MyProfile from './pages/MyProfile';
import Settings from './pages/Settings';
import SignaturesModule from './pages/SignaturesModule';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<Login />} />

        {/* Public Recipient Signing Token Route (Section 21 & 22 PDF Requirement) */}
        <Route path="/sign/:token" element={<PublicSigning />} />
        <Route path="/documents/sign/:id" element={<PublicSigning />} />

        {/* Protected App Routes inside Main Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Document Workflows */}
          <Route path="/documents" element={<DocumentsList />} />
          <Route path="/documents/all" element={<DocumentsList />} />
          <Route path="/documents/sent/bulk" element={<BulkSend />} />
          <Route path="/documents/sent/:statusFilter" element={<DocumentsList />} />
          <Route path="/documents/received" element={<DocumentsList />} />
          <Route path="/documents/received/:statusFilter" element={<DocumentsList />} />
          <Route path="/documents/create" element={<SendForSignatures />} />
          <Route path="/documents/create-editor" element={<RichTextDocumentEditor />} />
          <Route path="/documents/:id" element={<DocumentDetails />} />
          <Route path="/documents/:id/details" element={<DocumentDetails />} />
          <Route path="/documents/:id/edit" element={<DocumentEditor />} />
          <Route path="/documents/:id/send" element={<SendForSignatures />} />
          <Route path="/documents/:id/email-preview" element={<EmailInvitationPreview />} />

          {/* Quick Actions Shortcuts */}
          <Route path="/send-for-signatures" element={<SendForSignatures />} />
          <Route path="/sign-yourself" element={<SignYourself />} />
          <Route path="/signatures" element={<SignaturesModule />} />
          <Route path="/settings/signatures" element={<SignaturesModule />} />

          {/* Templates & Reports */}
          <Route path="/templates" element={<Templates />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:tab" element={<Reports />} />

          {/* Others & Settings */}
          <Route path="/others/:tab" element={<Settings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/profile" element={<MyProfile />} />
          <Route path="/settings/contacts" element={<Settings />} />
          <Route path="/settings/trash" element={<DocumentsList />} />
          <Route path="/settings/integrations" element={<Integrations />} />
          <Route path="/settings/:tab" element={<Settings />} />
        </Route>

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <GlobalAlertModal />
    </Router>
  );
}
