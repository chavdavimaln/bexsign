import React from 'react';
import { FileText, PenTool, MailWarning, Users, ShieldAlert, FileBox, BarChart3, Code, Megaphone, Bell } from 'lucide-react';

// Icon and colour of each notification category (matches server/utils/platformEvents.js)
export const NOTIFICATION_CATEGORY_META = {
  document: { label: 'Documents', icon: FileText, tone: 'bg-sky-100 text-sky-700' },
  signing: { label: 'Signing requests', icon: PenTool, tone: 'bg-emerald-100 text-[#007355]' },
  email: { label: 'Email delivery', icon: MailWarning, tone: 'bg-orange-100 text-orange-700' },
  user: { label: 'Users & access', icon: Users, tone: 'bg-violet-100 text-violet-700' },
  security: { label: 'Security alerts', icon: ShieldAlert, tone: 'bg-rose-100 text-rose-700' },
  template: { label: 'Templates', icon: FileBox, tone: 'bg-teal-100 text-teal-700' },
  report: { label: 'Reports', icon: BarChart3, tone: 'bg-indigo-100 text-indigo-700' },
  api: { label: 'Developer API', icon: Code, tone: 'bg-slate-200 text-slate-700' },
  system: { label: 'Announcements', icon: Megaphone, tone: 'bg-amber-100 text-amber-700' }
};

const SEVERITY_RING = {
  error: 'ring-2 ring-rose-300',
  warning: 'ring-2 ring-amber-300',
  success: '',
  info: ''
};

export function NotificationIcon({ category, severity, size = 16, className = 'w-9 h-9' }) {
  const meta = NOTIFICATION_CATEGORY_META[category] || { icon: Bell, tone: 'bg-slate-100 text-slate-600' };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center justify-center rounded-xl shrink-0 ${meta.tone} ${SEVERITY_RING[severity] || ''} ${className}`}>
      <Icon size={size} />
    </span>
  );
}
