import React from 'react';
import { Webhook, Fingerprint, Cloud, Zap, MessageSquare, Building2, KeyRound } from 'lucide-react';
import { Badge } from '../ui/kit';

/**
 * Pieces shared by the Integrations list and the Configure page: the app tile, the status badge and the
 * category icons. Apps are shown with a colored tile and their initials (no third-party logos).
 */

const INITIALS = {
  'bexcode-crm': 'BX',
  'google-workspace': 'G',
  'microsoft-365': 'M',
  'stripe-identity': 'S',
  dropbox: 'D',
  zapier: 'Z',
  slack: 'SL'
};

export const CATEGORY_ICONS = {
  crm: Building2,
  identity: KeyRound,
  verification: Fingerprint,
  storage: Cloud,
  automation: Zap,
  messaging: MessageSquare,
  custom: Webhook
};

export function AppTile({ provider, size = 'md' }) {
  const dims = size === 'lg' ? 'w-14 h-14 text-lg rounded-2xl' : size === 'sm' ? 'w-8 h-8 text-[11px] rounded-lg' : 'w-11 h-11 text-sm rounded-xl';
  const initials = INITIALS[provider.key];
  const Icon = CATEGORY_ICONS[provider.category] || Webhook;
  return (
    <span
      className={`${dims} shrink-0 flex items-center justify-center font-black text-white shadow-sm ring-1 ring-black/5`}
      style={{ background: `linear-gradient(135deg, ${provider.color || '#007355'}, ${provider.color || '#007355'}cc)` }}
      aria-hidden="true"
    >
      {initials || <Icon size={size === 'lg' ? 24 : size === 'sm' ? 15 : 19} />}
    </span>
  );
}

/** connected | disabled | not configured | needs attention */
export function connectionState(connection) {
  if (!connection) return { key: 'available', label: 'Not configured', tone: 'slate' };
  if (connection.status === 'disabled') return { key: 'off', label: 'Turned off', tone: 'amber' };
  if (connection.failureCount > 0 || connection.lastTestOk === false) return { key: 'attention', label: 'Needs attention', tone: 'rose' };
  return { key: 'connected', label: 'Connected', tone: 'emerald' };
}

export function StatusBadge({ connection }) {
  const state = connectionState(connection);
  return <Badge tone={state.tone} dot>{state.label}</Badge>;
}

export const ACTIVITY_LABELS = {
  connected: 'Connected',
  updated: 'Settings saved',
  test: 'Connection test',
  event: 'Event delivered',
  upload: 'Files uploaded',
  enabled: 'Turned on',
  disabled: 'Turned off'
};
