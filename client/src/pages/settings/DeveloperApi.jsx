import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound, Webhook, Activity, BookOpen, Code2, Settings2, TriangleAlert, FlaskConical, FileBox } from 'lucide-react';
import { PageHeader, Tabs, ErrorBanner, useToast } from '../../components/ui/kit';
import { apiFetch } from '../../utils/api';
import { usePermissions } from '../../utils/permissions';
import ApiKeysPanel from '../../components/developer/ApiKeysPanel';
import WebhooksPanel from '../../components/developer/WebhooksPanel';
import ApiLogsPanel from '../../components/developer/ApiLogsPanel';
import ApiDocsPanel from '../../components/developer/ApiDocsPanel';
import ApiTokensPanel from '../../components/developer/ApiTokensPanel';
import TemplateDetailsPanel from '../../components/developer/TemplateDetailsPanel';

/**
 * Developer API: API keys, webhooks, request logs and the API documentation. Each tab needs its own permission
 * (api.keys, api.webhooks, api.logs); the documentation is open to everyone. The active tab is kept in ?tab=.
 */

const TABS = [
  { id: 'keys', label: 'API keys', icon: KeyRound, permission: 'api.keys' },
  { id: 'tokens', label: 'API tokens', icon: FlaskConical, permission: 'api.keys' },
  { id: 'templates', label: 'Template details', icon: FileBox, permission: 'api.keys' },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook, permission: 'api.webhooks' },
  { id: 'logs', label: 'Request logs', icon: Activity, permission: 'api.logs' },
  { id: 'docs', label: 'Documentation', icon: BookOpen }
];

export default function DeveloperApi() {
  const { can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [toast, showToast] = useToast();
  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState('');

  const loadMeta = useCallback(async () => {
    setMetaError('');
    try {
      setMeta(await apiFetch('/developer/meta'));
    } catch (err) {
      setMetaError(err.message);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const visible = TABS.filter((t) => !t.permission || can(t.permission));
  const active = visible.find((t) => t.id === params.get('tab'))?.id || visible[0].id;
  const selectTab = (id) => setParams(id === visible[0].id ? {} : { tab: id }, { replace: true });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Developer API"
        icon={Code2}
        description="Connect BexSign to your own systems: API keys for the REST API, webhooks for real-time events, request logs and reference docs."
        actions={can('settings.developer') && (
          <Link to="/settings/developer" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700">
            <Settings2 size={14} /> Developer settings
          </Link>
        )}
      />

      {metaError && <ErrorBanner message={metaError} onRetry={loadMeta} />}
      {meta && !meta.apiEnabled && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <TriangleAlert size={15} className="shrink-0 mt-0.5" />
          <p className="font-semibold">
            The API is turned off: requests get HTTP 503 and webhook deliveries are paused.
            {can('settings.developer') ? <> Turn it on in <Link to="/settings/developer" className="underline">Developer settings</Link>.</> : ' Ask a manager to turn it on.'}
          </p>
        </div>
      )}
      {meta && meta.apiEnabled && !meta.sandboxMode && active === 'keys' && (
        <p className="flex items-center gap-2 text-[11px] text-slate-500"><FlaskConical size={13} /> Sandbox mode is off, so sandbox (bxs_test_) keys are rejected.</p>
      )}

      <Tabs tabs={visible} active={active} onChange={selectTab} />

      <div role="tabpanel" aria-label={visible.find((t) => t.id === active)?.label}>
        {active === 'keys' && <ApiKeysPanel meta={meta} showToast={showToast} />}
        {active === 'webhooks' && <WebhooksPanel meta={meta} showToast={showToast} />}
        {active === 'logs' && <ApiLogsPanel />}
        {active === 'tokens' && <ApiTokensPanel meta={meta} showToast={showToast} />}
        {active === 'templates' && <TemplateDetailsPanel />}
        {active === 'docs' && <ApiDocsPanel meta={meta} />}
      </div>
      {toast}
    </div>
  );
}
