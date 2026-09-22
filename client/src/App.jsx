import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';

// Layout
import Layout from './components/Layout';
import GlobalAlertModal from './components/GlobalAlertModal';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

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
import SelfSignCreate from './pages/selfsign/SelfSignCreate';
import SelfSignDetail from './pages/selfsign/SelfSignDetail';
import BulkSend from './pages/BulkSend';
import Templates from './pages/Templates';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import MyProfile from './pages/MyProfile';
import Settings from './pages/Settings';
import SignaturesModule from './pages/SignaturesModule';
import UserManagement from './pages/UserManagement';
import VerifyDocument from './pages/VerifyDocument';
import DocumentViewer from './pages/DocumentViewer';
import Notifications from './pages/Notifications';
import RequirePermission from './components/RequirePermission';
import GeneralSettings from './pages/settings/GeneralSettings';
import DeveloperSettings from './pages/settings/DeveloperSettings';
import DeveloperApi from './pages/settings/DeveloperApi';
import PermissionsPage from './pages/settings/Permissions';
import NotificationSettings from './pages/settings/NotificationSettings';
import FailedAccess from './pages/settings/FailedAccess';
import DocumentValidity from './pages/settings/DocumentValidity';
import ActivityHistory from './pages/settings/ActivityHistory';

// The former "Others" pages now live in Settings
const OTHERS_REDIRECTS = {
  'failed-access': '/settings/failed-access',
  'document-validity': '/settings/document-validity',
  'activity-history': '/settings/activity-history',
  api: '/settings/developer-api'
};
function OthersRedirect() {
  const { tab } = useParams();
  return <Navigate to={OTHERS_REDIRECTS[tab] || '/settings/general'} replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public Recipient Signing Token Route (Section 21 & 22 PDF Requirement) */}
        <Route path="/sign/:token" element={<PublicSigning />} />
        <Route path="/verify" element={<VerifyDocument />} />
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
          <Route path="/documents/:id/view" element={<DocumentViewer />} />
          <Route path="/documents/:id/send" element={<SendForSignatures />} />
          <Route path="/documents/:id/email-preview" element={<EmailInvitationPreview />} />

          {/* Older links keep working, but every page lives at one address so the sidebar highlights one entry */}
          <Route path="/send-for-signatures" element={<Navigate to="/documents/create" replace />} />

          {/* Sign yourself: the hub and its tabs, the step-by-step create flow, one document, and the field editor */}
          <Route path="/sign-yourself" element={<SignYourself />} />
          <Route path="/sign-yourself/new" element={<SelfSignCreate />} />
          <Route path="/sign-yourself/new/:id" element={<SelfSignCreate />} />
          <Route path="/sign-yourself/doc/:id" element={<SelfSignDetail />} />
          <Route path="/sign-yourself/doc/:id/history" element={<SelfSignDetail />} />
          <Route path="/sign-yourself/prepare/:id" element={<DocumentEditor />} />
          <Route path="/sign-yourself/:tab" element={<SignYourself />} />
          <Route path="/signatures" element={<SignaturesModule />} />
          <Route path="/settings/signatures" element={<Navigate to="/signatures" replace />} />

          {/* Templates & Reports */}
          <Route path="/templates" element={<Templates />} />
          <Route path="/reports" element={<RequirePermission any={['reports.view']}><Reports /></RequirePermission>} />
          <Route path="/reports/:tab" element={<RequirePermission any={['reports.view']}><Reports /></RequirePermission>} />

          {/* Notifications (header bell) */}
          <Route path="/notifications" element={<Notifications />} />

          {/* Settings: organization, account, security & logs, developer */}
          <Route path="/users" element={<UserManagement />} />
          <Route path="/settings/users" element={<Navigate to="/users" replace />} />
          <Route path="/others/:tab" element={<OthersRedirect />} />
          <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
          <Route path="/settings/general" element={<GeneralSettings />} />
          <Route path="/settings/permissions" element={<RequirePermission any={['roles.manage', 'users.view']}><PermissionsPage /></RequirePermission>} />
          <Route path="/settings/profile" element={<MyProfile />} />
          <Route path="/settings/notifications" element={<NotificationSettings />} />
          <Route path="/settings/contacts" element={<Settings />} />
          <Route path="/settings/trash" element={<DocumentsList />} />
          <Route path="/settings/integrations" element={<Integrations />} />
          <Route path="/settings/failed-access" element={<RequirePermission any={['security.failed_access']}><FailedAccess /></RequirePermission>} />
          <Route path="/settings/document-validity" element={<RequirePermission any={['security.document_validity']}><DocumentValidity /></RequirePermission>} />
          <Route path="/settings/activity-history" element={<RequirePermission any={['security.activity_history']}><ActivityHistory /></RequirePermission>} />
          <Route path="/settings/developer" element={<RequirePermission any={['settings.developer']}><DeveloperSettings /></RequirePermission>} />
          <Route path="/settings/developer-api" element={<RequirePermission any={['api.keys', 'api.webhooks', 'api.logs']}><DeveloperApi /></RequirePermission>} />
          <Route path="/settings/:tab" element={<Settings />} />
        </Route>

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <GlobalAlertModal />
    </Router>
  );
}
