import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Send,
  Inbox,
  FileBox,
  BarChart3,
  Settings as SettingsIcon,
  PenTool,
  PlusCircle,
  Plus,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Megaphone,
  Layers,
  User,
  Users,
  Trash2,
  Code,
  ShieldCheck,
  History,
  AlertOctagon,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  KeyRound,
  BellRing,
  Contact,
  SlidersHorizontal,
  Wrench
} from 'lucide-react';
import NotificationBell from './notifications/NotificationBell';
import { PermissionsProvider, usePermissions } from '../utils/permissions';

/**
 * Sidebar menu. Groups open one at a time (opening a group closes the one that was open, at every level), and the
 * group holding the current page opens by itself. `match` lists other paths that belong to an item; `count` is the
 * document status whose number is shown next to it.
 */
const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', match: ['/'] },
      { key: 'notifications', label: 'Notifications', icon: Bell, to: '/notifications' },
      { key: 'users', label: 'Users & Roles', icon: Users, to: '/users', perm: 'users.view' }
    ]
  },
  {
    title: 'Workspace',
    items: [
      {
        key: 'documents',
        label: 'Documents',
        icon: FileText,
        children: [
          {
            key: 'sent',
            label: 'Sent Documents',
            icon: Send,
            children: [
              { label: 'All Documents', to: '/documents/all', match: ['/documents'], icon: FolderOpen, count: 'all' },
              { label: 'All Sent', to: '/documents/sent/all', icon: Send },
              { label: 'Create Document', to: '/documents/create', icon: Plus, tone: 'accent' },
              { label: 'Scheduled', to: '/documents/sent/scheduled', dot: '#0ea5e9', count: 'scheduled' },
              { label: 'In Progress', to: '/documents/sent/in-progress', dot: '#f59e0b', count: 'in progress' },
              { label: 'Completed', to: '/documents/sent/completed', dot: '#10b981', count: 'completed' },
              { label: 'Declined', to: '/documents/sent/declined', dot: '#f43f5e', count: 'declined' },
              { label: 'Expired', to: '/documents/sent/expired', dot: '#94a3b8', count: 'expired' },
              { label: 'Recalled', to: '/documents/sent/recalled', dot: '#f97316', count: 'recalled' },
              { label: 'Draft', to: '/documents/sent/draft', dot: '#64748b', count: 'draft' },
              { label: 'Bulk Send', to: '/documents/sent/bulk', dot: '#6366f1' }
            ]
          },
          {
            key: 'received',
            label: 'Received',
            icon: Inbox,
            children: [
              { label: 'All Received', to: '/documents/received/all', match: ['/documents/received'], icon: Inbox },
              { label: 'Needs Action', to: '/documents/received/action', dot: '#f59e0b', tone: 'warn' }
            ]
          }
        ]
      },
      { key: 'templates', label: 'Templates', icon: FileBox, to: '/templates', perm: 'templates.view' },
      {
        key: 'reports',
        label: 'Reports',
        icon: BarChart3,
        children: [
          { label: 'All Reports', to: '/reports/all', match: ['/reports'], dot: '#6366f1', perm: 'reports.view' },
          { label: 'Timeline', to: '/reports/timeline', dot: '#0ea5e9', perm: 'reports.view' },
          { label: 'Scheduled Reports', to: '/reports/scheduled', dot: '#10b981', perm: 'reports.view' }
        ]
      }
    ]
  },
  {
    title: 'Manage',
    items: [
      {
        key: 'settings',
        label: 'Settings',
        icon: SettingsIcon,
        children: [
          {
            key: 'settings-org',
            label: 'Organization',
            icon: Building2,
            children: [
              { label: 'General', to: '/settings/general', match: ['/settings'], icon: SlidersHorizontal },
              { label: 'Users & Roles', to: '/settings/users', icon: Users, perm: 'users.view' },
              { label: 'Roles & Permissions', to: '/settings/permissions', icon: KeyRound, perm: ['roles.manage', 'users.view'] },
              { label: 'Integrations', to: '/settings/integrations', icon: Layers },
              { label: 'Contacts', to: '/settings/contacts', icon: Contact },
              { label: 'Trash', to: '/settings/trash', icon: Trash2, tone: 'danger' }
            ]
          },
          {
            key: 'settings-account',
            label: 'My Account',
            icon: User,
            children: [
              { label: 'My Profile', to: '/settings/profile', icon: User },
              { label: 'My Notifications', to: '/settings/notifications', icon: BellRing }
            ]
          },
          {
            key: 'settings-security',
            label: 'Security & Logs',
            icon: ShieldCheck,
            children: [
              { label: 'Failed Access', to: '/settings/failed-access', match: ['/others/failed-access'], icon: AlertOctagon, perm: 'security.failed_access' },
              { label: 'Document Validity', to: '/settings/document-validity', match: ['/others/document-validity'], icon: ShieldCheck, perm: 'security.document_validity' },
              { label: 'Activity History', to: '/settings/activity-history', match: ['/others/activity-history'], icon: History, perm: 'security.activity_history' }
            ]
          },
          {
            key: 'settings-developer',
            label: 'Developer',
            icon: Code,
            children: [
              { label: 'Developer Settings', to: '/settings/developer', icon: Wrench, perm: 'settings.developer' },
              { label: 'Developer API', to: '/settings/developer-api', match: ['/others/api'], icon: Code, perm: ['api.keys', 'api.webhooks', 'api.logs'] }
            ]
          }
        ]
      },
      {
        key: 'signatures',
        label: 'Signatures',
        icon: PenTool,
        children: [
          { label: 'My Signatures', to: '/signatures', match: ['/settings/signatures'], icon: PenTool },
          { label: 'Send for Signatures', to: '/send-for-signatures', icon: Send },
          { label: 'Sign Yourself', to: '/sign-yourself', icon: Plus, tone: 'accent' },
          { label: 'Use Template', to: '/templates', icon: FileBox, perm: 'templates.view' }
        ]
      }
    ]
  }
];

