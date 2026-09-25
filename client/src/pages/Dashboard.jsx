import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Send, PenTool, FileBox, PlusCircle, ArrowRight, FileCheck, Clock, FileText, PencilLine, ShieldCheck, BookUser, Loader2
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { getLoggedInUser } from '../utils/currentUser';
import { usePermissions } from '../utils/permissions';

/**
 * Dashboard: greeting, the two main actions, document counts, quick actions and the latest documents.
 * Counts and recent documents come from the signed-in user's documents (/api/documents).
 */

const STATUS_STYLE = {
  completed: 'bg-emerald-100 text-emerald-800',
  'in progress': 'bg-amber-100 text-amber-800',
  'in process': 'bg-amber-100 text-amber-800',
  draft: 'bg-sky-100 text-sky-800',
  declined: 'bg-rose-100 text-rose-700',
  recalled: 'bg-orange-100 text-orange-700',
  expired: 'bg-slate-200 text-slate-700',
  scheduled: 'bg-indigo-100 text-indigo-700'
};

const statusKey = (doc) => String(doc.status || 'Draft').toLowerCase();
const openPath = (doc) => (statusKey(doc) === 'draft' ? `/documents/${doc.id}/edit` : `/documents/${doc.id}`);
const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function StatusPill({ doc }) {
  const key = statusKey(doc);
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize whitespace-nowrap ${STATUS_STYLE[key] || 'bg-slate-100 text-slate-700'}`}>
      {key === 'in process' ? 'in progress' : key}
    </span>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const user = useMemo(() => getLoggedInUser(), []);
  const { can } = usePermissions();
  const canCreate = can('documents.create');
  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiFetch('/documents')
      .then((data) => !cancelled && setDocuments(Array.isArray(data.documents) ? data.documents : []))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const list = documents || [];
    const by = (keys) => list.filter((d) => keys.includes(statusKey(d))).length;
    return { total: list.length, progress: by(['in progress', 'in process']), completed: by(['completed']), drafts: by(['draft']) };
  }, [documents]);

  const recent = useMemo(
    () => [...(documents || [])]
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 6),
    [documents]
  );

  const stats = [
    { label: 'Total', value: counts.total, icon: FileText, tone: 'text-slate-700 bg-slate-100', to: '/documents/all' },
    { label: 'In progress', value: counts.progress, icon: Clock, tone: 'text-amber-600 bg-amber-50', to: '/documents/sent/in-progress' },
    { label: 'Completed', value: counts.completed, icon: FileCheck, tone: 'text-emerald-600 bg-emerald-50', to: '/documents/sent/completed' },
    { label: 'Drafts', value: counts.drafts, icon: PencilLine, tone: 'text-sky-600 bg-sky-50', to: '/documents/sent/draft' }
  ];

  // Shortcuts only for what the user's role allows
  const quick = [
    canCreate && { to: '/documents/create', icon: Send, title: 'Send for Signature', text: 'Upload a PDF, place fields and request signatures.' },
    canCreate && { to: '/sign-yourself/new', icon: PenTool, title: 'Sign Yourself', text: 'Sign a document yourself and download the signed copy.' },
    can('templates.view') && { to: '/templates', icon: FileBox, title: 'Use Template', text: 'Start from a template with its roles and fields.' },
    { to: '/settings/contacts', icon: BookUser, title: 'Contacts', text: 'The people you send documents to.' }
  ].filter(Boolean);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-red-50/60 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#E71414]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-0.5 break-words">{greeting()}, {firstName}</h1>
            <p className="text-slate-500 text-sm mt-1">Here is what is happening with your documents.</p>
          </div>
          {canCreate && <Link to="/documents/create" className="btn-primary w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold text-sm shadow-sm shrink-0">
            <PlusCircle size={18} /> Create Document
          </Link>}
        </div>
      </section>

      {/* Main actions */}
      {canCreate && <div className="grid grid-cols-2 gap-3 sm:gap-5 max-w-2xl mx-auto w-full">
        {[
          { to: '/documents/create', icon: Send, label: 'Send for signatures' },
          { to: '/sign-yourself', icon: PenTool, label: 'Sign yourself' }
        ].map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="h-28 sm:h-36 bg-white border-2 border-slate-200 hover:border-[#007355] rounded-2xl flex flex-col items-center justify-center p-3 text-center shadow-xs hover:shadow-md transition group"
          >
            <span className="p-2.5 sm:p-3 text-[#007355] group-hover:scale-110 transition-transform"><a.icon size={28} /></span>
            <span className="font-bold text-slate-800 text-sm sm:text-base mt-0.5">{a.label}</span>
          </Link>
        ))}
      </div>}

      {/* Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 hover:shadow-md hover:-translate-y-0.5 transition">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">{s.label}</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {documents ? s.value : <Loader2 size={20} className="animate-spin text-slate-300" />}
              </p>
            </div>
            <span className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${s.tone}`}><s.icon size={20} /></span>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {quick.map((q) => (
            <Link key={q.title} to={q.to} className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl hover:border-[#E71414] hover:shadow-md transition group flex sm:block items-start gap-3">
              <span className="p-3 bg-red-50 text-[#E71414] rounded-xl w-fit shrink-0 block group-hover:bg-[#E71414] group-hover:text-white transition">
                <q.icon size={22} />
              </span>
              <span className="min-w-0 block">
                <span className="block font-bold text-slate-900 sm:mt-3 text-base">{q.title}</span>
                <span className="block text-xs text-slate-500 mt-1">{q.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent documents */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">Recent Documents</h2>
          <Link to="/documents/all" className="text-xs font-semibold text-[#E71414] hover:underline flex items-center gap-1 shrink-0">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {error && <p className="p-5 text-sm text-red-600">{error}</p>}
        {!documents && !error && (
          <p className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading documents...</p>
        )}
        {documents && recent.length === 0 && (
          <div className="p-10 text-center">
            <FileText size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-800 mt-2">No documents yet</p>
            <p className="text-xs text-slate-500 mt-1">Send your first document for signature to see it here.</p>
          </div>
        )}

        {recent.length > 0 && (
          <>
            {/* Tablet and desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-semibold uppercase">
                    <th className="p-4">Document</th>
                    <th className="p-4">Recipient</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 whitespace-nowrap">Updated</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recent.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-semibold text-slate-900">
                        <Link to={openPath(doc)} className="flex items-start gap-2 hover:text-[#007355]">
                          <FileCheck size={18} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="break-words leading-snug">{doc.document_name || `Document ${doc.id}`}</span>
                        </Link>
                      </td>
                      <td className="p-4 text-slate-600 text-xs break-all">{doc.signer_name || doc.recipient_email || '-'}</td>
                      <td className="p-4"><StatusPill doc={doc} /></td>
                      <td className="p-4 text-slate-500 text-xs whitespace-nowrap">{formatDate(doc.updated_at || doc.created_at)}</td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <Link to={openPath(doc)} className="text-[#E71414] font-semibold hover:underline text-xs">
                          {statusKey(doc) === 'draft' ? 'Continue' : 'View'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phones */}
            <ul className="md:hidden divide-y divide-slate-100">
              {recent.map((doc) => (
                <li key={doc.id}>
                  <Link to={openPath(doc)} className="flex items-start gap-3 p-4 active:bg-slate-50">
                    <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><FileCheck size={17} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900 break-words leading-snug">{doc.document_name || `Document ${doc.id}`}</span>
                      <span className="block text-[11px] text-slate-500 truncate">{doc.signer_name || doc.recipient_email || '-'}</span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <StatusPill doc={doc} />
                        <span className="text-[11px] text-slate-400">{formatDate(doc.updated_at || doc.created_at)}</span>
                      </span>
                    </span>
                    <ArrowRight size={16} className="text-slate-300 shrink-0 mt-2" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pb-2">
        <ShieldCheck size={13} /> Signed documents are locked and can be checked any time with <Link to="/verify" className="underline hover:text-slate-600">Verify document</Link>.
      </p>
    </div>
  );
}
