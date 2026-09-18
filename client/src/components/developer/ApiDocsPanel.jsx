import React from 'react';
import { BookOpen, KeyRound, Gauge, TriangleAlert, Webhook, ShieldCheck, ListTree } from 'lucide-react';
import { Card, Badge, thClass, tdClass } from '../ui/kit';
import { API_ORIGIN } from '../../utils/api';
import { CodeBlock, CopyButton, SectionTitle } from '../settings/settingsUi';

/** Reference documentation for the public REST API (/api/v1) and webhooks, with copyable examples. */

const BASE_URL = `${API_ORIGIN}/api/v1`;
const KEY = 'bxs_live_your_api_key';
const json = (value) => JSON.stringify(value, null, 2);

const ENDPOINTS = [
  {
    id: 'me',
    method: 'GET',
    path: '/me',
    scope: null,
    summary: 'The API key making the request, its owner and the current rate-limit window.',
    params: [],
    response: {
      success: true,
      data: {
        key: { id: 12, name: 'CRM integration', prefix: 'bxs_live_a993', environment: 'live', scopes: ['documents:read', 'reports:read'], created_at: '2026-09-18T18:25:32.000Z', expires_at: null },
        owner: { id: 1, name: 'Jane Doe', email: 'jane@example.com', company: 'Example Pvt. Ltd.' },
        rate_limit: { limit: 60, remaining: 59, reset: 60 }
      }
    }
  },
  {
    id: 'documents',
    method: 'GET',
    path: '/documents',
    query: '?status=completed&page=1&page_size=25',
    scope: 'documents:read',
    summary: 'Documents owned by the key\'s user, newest first (trashed documents are excluded).',
    params: [
      ['status', 'draft, in_progress, completed, declined, recalled (optional)'],
      ['search', 'Part of the document name (optional)'],
      ['page', 'Page number, from 1 (default 1)'],
      ['page_size', 'Items per page, 1 to 100 (default 25)']
    ],
    response: {
      success: true,
      data: [{
        id: 60, name: 'Service agreement', status: 'completed', status_label: 'Completed', signing_order: 'sequential',
        recipients_count: 2, signed_count: 2, created_at: '2026-09-18T06:17:20.000Z', updated_at: '2026-09-18T08:03:39.000Z',
        sent_at: '2026-09-18T06:35:26.000Z', completed_at: '2026-09-18T08:03:33.000Z'
      }],
      pagination: { page: 1, page_size: 25, total: 5, total_pages: 1 }
    }
  },
  {
    id: 'document',
    method: 'GET',
    path: '/documents/:id',
    example: '/documents/60',
    scope: 'documents:read',
    summary: 'One document with its signing progress, recipients and files.',
    params: [['id', 'Document id (path)']],
    response: {
      success: true,
      data: {
        id: 60, name: 'Service agreement', status: 'in_progress', status_label: 'In Progress', signing_order: 'sequential', message: null,
        expiration_days: 15, created_at: '2026-09-18T06:17:20.000Z', updated_at: '2026-09-18T06:35:26.000Z', sent_at: '2026-09-18T06:35:26.000Z', completed_at: null,
        progress: { signers: 2, signed: 1 },
        recipients: [
          { id: 20, name: 'Asha Mehta', email: 'asha@example.com', role: 'signer', status: 'signed', signing_order: 1, sent_at: '2026-09-18T06:35:30.000Z', viewed_at: '2026-09-18T07:10:02.000Z', signed_at: '2026-09-18T07:12:44.000Z', declined_at: null, decline_reason: null },
          { id: 21, name: 'Rahul Shah', email: 'rahul@example.com', role: 'signer', status: 'sent', signing_order: 2, sent_at: '2026-09-18T07:12:50.000Z', viewed_at: null, signed_at: null, declined_at: null, decline_reason: null }
        ],
        files: [{ id: 88, name: 'Service agreement.pdf', type: 'pdf', size_kb: 214, signed: false }]
      }
    }
  },
  {
    id: 'templates',
    method: 'GET',
    path: '/templates',
    query: '?page=1&page_size=25',
    scope: 'templates:read',
    summary: 'Templates of the key\'s user plus templates shared with the organization.',
    params: [
      ['search', 'Part of the template title (optional)'],
      ['category', 'Category key (optional)'],
      ['page, page_size', 'Pagination, as for documents']
    ],
    response: {
      success: true,
      data: [{ id: 7, title: 'Non-disclosure agreement', description: 'Mutual NDA', category: 'legal', is_shared: true, owned: true, created_at: '2026-09-10T09:00:00.000Z', updated_at: '2026-09-12T11:30:00.000Z' }],
      pagination: { page: 1, page_size: 25, total: 1, total_pages: 1 }
    }
  },
  {
    id: 'reports',
    method: 'GET',
    path: '/reports/summary',
    query: '?days=30',
    scope: 'reports:read',
    summary: 'Document counts by status, completion rate and recipient figures for the key\'s user.',
    params: [['days', 'Period for the "sent" and "completed" counts, 1 to 365 (default 30)']],
    response: {
      success: true,
      data: {
        total_documents: 11,
        by_status: { draft: 4, in_progress: 2, completed: 5, declined: 0, recalled: 0 },
        completion_rate: 71.4,
        recipients: { total: 18, signed: 13, declined: 0, waiting: 5 },
        period: { days: 30, sent: 7, completed: 6 },
        generated_at: '2026-09-18T18:25:50.232Z'
      }
    }
  }
];

