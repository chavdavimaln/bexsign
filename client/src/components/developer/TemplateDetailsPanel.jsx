/**
 * Template details for the API (client/src/components/developer/TemplateDetailsPanel.jsx).
 *
 * Pick one of your templates and see exactly what a request has to pass: its id, the roles it expects, the fields
 * on it, the placeholders in its text, and a ready-made example request.
 */
import React, { useEffect, useState } from 'react';
import { FileBox, Copy, Check } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { Card, Button, Badge, Field, inputClass, EmptyState, ErrorBanner, LoadingBlock } from '../ui/kit';

function CopyBlock({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 rounded-xl p-3 overflow-x-auto">{value}</pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-semibold hover:bg-slate-700 cursor-pointer"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : label}
      </button>
    </div>
  );
}

export default function TemplateDetailsPanel() {
  const [templates, setTemplates] = useState(null);
  const [selected, setSelected] = useState('');
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/developer/templates')
      .then((data) => setTemplates(data.templates || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetails(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch(`/developer/templates/${selected}`)
      .then((data) => { if (!cancelled) setDetails(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected]);

  const template = details?.template;

  return (
    <Card
      title={<span className="flex items-center gap-2"><FileBox size={16} className="text-[#007355]" /> Template details for the API</span>}
      description="Use a template from your account to send documents through the API. Choose one to see the details a request has to pass."
    >
      {error && <ErrorBanner message={error} />}

      <div className="max-w-md">
        <Field label="Choose template">
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className={inputClass} disabled={!templates}>
            <option value="">{templates ? 'Choose template' : 'Loading templates...'}</option>
            {(templates || []).map((t) => (
              <option key={t.id} value={t.id}>{t.title}{t.is_shared ? ' (shared)' : ''}</option>
            ))}
          </select>
        </Field>
      </div>

      {templates && templates.length === 0 && (
        <div className="mt-4">
          <EmptyState
            icon={FileBox}
            title="No saved templates yet"
            message="Save a template from the Templates page, then come back to see how to send it through the API."
          />
        </div>
      )}

      {loading && <div className="mt-4"><LoadingBlock label="Loading template details" /></div>}

      {template && !loading && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="emerald">Template id {template.id}</Badge>
            {template.category && <Badge tone="slate">{template.category}</Badge>}
            {template.shared && <Badge tone="violet">Shared</Badge>}
          </div>
          {template.description && <p className="text-xs text-slate-600">{template.description}</p>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-2">Recipient roles</h4>
              {template.roles.length === 0
                ? <p className="text-xs text-slate-400">No roles saved on this template; pass your own recipients.</p>
                : (
                  <ul className="space-y-1">
                    {template.roles.map((role) => (
                      <li key={role.name} className="text-xs text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 flex justify-between gap-2">
                        <span className="font-semibold">{role.name}</span>
                        <span className="text-slate-400">order {role.order}</span>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-2">Fields</h4>
              {template.fields.length === 0
                ? <p className="text-xs text-slate-400">No fields saved on this template.</p>
                : (
                  <ul className="space-y-1">
                    {template.fields.map((field, i) => (
                      <li key={`${field.role}-${field.type}-${i}`} className="text-xs text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 flex justify-between gap-2">
                        <span className="font-semibold">{field.type}</span>
                        <span className="text-slate-400">{field.role}{field.required ? ' · required' : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>

          {template.placeholders.length > 0 && (
            <div>
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-2">Placeholders in the text</h4>
              <div className="flex flex-wrap gap-1.5">
                {template.placeholders.map((p) => (
                  <code key={p} className="text-[11px] font-mono bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700">{p}</code>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-2">Example request</h4>
            <CopyBlock
              value={`${details.sampleRequest.method} ${details.sampleRequest.path}\n${Object.entries(details.sampleRequest.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${JSON.stringify(details.sampleRequest.body, null, 2)}`}
            />
            <p className="mt-2 text-[11px] text-slate-500">
              Generate a token in the <strong>API tokens</strong> tab and put it in the Authorization header.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
