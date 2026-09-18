import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Settings as SettingsIcon, ArrowRight, Loader2, BellOff } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { formatRelative } from '../ui/kit';
import { NotificationIcon } from './notificationUi';

const POLL_MS = 30000;

/** Header bell: unread count and the latest notifications, refreshed every 30 seconds and on navigation. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [data, setData] = useState({ unread: 0, latest: [], status: 'idle', error: '' });
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const result = await apiFetch('/notifications/summary');
      setData({ unread: result.unread, latest: result.latest, status: 'ready', error: '' });
    } catch (err) {
      setData((prev) => ({ ...prev, status: 'error', error: err.message }));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    // Other screens (e.g. the Notifications page) ask the bell to refresh
    window.addEventListener('bexsign-notifications-changed', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('bexsign-notifications-changed', onFocus);
    };
  }, [load]);

  useEffect(() => {
    load();
    setOpen(false);
  }, [pathname, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markRead = async (item) => {
    if (item.isRead) return;
    setData((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1),
      latest: prev.latest.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    }));
    try {
      await apiFetch(`/notifications/${item.id}/read`, { method: 'PATCH', body: { read: true } });
    } catch (e) {}
  };

  const openItem = async (item) => {
    await markRead(item);
    setOpen(false);
    navigate(item.link || '/notifications');
  };

  const markAll = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST', body: {} });
      load();
    } catch (e) {}
  };

  const items = tab === 'unread' ? data.latest.filter((n) => !n.isRead) : data.latest;
  const badge = data.unread > 99 ? '99+' : data.unread;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) load();
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={data.unread ? `Notifications, ${data.unread} unread` : 'Notifications'}
        className={`relative p-2 rounded-full transition ${open ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <Bell size={20} />
        {data.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#E71414] text-white text-[10px] rounded-full flex items-center justify-center font-bold ring-2 ring-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-[400px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold text-slate-900">Notifications</p>
              <p className="text-[11px] text-slate-500">{data.unread ? `${data.unread} unread` : 'You are all caught up'}</p>
            </div>
            <div className="flex items-center gap-1">
              {data.unread > 0 && (
                <button type="button" onClick={markAll} className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#007355] hover:bg-emerald-50 flex items-center gap-1">
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/settings/notifications');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                title="Notification settings"
                aria-label="Notification settings"
              >
                <SettingsIcon size={15} />
              </button>
            </div>
          </div>
          <div className="px-4 flex gap-4 border-b border-slate-100 text-xs font-bold">
            {[['all', 'All'], ['unread', `Unread${data.unread ? ` (${data.unread})` : ''}`]].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`pb-2 border-b-2 -mb-px ${tab === id ? 'border-[#007355] text-[#007355]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] sm:max-h-[420px] overflow-y-auto">
            {data.status === 'idle' ? (
              <p className="py-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</p>
            ) : data.status === 'error' && data.latest.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-red-600">{data.error}</p>
            ) : items.length === 0 ? (
              <div className="py-10 text-center">
                <BellOff size={26} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">{tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition hover:bg-slate-50 ${n.isRead ? '' : 'bg-emerald-50/40'}`}
                    >
                      <NotificationIcon category={n.category} severity={n.severity} size={15} className="w-8 h-8" />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs leading-snug ${n.isRead ? 'font-semibold text-slate-700' : 'font-extrabold text-slate-900'}`}>{n.title}</span>
                        {n.message && <span className="block text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</span>}
                        <span className="block text-[10px] text-slate-400 mt-1">{formatRelative(n.createdAt)}</span>
                      </span>
                      {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#007355] shrink-0" aria-label="Unread" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/notifications');
            }}
            className="w-full px-4 py-2.5 border-t border-slate-100 text-xs font-bold text-[#007355] hover:bg-emerald-50 flex items-center justify-center gap-1.5"
          >
            View all notifications <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