const ERRORS = [
  ['400', 'invalid_id', 'A parameter is not valid.'],
  ['401', 'missing_api_key', 'No key in Authorization or X-API-Key.'],
  ['401', 'invalid_api_key', 'The key does not exist (or was deleted).'],
  ['401', 'revoked_api_key / expired_api_key', 'The key was revoked or has expired.'],
  ['403', 'insufficient_scope', 'The key lacks the scope the endpoint needs.'],
  ['403', 'ip_not_allowed / origin_not_allowed', 'Blocked by the IP allowlist or the CORS origin list.'],
  ['403', 'sandbox_disabled / account_inactive', 'Sandbox keys are off, or the key owner is deactivated.'],
  ['404', 'not_found', 'Unknown endpoint, or a document the key cannot see.'],
  ['429', 'rate_limited', 'Too many requests this minute. Wait for Retry-After seconds.'],
  ['503', 'api_disabled', 'The API is turned off in Developer settings.'],
  ['500', 'server_error', 'Unexpected error. Retry later.']
];

const WEBHOOK_PAYLOAD = {
  id: 'evt_3f1c9a2b7d4e5f60718293a4',
  event: 'document.signed',
  created_at: '2026-09-18T07:12:45.120Z',
  data: {
    document: {
      id: 60, name: 'Service agreement', status: 'In Progress', signing_order: 'sequential',
      created_at: '2026-09-18T06:17:20.000Z', sent_at: '2026-09-18T06:35:26.000Z', completed_at: null,
      owner: { id: 1, name: 'Jane Doe', email: 'jane@example.com' },
      recipients: [
        { id: 20, name: 'Asha Mehta', email: 'asha@example.com', role: 'signer', status: 'signed', signing_order: 1, sent_at: '2026-09-18T06:35:30.000Z', viewed_at: '2026-09-18T07:10:02.000Z', signed_at: '2026-09-18T07:12:44.000Z', declined_at: null }
      ]
    },
    recipient: { id: 20, name: 'Asha Mehta', email: 'asha@example.com', role: 'signer', status: 'signed', signing_order: 1, sent_at: '2026-09-18T06:35:30.000Z', viewed_at: '2026-09-18T07:10:02.000Z', signed_at: '2026-09-18T07:12:44.000Z', declined_at: null }
  }
};

