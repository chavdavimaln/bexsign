import React, { useState } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Send,
  Inbox,
  FileBox,
  BarChart3,
  Globe,
  Settings as SettingsIcon,
  PenTool,
  PlusCircle,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Layers,
  User,
  Users,
  Trash2,
  Code,
  ShieldCheck,
  History,
  AlertOctagon
} from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openSubmenu, setOpenSubmenu] = useState({
    documents: true,
    sent: false,
    reports: false,
    others: false,
    settings: false,
    signatures: false
  });

  // Modal triggers
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [showPortalsModal, setShowPortalsModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleSubmenu = (menuKey) => {
    setOpenSubmenu(prev => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col justify-between shrink-0 z-20 shadow-sm`}>
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="bg-[#E71414] text-white p-1.5 rounded-lg font-black text-lg tracking-wider">
                BS
              </div>
              {sidebarOpen && (
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  BEX<span className="text-[#E71414]">SIGN</span>
                </span>
              )}
            </Link>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition"
              title="Toggle Menu"
            >
              ☰
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="mt-3 px-3 space-y-1">
            {/* Dashboard */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition font-medium text-sm ${
                isActive('/dashboard')
                  ? 'bg-red-50 text-[#E71414] font-semibold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard size={18} className={isActive('/dashboard') ? 'text-[#E71414]' : 'text-slate-500'} />
              {sidebarOpen && <span>Dashboard</span>}
            </Link>

            {/* Documents Collapsible Header */}
            <div>
              <button
                onClick={() => toggleSubmenu('documents')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition text-sm font-medium"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-slate-500" />
                  {sidebarOpen && <span>Documents</span>}
                </div>
                {sidebarOpen && (openSubmenu.documents ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>

              {sidebarOpen && openSubmenu.documents && (
                <div className="ml-6 pl-2 border-l border-slate-200 space-y-1 my-1">
                  {/* Sent Submenu */}
                  <div>
                    <button
                      onClick={() => toggleSubmenu('sent')}
                      className="w-full flex items-center justify-between py-1.5 px-2 text-xs font-semibold text-slate-600 hover:text-[#E71414] transition"
                    >
                      <div className="flex items-center gap-2">
                        <Send size={14} />
                        <span>Sent Documents</span>
                      </div>
                      {openSubmenu.sent ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {openSubmenu.sent && (
                      <div className="ml-4 space-y-1 text-xs text-slate-500 py-1">
                        <Link to="/documents/all" className="block py-1.5 px-2 font-extrabold text-slate-900 hover:text-[#E71414] bg-slate-100/80 rounded mb-1">📁 All Documents</Link>
                        <Link to="/documents/sent/all" className="block py-1 px-2 hover:text-[#E71414] rounded">All Sent</Link>
                        <Link to="/documents/create" className="block py-1 px-2 hover:text-[#E71414] rounded font-medium text-[#E71414]">+ Create Document</Link>
                        <Link to="/documents/sent/scheduled" className="block py-1 px-2 hover:text-[#E71414] rounded">Scheduled</Link>
                        <Link to="/documents/sent/in-progress" className="block py-1 px-2 hover:text-[#E71414] rounded">In Progress</Link>
                        <Link to="/documents/sent/completed" className="block py-1 px-2 hover:text-[#E71414] rounded">Completed</Link>
                        <Link to="/documents/sent/declined" className="block py-1 px-2 hover:text-[#E71414] rounded">Declined</Link>
                        <Link to="/documents/sent/expired" className="block py-1 px-2 hover:text-[#E71414] rounded">Expired</Link>
                        <Link to="/documents/sent/recalled" className="block py-1 px-2 hover:text-[#E71414] rounded">Recalled</Link>
                        <Link to="/documents/sent/draft" className="block py-1 px-2 hover:text-[#E71414] rounded">Draft</Link>
                        <Link to="/documents/sent/bulk" className="block py-1 px-2 hover:text-[#E71414] rounded">Bulk Send</Link>
                      </div>
                    )}
                  </div>

                  {/* Received Submenu */}
                  <div className="pt-1">
                    <Link to="/documents/received" className="flex items-center gap-2 py-1.5 px-2 text-xs font-semibold text-slate-600 hover:text-[#E71414]">
                      <Inbox size={14} />
                      <span>Received</span>
                    </Link>
                    <div className="ml-4 space-y-1 text-xs text-slate-500 py-1">
                      <Link to="/documents/received/all" className="block py-1 px-2 hover:text-[#E71414] rounded">All Received</Link>
                      <Link to="/documents/received/action" className="block py-1 px-2 text-amber-600 font-semibold hover:text-[#E71414] rounded">Needs Action</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Templates */}
            <Link
              to="/templates"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition font-medium text-sm ${
                isActive('/templates') ? 'bg-red-50 text-[#E71414] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileBox size={18} className={isActive('/templates') ? 'text-[#E71414]' : 'text-slate-500'} />
              {sidebarOpen && <span>Templates</span>}
            </Link>

            {/* Reports */}
            <div>
              <button
                onClick={() => toggleSubmenu('reports')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition text-sm font-medium"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} className="text-slate-500" />
                  {sidebarOpen && <span>Reports</span>}
                </div>
                {sidebarOpen && (openSubmenu.reports ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>
              {sidebarOpen && openSubmenu.reports && (
                <div className="ml-6 pl-2 border-l border-slate-200 space-y-1 my-1 text-xs text-slate-600">
                  <Link to="/reports/all" className="block py-1.5 px-2 hover:text-[#E71414]">All Reports</Link>
                  <Link to="/reports/timeline" className="block py-1.5 px-2 hover:text-[#E71414]">Timeline</Link>
                  <Link to="/reports/scheduled" className="block py-1.5 px-2 hover:text-[#E71414]">Scheduled Reports</Link>
                </div>
              )}
            </div>

            {/* Others */}
            <div>
              <button
                onClick={() => toggleSubmenu('others')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition text-sm font-medium"
              >
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-slate-500" />
                  {sidebarOpen && <span>Others</span>}
                </div>
                {sidebarOpen && (openSubmenu.others ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>
              {sidebarOpen && openSubmenu.others && (
                <div className="ml-6 pl-2 border-l border-slate-200 space-y-1 my-1 text-xs text-slate-600">
                  <Link to="/others/failed-access" className="flex items-center gap-1.5 py-1.5 px-2 hover:text-[#E71414]"><AlertOctagon size={13}/> Failed Access</Link>
                  <Link to="/others/document-validity" className="flex items-center gap-1.5 py-1.5 px-2 hover:text-[#E71414]"><ShieldCheck size={13}/> Document Validity</Link>
                  <Link to="/others/activity-history" className="flex items-center gap-1.5 py-1.5 px-2 hover:text-[#E71414]"><History size={13}/> Activity History</Link>
                  <Link to="/others/api" className="flex items-center gap-1.5 py-1.5 px-2 hover:text-[#E71414]"><Code size={13}/> Developer API</Link>
                </div>
              )}
            </div>

            {/* Settings */}
            <div>
              <button
                onClick={() => toggleSubmenu('settings')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition text-sm font-medium"
              >
                <div className="flex items-center gap-3">
                  <SettingsIcon size={18} className="text-slate-500" />
                  {sidebarOpen && <span>Settings</span>}
                </div>
                {sidebarOpen && (openSubmenu.settings ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>
              {sidebarOpen && openSubmenu.settings && (
                <div className="ml-6 pl-2 border-l border-slate-200 space-y-1 my-1 text-xs text-slate-600">
                  <Link to="/settings/general" className="block py-1.5 px-2 hover:text-[#E71414]">General</Link>
                  <Link to="/settings/profile" className="flex items-center gap-1.5 py-1.5 px-2 hover:text-[#E71414]"><User size={13}/> My Profile</Link>
                  <Link to="/settings/integrations" className="block py-1.5 px-2 hover:text-[#E71414]">Integrations</Link>
                  <Link to="/settings/notifications" className="block py-1.5 px-2 hover:text-[#E71414]">My Notifications</Link>
                  <Link to="/settings/contacts" className="flex items-center gap-1.5 py-1.5 px-2 hover:text-[#E71414]"><Users size={13}/> Contacts</Link>
                  <Link to="/settings/trash" className="flex items-center gap-1.5 py-1.5 px-2 hover:text-[#E71414] text-red-600"><Trash2 size={13}/> Trash</Link>
                  <Link to="/settings/developer" className="block py-1.5 px-2 hover:text-[#E71414]">Developer Settings</Link>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div>
              <button
                onClick={() => toggleSubmenu('signatures')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition text-sm font-medium"
              >
                <div className="flex items-center gap-3">
                  <PenTool size={18} className="text-slate-500" />
                  {sidebarOpen && <span>Signatures</span>}
                </div>
                {sidebarOpen && (openSubmenu.signatures ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
              </button>
              {sidebarOpen && openSubmenu.signatures && (
                <div className="ml-6 pl-2 border-l border-slate-200 space-y-1 my-1 text-xs text-slate-600">
                  <Link to="/signatures" className="block py-1.5 px-2 hover:text-[#E71414]">My Signatures</Link>
                  <Link to="/send-for-signatures" className="block py-1.5 px-2 hover:text-[#E71414]">Send for Signatures</Link>
                  <Link to="/sign-yourself" className="block py-1.5 px-2 hover:text-[#E71414] font-medium text-[#E71414]">Sign Yourself</Link>
                  <Link to="/templates" className="block py-1.5 px-2 hover:text-[#E71414]">Use Template</Link>
                </div>
              )}
            </div>

            {/* Sidebar Popup Actions */}
            <div className="pt-4 border-t border-slate-200 mt-2 space-y-1">
              <button
                onClick={() => setShowAnnouncementsModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-[#E71414] text-xs font-semibold transition"
              >
                <Megaphone size={16} className="text-amber-500" />
                {sidebarOpen && <span>Announcements</span>}
              </button>
              <button
                onClick={() => setShowPortalsModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-[#E71414] text-xs font-semibold transition"
              >
                <Layers size={16} className="text-indigo-500" />
                {sidebarOpen && <span>My Portals</span>}
              </button>
            </div>
          </nav>

          {/* Quick Create CTA at Bottom */}
          <div className="p-3 mt-auto border-t border-slate-100 sticky bottom-0 bg-white">
            <Link
              to="/documents/create"
              className="w-full bg-[#E71414] hover:bg-[#c40f0f] text-white py-2.5 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition text-sm shadow-md"
            >
              <PlusCircle size={18} />
              {sidebarOpen && <span>Create Document</span>}
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navigation Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-xs shrink-0">
          {/* Search bar */}
          <div className="relative w-48 sm:w-80">
            <input
              type="text"
              placeholder="Search documents, recipients, templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E71414] focus:bg-white text-slate-900 transition"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition" title="Notifications">
              <Bell size={20} />
              <span className="absolute top-1 right-1 bg-[#E71414] text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                3
              </span>
            </button>

            <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
              <div className="h-9 w-9 rounded-full bg-[#E71414] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                V
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-bold text-slate-800">Vimal Chavda</p>
                <p className="text-slate-500">vimal@bexsign.com</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Main View */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Sidebar Popup: Announcements Modal */}
      {showAnnouncementsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="text-[#E71414]" size={20} /> System Announcements
              </h3>
              <button onClick={() => setShowAnnouncementsModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm">
              <div className="p-3 bg-red-50 border-l-4 border-[#E71414] rounded">
                <p className="font-bold text-[#E71414]">New Feature Released!</p>
                <p className="text-slate-600 mt-1">Bulk Send with CSV mail merge mapping is now active across all accounts.</p>
              </div>
              <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded">
                <p className="font-bold text-amber-800">Scheduled Maintenance</p>
                <p className="text-slate-600 mt-1">System upgrade scheduled for Aug 30, 2026 at 02:00 AM UTC.</p>
              </div>
            </div>
            <button onClick={() => setShowAnnouncementsModal(false)} className="w-full mt-2 btn-primary py-2 rounded-lg font-medium">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Popup: My Portals Modal */}
      {showPortalsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="text-indigo-600" size={20} /> My Portals
              </h3>
              <button onClick={() => setShowPortalsModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Enterprise HR Portal</p>
                  <p className="text-xs text-slate-500">12 Users • Active</p>
                </div>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs rounded font-semibold">Active</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">Legal Contracts Portal</p>
                  <p className="text-xs text-slate-500">5 Users • Active</p>
                </div>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs rounded font-semibold">Active</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPortalsModal(false)} className="w-1/2 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => setShowPortalsModal(false)} className="w-1/2 btn-primary py-2 rounded-lg font-medium">
                + Create Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