/** Menu without the items the user has no permission for (and without groups that end up empty). */
function filterNav(items, can) {
  return items
    .filter((item) => !item.perm || [].concat(item.perm).some((key) => can(key)))
    .map((item) => (item.children ? { ...item, children: filterNav(item.children, can) } : item))
    .filter((item) => !item.children || item.children.length > 0);
}

const itemMatches = (item, pathname) => Boolean(item.to) && (pathname === item.to || (item.match || []).includes(pathname));

/** Keys of the groups leading to the item of the current page, e.g. ['documents', 'sent']; null when none. */
function findActivePath(pathname) {
  const topItems = NAV_SECTIONS.flatMap((section) => section.items);
  // A top-level page (e.g. Templates) wins over the same page listed inside a group
  if (topItems.some((item) => !item.children && itemMatches(item, pathname))) return [];
  const search = (items, trail) => {
    for (const item of items) {
      if (item.children) {
        const found = search(item.children, [...trail, item.key]);
        if (found) return found;
      } else if (itemMatches(item, pathname)) {
        return trail;
      }
    }
    return null;
  };
  return search(topItems, []);
}

const groupContains = (group, pathname) => (group.children || []).some((child) => (child.children ? groupContains(child, pathname) : itemMatches(child, pathname)));

/** Animated open/close: the grid row grows from 0fr to 1fr; closed content is inert (not focusable). */
function Collapse({ open, id, children }) {
  return (
    <div
      id={id}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      inert={open ? undefined : ''}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export default function Layout() {
  return (
    <PermissionsProvider>
      <AppLayout />
    </PermissionsProvider>
  );
}

function AppLayout() {
  const { can } = usePermissions();
  const navSections = useMemo(
    () => NAV_SECTIONS.map((section) => ({ ...section, items: filterNav(section.items, can) })).filter((section) => section.items.length > 0),
    [can]
  );
  // Desktop keeps the sidebar open; phones and tablets start with it closed (overlay drawer)
  const isDesktopWidth = () => typeof window === 'undefined' || window.innerWidth >= 1024;
  const [sidebarOpen, setSidebarOpen] = useState(isDesktopWidth);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem('user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { name: 'Vimal Chavda', email: 'vimal@bexcodeservices.com', role: 'manager' };
  }, []);

  // Modal triggers
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [showPortalsModal, setShowPortalsModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;

  // Open groups as a path of keys, one per level: ['documents', 'sent'] = Documents > Sent Documents
  const [openPath, setOpenPath] = useState(() => {
    const active = findActivePath(pathname);
    return active && active.length > 0 ? active : ['documents'];
  });
  const navRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Accordion: opening a group closes the other groups of the same level (and anything open below them)
  const toggleGroup = (level, key) => {
    setOpenPath((prev) => (prev[level] === key ? prev.slice(0, level) : [...prev.slice(0, level), key]));
  };

  // Collapsed desktop sidebar: a group icon expands the sidebar with that group open
  const openGroupFromRail = (key) => {
    setSidebarOpen(true);
    setOpenPath([key]);
  };

  useEffect(() => {
    if (!isDesktopWidth()) setSidebarOpen(false);
    // The group of the page just opened opens by itself (closing the others) and its link scrolls into view
    const active = findActivePath(pathname);
    if (active && active.length > 0) setOpenPath(active);
    const timer = setTimeout(() => {
      const current = navRef.current?.querySelector('[aria-current="page"]');
      if (current) current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 320);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Number of documents per status for the Sent Documents list (refreshed when the page changes)
  const [statusCounts, setStatusCounts] = useState({});
  useEffect(() => {
    let cancelled = false;
    fetch('http://localhost:5000/api/documents')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data?.documents)) return;
        const counts = { all: data.documents.length };
        data.documents.forEach((doc) => {
          let status = String(doc.status || 'Draft').toLowerCase();
          if (status === 'in process') status = 'in progress';
          counts[status] = (counts[status] || 0) + 1;
        });
        setStatusCounts(counts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const renderLeaf = (item) => {
    const active = itemMatches(item, pathname);
    const Icon = item.icon;
    const count = item.count ? statusCounts[item.count] || 0 : 0;
    const toneClass = active
      ? 'bg-gradient-to-r from-red-50 to-rose-50/30 text-[#c81010] font-semibold'
      : item.tone === 'accent'
        ? 'text-[#E71414] font-semibold hover:bg-red-50'
        : item.tone === 'warn'
          ? 'text-amber-700 font-semibold hover:bg-amber-50'
          : item.tone === 'danger'
            ? 'text-rose-600 hover:bg-rose-50'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900';
    return (
      <Link
        key={item.to + item.label}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={`group/leaf relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12.5px] transition-colors duration-150 ${toneClass}`}
      >
        {active && <span className="absolute -left-[11.5px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#E71414]" aria-hidden="true" />}
        {Icon ? (
          <Icon size={13} className={`shrink-0 ${active ? 'text-[#E71414]' : item.tone ? '' : 'text-slate-400 group-hover/leaf:text-slate-600'}`} />
        ) : (
          <span
            className={`h-2 w-2 shrink-0 rounded-full ring-2 ${active ? 'ring-red-100' : 'ring-transparent'}`}
            style={{ backgroundColor: item.dot || '#cbd5e1' }}
            aria-hidden="true"
          />
        )}
        <span className="truncate">{item.label}</span>
        {count > 0 && (
          <span
            className={`ml-auto min-w-[22px] rounded-full px-1.5 py-px text-center text-[10px] font-bold tabular-nums transition ${
              active ? 'bg-[#E71414] text-white shadow-sm shadow-red-500/30' : 'bg-slate-100 text-slate-500 group-hover/leaf:bg-white group-hover/leaf:shadow-sm'
            }`}
          >
            {count}
          </span>
        )}
      </Link>
    );
  };

  // Second level group (Sent Documents, Received) with its own accordion
  const renderSubGroup = (group) => {
    const open = openPath[1] === group.key;
    const containsActive = groupContains(group, pathname);
    const Icon = group.icon;
    return (
      <div key={group.key}>
        <button
          type="button"
          onClick={() => toggleGroup(1, group.key)}
          aria-expanded={open}
          aria-controls={`sidebar-group-${group.key}`}
          className={`group/sub flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold transition-colors duration-150 ${
            open ? 'bg-slate-100/80 text-slate-900' : containsActive ? 'text-[#c81010] hover:bg-red-50/60' : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
          }`}
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md transition ${
              containsActive ? 'bg-red-100 text-[#E71414]' : open ? 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200' : 'bg-slate-100 text-slate-500 group-hover/sub:bg-white'
            }`}
          >
            <Icon size={13} />
          </span>
          <span className="truncate">{group.label}</span>
          <ChevronDown size={14} className={`ml-auto shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-slate-600' : 'text-slate-400'}`} />
        </button>
        <Collapse open={open} id={`sidebar-group-${group.key}`}>
          <div className="relative mb-1.5 ml-[0.8rem] mt-1 space-y-px border-l border-slate-200 pl-2.5">
            {group.children.map((child) => renderLeaf(child))}
          </div>
        </Collapse>
      </div>
    );
  };

  const renderTopItem = (item) => {
    const Icon = item.icon;
    const containsActive = item.children ? groupContains(item, pathname) : itemMatches(item, pathname);
    const open = Boolean(item.children) && openPath[0] === item.key;
    const tileClass = `grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all duration-200 ${
      containsActive
        ? 'bg-gradient-to-br from-[#f03030] to-[#c20f0f] text-white shadow-md shadow-red-500/30'
        : open
          ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
          : 'bg-slate-100/90 text-slate-500 group-hover:bg-white group-hover:text-[#E71414] group-hover:shadow-sm group-hover:ring-1 group-hover:ring-slate-200'
    }`;
    const rowClass = `group relative flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-[13.5px] font-semibold transition-colors duration-200 ${
      sidebarOpen ? '' : 'justify-center'
    } ${
      containsActive && !open
        ? 'bg-gradient-to-r from-red-50 to-rose-50/20 text-[#c81010]'
        : open
          ? 'bg-slate-50 text-slate-900'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;
    const accent = containsActive && <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#E71414]" aria-hidden="true" />;

    if (!item.children) {
      return (
        <Link key={item.key} to={item.to} title={sidebarOpen ? undefined : item.label} aria-current={containsActive ? 'page' : undefined} className={rowClass}>
          {accent}
          <span className={tileClass}><Icon size={17} /></span>
          {sidebarOpen && <span className="truncate">{item.label}</span>}
        </Link>
      );
    }

    return (
      <div key={item.key}>
        <button
          type="button"
          onClick={() => (sidebarOpen ? toggleGroup(0, item.key) : openGroupFromRail(item.key))}
          title={sidebarOpen ? undefined : item.label}
          aria-expanded={sidebarOpen ? open : undefined}
          aria-controls={`sidebar-group-${item.key}`}
          className={rowClass}
        >
          {accent}
          <span className={tileClass}><Icon size={17} /></span>
          {sidebarOpen && (
            <>
              <span className="truncate">{item.label}</span>
              <ChevronDown size={16} className={`ml-auto shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-slate-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
            </>
          )}
        </button>
        {sidebarOpen && (
          <Collapse open={open} id={`sidebar-group-${item.key}`}>
            <div className="relative mb-2 ml-[1.35rem] mt-1 space-y-0.5 border-l border-slate-200 pl-2.5">
              {item.children.map((child) => (child.children ? renderSubGroup(child) : renderLeaf(child)))}
            </div>
          </Collapse>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className={`${sidebarOpen ? 'fixed inset-y-0 left-0 w-64 lg:static' : 'hidden lg:w-20'} lg:flex bg-gradient-to-b from-white via-white to-slate-50 border-r border-slate-200/80 transition-all duration-300 flex flex-col shrink-0 z-40 lg:z-20 shadow-[4px_0_24px_-12px_rgba(15,23,42,0.12)]`}>
        {/* Logo & Brand */}
        <div className={`flex h-16 shrink-0 items-center border-b border-slate-100 ${sidebarOpen ? 'justify-between px-4' : 'justify-center px-2'}`}>
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5" title="BexSign dashboard">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ff3d3d] via-[#E71414] to-[#b30c0c] text-[15px] font-black tracking-wider text-white shadow-lg shadow-red-500/30 ring-1 ring-white/40">
              BS
            </div>
            {sidebarOpen && (
              <div className="min-w-0 leading-tight">
                <p className="text-[19px] font-extrabold tracking-tight text-slate-900">
                  BEX<span className="text-[#E71414]">SIGN</span>
                </p>
                <p className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400">e-Signature suite</p>
              </div>
            )}
          </Link>
          {sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Collapse menu"
              aria-label="Collapse menu"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav ref={navRef} className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4" aria-label="Main navigation">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mx-auto mt-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="Expand menu"
              aria-label="Expand menu"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
          {navSections.map((section) => (
            <div key={section.title}>
              {sidebarOpen ? (
                <p className="px-2.5 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{section.title}</p>
              ) : (
                <div className="mx-auto my-3 h-px w-8 bg-slate-200" aria-hidden="true" />
              )}
              <div className="space-y-1">{section.items.map((item) => renderTopItem(item))}</div>
            </div>
          ))}
        </nav>

        {/* Announcements, portals and quick create */}
        <div className="shrink-0 space-y-2.5 border-t border-slate-100 bg-white/90 p-3 backdrop-blur">
          <div className={sidebarOpen ? 'space-y-1' : 'flex flex-col items-center gap-1.5'}>
            <button
              type="button"
              onClick={() => setShowAnnouncementsModal(true)}
              title="Announcements"
              className={`group relative flex items-center gap-2.5 rounded-xl text-[12px] font-semibold text-slate-600 transition hover:bg-amber-50 hover:text-amber-800 ${sidebarOpen ? 'w-full px-2 py-1.5' : 'h-9 w-9 justify-center'}`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-500 ring-1 ring-amber-100 transition group-hover:bg-white">
                <Megaphone size={14} />
              </span>
              {sidebarOpen && <span className="truncate">Announcements</span>}
              {sidebarOpen && <span className="ml-auto rounded-full bg-[#E71414] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">New</span>}
            </button>
            <button
              type="button"
              onClick={() => setShowPortalsModal(true)}
              title="My Portals"
              className={`group flex items-center gap-2.5 rounded-xl text-[12px] font-semibold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-800 ${sidebarOpen ? 'w-full px-2 py-1.5' : 'h-9 w-9 justify-center'}`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100 transition group-hover:bg-white">
                <Layers size={14} />
              </span>
              {sidebarOpen && <span className="truncate">My Portals</span>}
            </button>
          </div>
          <Link
            to="/documents/create"
            title="Create Document"
            className={`group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f02b2b] to-[#c20f0f] font-bold text-white shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/40 ${sidebarOpen ? 'w-full px-3 py-2.5 text-sm' : 'mx-auto h-10 w-10'}`}
          >
            <PlusCircle size={18} className="transition-transform duration-300 group-hover:rotate-90" />
            {sidebarOpen && <span>Create Document</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Navigation Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-xs shrink-0">
          {/* Mobile menu button + Search bar */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-2 p-2 rounded-md hover:bg-slate-100 text-slate-600 shrink-0"
            title="Open menu"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="relative w-36 sm:w-80 mr-auto">
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
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />

            <div className="flex items-center gap-2 sm:gap-3 border-l pl-2 sm:pl-4 border-slate-200">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {(currentUser.name || 'Vimal Chavda')[0]}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-slate-800">{currentUser.name || 'Vimal Chavda'}</p>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                    currentUser.role === 'leader' ? 'bg-blue-100 text-blue-700' : (currentUser.role === 'team_member' ? 'bg-slate-100 text-slate-700' : 'bg-purple-100 text-purple-700')
                  }`}>
                    {currentUser.role || 'Manager'}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px]">{currentUser.email || 'vimal@bexcodeservices.com'}</p>
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