const VERIFY_SNIPPET = `const crypto = require('crypto');
const express = require('express');

const app = express();
const SECRET = process.env.BEXSIGN_WEBHOOK_SECRET; // whsec_... from Developer settings

// Keep the raw body: the signature is computed over the exact bytes BexSign sent
app.post('/webhooks/bexsign', express.raw({ type: 'application/json' }), (req, res) => {
  const received = req.get('X-BexSign-Signature') || '';
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(req.body).digest('hex');
  const valid = received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) return res.status(401).send('Invalid signature');

  const event = JSON.parse(req.body.toString('utf8'));
  // Deliveries can be retried: use X-BexSign-Delivery to skip ones you already handled
  console.log(event.event, req.get('X-BexSign-Delivery'), event.data);
  res.sendStatus(200); // answer 2xx quickly; slow answers time out and are retried
});

app.listen(4000);`;

const curlFor = (e) => `curl "${BASE_URL}${e.example || e.path}${e.query || ''}" \\
  -H "Authorization: Bearer ${KEY}"`;

function Method({ method }) {
  return <Badge tone={method === 'GET' ? 'sky' : 'emerald'} className="!text-[11px] font-mono">{method}</Badge>;
}

export default function ApiDocsPanel({ meta }) {
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const retries = meta?.webhookRetryCount ?? 3;
  const timeout = meta?.webhookTimeoutSeconds ?? 10;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[200px_minmax(0,1fr)] gap-5 items-start">
      <nav aria-label="Documentation sections" className="xl:sticky xl:top-0 bg-white border border-slate-200 rounded-2xl p-3 min-w-0">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><ListTree size={13} /> On this page</p>
        <ul className="flex xl:flex-col flex-wrap gap-1">
          {[['doc-auth', 'Authentication'], ['doc-errors', 'Errors & limits'], ...ENDPOINTS.map((e) => [`doc-${e.id}`, `${e.method} ${e.path}`]), ['doc-webhooks', 'Webhooks']].map(([id, label]) => (
            <li key={id}>
              <button type="button" onClick={() => jump(id)} className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-[#007355] hover:bg-emerald-50 cursor-pointer text-left font-mono">{label}</button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-5 min-w-0">
        <section id="doc-auth" className="scroll-mt-4">
          <Card title={<SectionTitle icon={KeyRound}>Authentication</SectionTitle>} description="Every request needs an API key. Create keys on the API keys tab.">
            <div className="space-y-4 text-xs text-slate-600">
              <div>
                <p className="font-bold text-slate-700 mb-1">Base URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 break-all">{BASE_URL}</code>
                  <CopyButton text={BASE_URL} ariaLabel="Copy base URL" />
                </div>
              </div>
              <p>
                Send the key as a bearer token, or in the <code className="font-mono text-slate-800">X-API-Key</code> header. Keys starting with <code className="font-mono text-slate-800">bxs_test_</code> are sandbox keys and work only while sandbox mode is on.
                Responses are JSON: <code className="font-mono text-slate-800">{'{ "success": true, "data": ... }'}</code>, lists add <code className="font-mono text-slate-800">pagination</code>.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <CodeBlock title="Authorization header" code={`Authorization: Bearer ${KEY}`} />
                <CodeBlock title="Or" code={`X-API-Key: ${KEY}`} />
              </div>
              <p className="flex items-start gap-1.5 text-amber-700 font-semibold"><TriangleAlert size={14} className="shrink-0 mt-0.5" /> Keep keys on your server. Never put them in browser code or a public repository.</p>
            </div>
          </Card>
        </section>

        <section id="doc-errors" className="scroll-mt-4">
          <Card title={<SectionTitle icon={Gauge}>Errors & rate limits</SectionTitle>} description="Errors share one format so you can handle them by code.">
            <div className="space-y-4">
              <CodeBlock title="Error response" code={json({ success: false, error: 'This API key does not have the "templates:read" scope.', code: 'insufficient_scope', required_scope: 'templates:read' })} />
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead><tr><th className={thClass}>HTTP</th><th className={thClass}>code</th><th className={`${thClass} hidden sm:table-cell`}>Meaning</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {ERRORS.map(([status, code, meaning]) => (
                      <tr key={code}>
                        <td className={`${tdClass} font-mono font-bold`}>{status}</td>
                        <td className={tdClass}><code className="font-mono text-[11px] text-slate-800 break-words">{code}</code><span className="block sm:hidden text-[11px] text-slate-500 mt-0.5">{meaning}</span></td>
                        <td className={`${tdClass} hidden sm:table-cell`}>{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-600">
                Each key may make <strong>{meta?.rateLimitPerMinute ?? 60} requests per minute</strong>. Every response carries <code className="font-mono">X-RateLimit-Limit</code>, <code className="font-mono">X-RateLimit-Remaining</code> and <code className="font-mono">X-RateLimit-Reset</code> (seconds);
                a 429 response adds <code className="font-mono">Retry-After</code>.
              </p>
            </div>
          </Card>
        </section>

        {ENDPOINTS.map((e) => (
          <section key={e.id} id={`doc-${e.id}`} className="scroll-mt-4">
            <Card
              title={(
                <span className="flex flex-wrap items-center gap-2">
                  <Method method={e.method} />
                  <code className="font-mono text-sm text-slate-900 break-all">{e.path}</code>
                </span>
              )}
              description={e.summary}
              actions={e.scope ? <Badge tone="violet" className="font-mono normal-case">scope: {e.scope}</Badge> : <Badge tone="slate">any scope</Badge>}
            >
              <div className="space-y-3">
                {e.params.length > 0 && (
                  <dl className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
                    {e.params.map(([name, desc]) => (
                      <React.Fragment key={name}>
                        <dt className="font-mono font-bold text-slate-800">{name}</dt>
                        <dd className="text-slate-600 mb-1 sm:mb-0">{desc}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                )}
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                  <CodeBlock title="Request (curl)" code={curlFor(e)} />
                  <CodeBlock title="Response 200" code={json(e.response)} />
                </div>
              </div>
            </Card>
          </section>
        ))}

        <section id="doc-webhooks" className="scroll-mt-4">
          <Card title={<SectionTitle icon={Webhook}>Webhooks</SectionTitle>} description="Add endpoints on the Webhooks tab. BexSign POSTs JSON to them when events happen.">
            <div className="space-y-4 text-xs text-slate-600">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead><tr><th className={thClass}>Event</th><th className={thClass}>When</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {(meta?.events || []).map((ev) => (
                      <tr key={ev.key}>
                        <td className={`${tdClass} font-mono font-bold whitespace-nowrap`}>{ev.key}</td>
                        <td className={tdClass}>{ev.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <p className="font-bold text-slate-700 mb-1">Headers</p>
                <ul className="space-y-1">
                  <li><code className="font-mono text-slate-800">X-BexSign-Event</code>: the event name, e.g. <code className="font-mono">document.signed</code></li>
                  <li><code className="font-mono text-slate-800">X-BexSign-Delivery</code>: unique id of the delivery (the same on every retry)</li>
                  <li><code className="font-mono text-slate-800">X-BexSign-Signature</code>: <code className="font-mono">sha256=</code> + hex HMAC-SHA256 of the raw body, keyed with the webhook's own secret or the organization signing secret</li>
                </ul>
              </div>
              <p>
                Answer with any 2xx status within <strong>{timeout} s</strong>. Network errors, timeouts, 408, 429 and 5xx answers are retried up to <strong>{retries} time{retries === 1 ? '' : 's'}</strong> (after 1 s, 2 s, 4 s…).
                After 10 failed deliveries in a row the webhook is turned off and its owner is notified. Document events go to webhooks of the document owner and to organization-wide webhooks of administrators.
              </p>
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                <CodeBlock title="Payload example" code={json(WEBHOOK_PAYLOAD)} />
                <CodeBlock title="Verify the signature (Node.js)" code={VERIFY_SNIPPET} />
              </div>
              <p className="flex items-start gap-1.5"><ShieldCheck size={14} className="shrink-0 mt-0.5 text-[#007355]" /> Always verify the signature before trusting a payload, and compare with a constant-time function.</p>
            </div>
          </Card>
        </section>

        <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><BookOpen size={13} /> Documentation for BexSign API v1.</p>
      </div>
    </div>
  );
}
