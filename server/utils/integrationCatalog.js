/**
 * Integrations catalog (server/utils/integrationCatalog.js): the apps BexSign connects to, what each needs to be
 * configured and what it does in the signing workflow.
 *
 * Every provider has
 *   fields   inputs of the Configure page. section 'connection' = credentials, 'signing' = how it behaves with
 *            signature requests. secret: true values are stored encrypted and never sent back to the browser.
 *   events   signing events it can receive (delivery: 'webhook' | 'slack' | 'dropbox'); none for sign-in providers
 *   steps    the setup guide shown next to the form
 *   test     what "Test connection" checks
 */

const SIGNING_EVENTS = [
  { key: 'document.sent', label: 'Document sent', description: 'A signature request was emailed to its recipients' },
  { key: 'document.viewed', label: 'Document viewed', description: 'A recipient opened the signing link' },
  { key: 'document.signed', label: 'Recipient signed', description: 'A recipient signed or approved' },
  { key: 'document.completed', label: 'Document completed', description: 'Everyone signed; the signed PDF and certificate are ready' },
  { key: 'document.declined', label: 'Document declined', description: 'A recipient declined to sign' },
  { key: 'document.recalled', label: 'Document recalled', description: 'The sender recalled the request' },
  { key: 'template.created', label: 'Template created', description: 'A new template was saved' }
];
const EVENT_KEYS = SIGNING_EVENTS.map((e) => e.key);

const CATEGORIES = {
  crm: 'CRM',
  identity: 'Sign-in & identity',
  verification: 'Identity verification',
  storage: 'Cloud storage',
  automation: 'Automation',
  messaging: 'Team messaging',
  custom: 'Custom'
};

