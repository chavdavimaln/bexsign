/**
 * API tokens (client/src/components/developer/ApiTokensPanel.jsx).
 *
 * Two ways to get a token, kept apart on purpose:
 *   Development  a token that expires within the hour, for trying calls out. Never for a deployed system.
 *   Deployment   a long-lived token for an integration that runs on its own, with the scopes you choose.
 *
 * A token is shown once, right after it is created; afterwards only its prefix is kept.
 */
import React, { useState } from 'react';
import { FlaskConical, Rocket, Copy, Check, TriangleAlert, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { Card, Button, Badge, Field, inputClass, ErrorBanner } from '../ui/kit';

function TokenResult({ token, note, onCopy }) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;
  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Copy it now - it is not shown again</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 min-w-0 break-all text-[11px] font-mono bg-white border border-emerald-200 rounded-lg px-2.5 py-2 text-slate-800">{token}</code>
        <Button
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(token);
            setCopied(true);
            onCopy?.();
            setTimeout(() => setCopied(false), 2000);
          }}
          icon={copied ? Check : Copy}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      {note && <p className="mt-2 text-[11px] text-emerald-800">{note}</p>}
    </div>
  );
}

export default function ApiTokensPanel({ meta, showToast }) {
  const scopes = meta?.scopes || [];

  // Development token
  const [devMinutes, setDevMinutes] = useState(60);
  const [devToken, setDevToken] = useState('');
  const [devBusy, setDevBusy] = useState(false);
  const [devError, setDevError] = useState('');

  // Deployment token
  const [name, setName] = useState('Deployment token');
  const [expiresInDays, setExpiresInDays] = useState('365');
  const [picked, setPicked] = useState(scopes.map((s) => s.key));
  const [deployToken, setDeployToken] = useState('');
  const [deployBusy, setDeployBusy] = useState(false);
  const [deployError, setDeployError] = useState('');

  const toggleScope = (key) => {
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const generateDev = async () => {
    setDevBusy(true);
    setDevError('');
    setDevToken('');
    try {
      const data = await apiFetch('/developer/tokens/temporary', { method: 'POST', body: { minutes: Number(devMinutes) } });
      setDevToken(data.token);
      showToast?.(data.message || 'Development token generated.');
    } catch (err) {
      setDevError(err.message);
    } finally {
      setDevBusy(false);
    }
  };

  const generateDeployment = async () => {
    if (picked.length === 0) {
      setDeployError('Choose at least one thing the token may do.');
      return;
    }
    setDeployBusy(true);
    setDeployError('');
    setDeployToken('');
    try {
      const data = await apiFetch('/developer/tokens/deployment', {
        method: 'POST',
        body: { name, scopes: picked, expiresInDays: expiresInDays === '' ? null : Number(expiresInDays) }
      });
      setDeployToken(data.token);
      showToast?.(data.message || 'Deployment token created.');
    } catch (err) {
      setDeployError(err.message);
    } finally {
      setDeployBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card
        title={<span className="flex items-center gap-2"><FlaskConical size={16} className="text-[#007355]" /> API token - development</span>}
        description="A temporary token for trying the API out from a terminal or a quick-start script. It expires on its own, so a forgotten token cannot be used later."
      >
        <div className="grid grid-cols-1 sm:grid-cols-[180px_auto] gap-3 items-end">
          <Field label="Valid for" hint="15 minutes to 4 hours.">
            <select value={devMinutes} onChange={(e) => setDevMinutes(e.target.value)} className={inputClass}>
              <option value={15}>15 minutes</option>
              <option value={60}>1 hour</option>
              <option value={240}>4 hours</option>
            </select>
          </Field>
          <div className="pb-1">
            <Button onClick={generateDev} busy={devBusy} disabled={devBusy}>{devBusy ? 'Generating...' : 'Generate'}</Button>
          </div>
        </div>
        {devError && <div className="mt-3"><ErrorBanner message={devError} /></div>}
        <TokenResult
          token={devToken}
          note={`Use it as a header: Authorization: Bearer <token>. It expires in ${devMinutes} minutes${meta?.sandboxMode ? ' and is a sandbox token' : ''}.`}
          onCopy={() => showToast?.('Token copied.')}
        />
        <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <TriangleAlert size={13} className="shrink-0 mt-0.5" />
          These tokens are for testing only. Do not put one in a deployed system - use a deployment token below.
        </p>
      </Card>

      <Card
        title={<span className="flex items-center gap-2"><Rocket size={16} className="text-[#007355]" /> API token - deployment</span>}
        description="A long-lived token for an integration that runs on its own. It acts with your permissions, so give it only what it needs and revoke it when the integration is retired."
      >
        <ol className="text-xs text-slate-600 space-y-1.5 mb-4 list-decimal pl-4">
          <li>Name the integration, so you recognise it in the API keys list later.</li>
          <li>Choose what it may do and how long it should live.</li>
          <li>Generate it, copy it once, and keep it in your server's environment - never in client-side code or a repository.</li>
        </ol>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Integration name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={100} />
          </Field>
          <Field label="Expires in (days)" hint="Leave empty for a token that never expires.">
            <input
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value.replace(/[^0-9]/g, ''))}
              className={inputClass}
              inputMode="numeric"
              placeholder="365"
            />
          </Field>
        </div>

        <fieldset className="mt-3">
          <legend className="block text-xs font-bold text-slate-700 mb-1.5">What this token may do</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scopes.map((scope) => (
              <label key={scope.key} className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition ${picked.includes(scope.key) ? 'border-[#007355] bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="checkbox" className="mt-0.5 accent-[#007355]" checked={picked.includes(scope.key)} onChange={() => toggleScope(scope.key)} />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800">{scope.label}</span>
                  <span className="block text-[11px] text-slate-500">{scope.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {deployError && <div className="mt-3"><ErrorBanner message={deployError} /></div>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={generateDeployment} busy={deployBusy} disabled={deployBusy}>{deployBusy ? 'Generating...' : 'Generate deployment token'}</Button>
          <Badge tone="slate"><ShieldCheck size={11} /> Shown once</Badge>
        </div>
        <TokenResult
          token={deployToken}
          note="Store it as an environment variable on your server. Revoke it from the API keys tab if it is ever exposed."
          onCopy={() => showToast?.('Token copied.')}
        />
      </Card>
    </div>
  );
}
