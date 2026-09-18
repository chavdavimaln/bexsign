import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { usePermissions } from '../utils/permissions';
import { LoadingBlock } from './ui/kit';

/** Shows the page only when the user has one of the permissions; otherwise explains how to get access. */
export default function RequirePermission({ any = [], children }) {
  const { can, loading } = usePermissions();
  if (loading) return <LoadingBlock label="Checking your access..." />;
  if (any.length === 0 || any.some((key) => can(key))) return children;
  return (
    <div className="max-w-lg mx-auto mt-10 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
      <span className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
        <Lock size={24} />
      </span>
      <h1 className="text-lg font-extrabold text-slate-900">You don't have access to this page</h1>
      <p className="text-sm text-slate-500 mt-1">
        Your role does not include this permission. Ask a manager to grant it in Settings &gt; Roles &amp; permissions.
      </p>
      <Link to="/dashboard" className="inline-block mt-5 px-4 py-2 rounded-xl bg-[#007355] text-white text-xs font-bold hover:bg-[#005c44]">
        Back to dashboard
      </Link>
    </div>
  );
}