const PROVIDERS = [
  {
    key: 'bexcode-crm',
    name: 'Bexcode CRM',
    category: 'crm',
    color: '#E71414',
    tagline: 'Close deals quickly by sending documents directly from Bexcode CRM.',
    description: 'Keep deals and contacts in Bexcode CRM in step with BexSign: every signing event is posted to your CRM with the document, its recipients and their status, so the deal record shows where the contract is.',
    delivery: 'webhook',
    defaultEvents: ['document.sent', 'document.viewed', 'document.signed', 'document.completed', 'document.declined'],
    fields: [
      { key: 'base_url', label: 'CRM URL', type: 'url', section: 'connection', required: true, placeholder: 'https://crm.bexcodeservices.com', help: 'The address of your Bexcode CRM workspace.' },
      { key: 'workspace_id', label: 'Workspace ID', type: 'text', section: 'connection', placeholder: 'e.g. BEX-4821', help: 'Shown in Bexcode CRM under Settings > Company.' },
      { key: 'api_key', label: 'CRM API key', type: 'password', section: 'connection', secret: true, required: true, placeholder: 'crm_live_…', help: 'Bexcode CRM > Settings > API > Generate key. Sent as "Authorization: Bearer <key>".' },
      { key: 'events_url', label: 'Events endpoint', type: 'url', section: 'connection', placeholder: 'https://crm.bexcodeservices.com/api/bexsign/events', help: 'Where signing events are posted. Leave empty to use <CRM URL>/api/bexsign/events.' },
      { key: 'attach_signed_pdf', label: 'Attach the signed PDF to the CRM record', type: 'toggle', section: 'signing', default: true, help: 'The completed event carries a download link for the signed documents and certificate.' },
      { key: 'log_activity', label: 'Log each signing step as a CRM activity', type: 'toggle', section: 'signing', default: true },
      { key: 'deal_stage', label: 'Move the deal to this stage when completed', type: 'select', section: 'signing', default: 'Contract signed', options: ['Do not change', 'Contract signed', 'Closed won', 'Onboarding'], help: 'Sent to the CRM with the completed event as crm.deal_stage.' }
    ],
    steps: [
      'In Bexcode CRM open Settings > API and create an API key with the "Documents" scope.',
      'Paste your CRM URL and the API key here. Add the Workspace ID if your CRM account has more than one workspace.',
      'Pick the signing events the CRM should receive and how the deal should change when a document is completed.',
      'Click "Test connection": BexSign sends a ping event to the events endpoint. Save to start sending events.'
    ],
    test: 'Posts a "ping" event to the events endpoint with your API key.'
  },
  {
    key: 'google-workspace',
    name: 'Google Workspace',
    category: 'identity',
    color: '#4285F4',
    tagline: 'Import users, provide single sign-on access, and sign documents effortlessly.',
    description: 'Let your team sign in to BexSign with their Google Workspace accounts ("Continue with Google" on the sign-in page), optionally only from your company domain.',
    delivery: null,
    defaultEvents: [],
    fields: [
      { key: 'client_id', label: 'OAuth client ID', type: 'text', section: 'connection', required: true, placeholder: '1234567890-abc.apps.googleusercontent.com', help: 'Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application).' },
      { key: 'client_secret', label: 'OAuth client secret', type: 'password', section: 'connection', secret: true, required: true, placeholder: 'GOCSPX-…' },
      { key: 'hosted_domain', label: 'Company domain', type: 'text', section: 'connection', placeholder: 'bexcodeservices.com', help: 'Your Google Workspace domain.' },
      { key: 'enable_sso', label: 'Show "Continue with Google" on the sign-in page', type: 'toggle', section: 'signing', default: true },
      { key: 'restrict_domain', label: 'Only allow accounts from the company domain', type: 'toggle', section: 'signing', default: false, help: 'Sign-ins from any other Google account are refused.' },
      { key: 'allow_signup', label: 'Create a BexSign account on first Google sign-in', type: 'toggle', section: 'signing', default: true }
    ],
    steps: [
      'In Google Cloud Console create an OAuth client ID of type "Web application".',
      'Add the redirect URI shown below to "Authorized redirect URIs".',
      'Paste the client ID and secret here, and your company domain if you want to limit sign-in to it.',
      'Click "Test connection", then Save. "Continue with Google" on the sign-in page now uses these credentials.'
    ],
    redirectPath: '/api/auth/oauth/google/callback',
    test: 'Checks the client ID format and that Google\'s sign-in service is reachable. The secret is confirmed on the first real sign-in.'
  },
  {
    key: 'microsoft-365',
    name: 'Microsoft 365',
    category: 'identity',
    color: '#0078D4',
    tagline: 'Single sign-on with Microsoft Entra ID (work and school accounts).',
    description: 'Let your team sign in with their Microsoft 365 accounts ("Continue with Microsoft"), limited to your tenant or company domain when you want.',
    delivery: null,
    defaultEvents: [],
    fields: [
      { key: 'client_id', label: 'Application (client) ID', type: 'text', section: 'connection', required: true, placeholder: '00000000-0000-0000-0000-000000000000', help: 'Microsoft Entra admin center > App registrations > your app > Overview.' },
      { key: 'client_secret', label: 'Client secret value', type: 'password', section: 'connection', secret: true, required: true, help: 'App registrations > Certificates & secrets > New client secret (copy the Value, not the ID).' },
      { key: 'tenant', label: 'Directory (tenant) ID', type: 'text', section: 'connection', default: 'common', placeholder: 'common', help: '"common" allows any Microsoft account; your tenant ID limits sign-in to your organization.' },
      { key: 'allowed_domain', label: 'Company domain', type: 'text', section: 'connection', placeholder: 'bexcodeservices.com' },
      { key: 'enable_sso', label: 'Show "Continue with Microsoft" on the sign-in page', type: 'toggle', section: 'signing', default: true },
      { key: 'restrict_domain', label: 'Only allow accounts from the company domain', type: 'toggle', section: 'signing', default: false },
      { key: 'allow_signup', label: 'Create a BexSign account on first Microsoft sign-in', type: 'toggle', section: 'signing', default: true }
    ],
    steps: [
      'In the Microsoft Entra admin center register an application (Web platform).',
      'Add the redirect URI shown below under Authentication > Web > Redirect URIs.',
      'Create a client secret and paste the client ID, secret and tenant ID here.',
      'Click "Test connection" to check the tenant, then Save.'
    ],
    redirectPath: '/api/auth/oauth/microsoft/callback',
    test: 'Checks the client ID and that the tenant exists (Microsoft sign-in metadata).'
  },
  {
    key: 'stripe-identity',
    name: 'Stripe Identity',
    category: 'verification',
    color: '#635BFF',
    tagline: 'Verify recipient identity using Stripe authentication services.',
    description: 'Check who is signing: recipients verify a government ID (and optionally a selfie) with Stripe Identity. Store your Stripe keys and the default verification rules for signature requests here.',
    delivery: null,
    defaultEvents: [],
    fields: [
      { key: 'publishable_key', label: 'Publishable key', type: 'text', section: 'connection', required: true, placeholder: 'pk_live_…', help: 'Stripe Dashboard > Developers > API keys.' },
      { key: 'secret_key', label: 'Secret key', type: 'password', section: 'connection', secret: true, required: true, placeholder: 'sk_live_… or rk_live_…', help: 'A restricted key with "Identity: write" is enough.' },
      { key: 'webhook_secret', label: 'Webhook signing secret', type: 'password', section: 'connection', secret: true, placeholder: 'whsec_…', help: 'Optional: for verification results sent by Stripe.' },
      { key: 'verification_type', label: 'Verification type', type: 'select', section: 'signing', default: 'document', options: [['document', 'Government ID document'], ['id_number', 'ID number']] },
      { key: 'require_selfie', label: 'Also require a matching selfie', type: 'toggle', section: 'signing', default: false },
      { key: 'require_live_capture', label: 'Require a live photo (no uploads)', type: 'toggle', section: 'signing', default: true },
      { key: 'apply_to', label: 'Ask for verification', type: 'select', section: 'signing', default: 'on_request', options: [['on_request', 'Only on requests where the sender turns it on'], ['all', 'On every signature request']] }
    ],
    steps: [
      'Activate Identity in your Stripe Dashboard (Settings > Identity).',
      'Create a restricted API key with "Identity: write" or use your secret key, and copy the publishable key.',
      'Paste both keys here and choose how recipients are verified.',
      'Click "Test connection": BexSign calls the Stripe Identity API with your key. Save to keep the settings.'
    ],
    test: 'Calls the Stripe Identity API (list verification sessions) with the secret key.'
  },
  {
    key: 'dropbox',
    name: 'Dropbox',
    category: 'storage',
    color: '#0061FF',
    tagline: 'Save every completed document and its certificate to Dropbox.',
    description: 'When a request is completed, BexSign uploads the signed PDFs (and the Certificate of Completion) to a Dropbox folder you choose.',
    delivery: 'dropbox',
    defaultEvents: ['document.completed'],
    fixedEvents: true,
    fields: [
      { key: 'access_token', label: 'Access token', type: 'password', section: 'connection', secret: true, required: true, placeholder: 'sl.…', help: 'Dropbox App Console > your app > Settings > Generated access token (scope files.content.write).' },
      { key: 'folder_path', label: 'Folder', type: 'text', section: 'connection', default: '/BexSign', placeholder: '/BexSign/Signed', help: 'Created if it does not exist.' },
      { key: 'include_certificate', label: 'Upload the Certificate of Completion too', type: 'toggle', section: 'signing', default: true },
      { key: 'folder_layout', label: 'Organize files', type: 'select', section: 'signing', default: 'by_month', options: [['flat', 'All in one folder'], ['by_month', 'One folder per month'], ['by_document', 'One folder per request']] }
    ],
    steps: [
      'In the Dropbox App Console create an app with "Scoped access" and enable files.content.write.',
      'Generate an access token on the app\'s Settings tab.',
      'Paste the token and the folder where signed documents should go.',
      'Click "Test connection" to check the token, then Save. Completed requests are uploaded automatically.'
    ],
    test: 'Reads the Dropbox account the token belongs to.'
  },
  {
    key: 'zapier',
    name: 'Zapier',
    category: 'automation',
    color: '#FF4F00',
    tagline: 'Connect BexSign with 5000+ applications using automated workflows.',
    description: 'Start a Zap whenever something happens to a signature request: add rows to Google Sheets, create tasks, notify people, update other apps. BexSign posts each event to your Zapier "Catch Hook".',
    delivery: 'webhook',
    defaultEvents: ['document.completed'],
    fields: [
      { key: 'hook_url', label: 'Catch Hook URL', type: 'url', section: 'connection', required: true, placeholder: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/', help: 'In Zapier choose the trigger "Webhooks by Zapier" > "Catch Hook" and copy its URL.' },
      { key: 'flatten_payload', label: 'Send a flat payload (easier to map in Zapier)', type: 'toggle', section: 'signing', default: true, help: 'Adds document_name, recipient_email, status… at the top level next to the full event.' }
    ],
    steps: [
      'In Zapier create a Zap with the trigger "Webhooks by Zapier" > "Catch Hook".',
      'Copy the hook URL Zapier gives you and paste it here.',
      'Choose which signing events start the Zap.',
      'Click "Test connection": Zapier receives a sample event you can use to map fields. Save and turn the Zap on.'
    ],
    test: 'Posts a sample event to the Catch Hook URL.'
  },
  {
    key: 'slack',
    name: 'Slack',
    category: 'messaging',
    color: '#4A154B',
    tagline: 'Post signing updates to a Slack channel.',
    description: 'Tell your team in Slack when documents are sent, signed, completed or declined.',
    delivery: 'slack',
    defaultEvents: ['document.completed', 'document.declined'],
    fields: [
      { key: 'webhook_url', label: 'Incoming webhook URL', type: 'url', section: 'connection', required: true, placeholder: 'https://hooks.slack.com/services/T000/B000/XXXX', help: 'Slack > Apps > Incoming Webhooks > Add to Slack, pick a channel, copy the URL.' },
      { key: 'channel_label', label: 'Channel name (for your reference)', type: 'text', section: 'connection', placeholder: '#contracts' },
      { key: 'mention_on_decline', label: 'Mention @channel when a document is declined', type: 'toggle', section: 'signing', default: false }
    ],
    steps: [
      'In Slack add the "Incoming Webhooks" app and choose the channel for BexSign updates.',
      'Copy the webhook URL and paste it here.',
      'Pick the events to post, then click "Test connection" to see a message in the channel.'
    ],
    test: 'Posts a test message to the channel.'
  }
];

/** Fields of a custom integration (Add integration). */
const CUSTOM_FIELDS = [
  { key: 'endpoint_url', label: 'Endpoint URL', type: 'url', section: 'connection', required: true, placeholder: 'https://example.com/webhooks/bexsign', help: 'BexSign posts each event here as JSON.' },
  { key: 'auth_type', label: 'Authentication', type: 'select', section: 'connection', default: 'none', options: [['none', 'None'], ['bearer', 'Bearer token'], ['header', 'Custom header'], ['basic', 'Basic (user:password)']] },
  { key: 'auth_header', label: 'Header name', type: 'text', section: 'connection', placeholder: 'X-API-Key', help: 'Only for "Custom header".', showIf: { auth_type: 'header' } },
  { key: 'auth_value', label: 'Token / key / user:password', type: 'password', section: 'connection', secret: true, showIf: { auth_type: ['bearer', 'header', 'basic'] } },
  { key: 'signing_secret', label: 'Signing secret', type: 'password', section: 'connection', secret: true, help: 'Each request carries X-BexSign-Signature: sha256=HMAC(body, secret). Leave empty to generate one.' },
  { key: 'include_recipients', label: 'Include recipients in the payload', type: 'toggle', section: 'signing', default: true },
  { key: 'include_document_link', label: 'Include a link to the document in BexSign', type: 'toggle', section: 'signing', default: true }
];

const CUSTOM_TEMPLATE = {
  key: 'custom',
  name: 'Custom integration',
  category: 'custom',
  color: '#007355',
  tagline: 'Send signing events to any system with a URL.',
  description: 'Post signing events to your own application, an internal tool or any service that accepts webhooks.',
  delivery: 'webhook',
  defaultEvents: ['document.completed'],
  fields: CUSTOM_FIELDS,
  steps: [
    'Create an HTTPS endpoint in your system that accepts JSON POST requests.',
    'Enter its URL and how BexSign should authenticate.',
    'Choose the signing events to send, then click "Test connection" to post a ping event.',
    'Verify X-BexSign-Signature with the signing secret before trusting a request.'
  ],
  test: 'Posts a "ping" event to the endpoint.'
};

const findProvider = (key) => PROVIDERS.find((p) => p.key === key) || (String(key || '').startsWith('custom-') ? CUSTOM_TEMPLATE : null);

module.exports = { SIGNING_EVENTS, EVENT_KEYS, CATEGORIES, PROVIDERS, CUSTOM_TEMPLATE, CUSTOM_FIELDS, findProvider };
