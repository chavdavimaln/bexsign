/**
 * SMS delivery (server/utils/smsService.js). Provider-agnostic: picks a REST provider by SMS_PROVIDER, or falls
 * back to a dry-run that writes each message to server/sms_outbox/ (mirroring emailService.js's EMAIL_DRY_RUN /
 * email_outbox pattern) when no provider is configured. Used for both recipient invitations sent by SMS
 * (delivery_mode "SMS" / "Email + SMS") and SMS one-time access codes (otpService.js).
 *
 * Env vars (all optional — nothing set means dry-run):
 *   SMS_PROVIDER        "twilio" | "msg91"
 *   SMS_DRY_RUN         "true" forces dry-run even when a provider is configured (for local testing)
 *   Twilio:  SMS_ACCOUNT_SID, SMS_AUTH_TOKEN, SMS_FROM_NUMBER
 *   MSG91:   SMS_API_KEY, SMS_SENDER_ID (defaults to "BEXSGN")
 */
const path = require('path');
const fs = require('fs');

const PROVIDER = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
const DRY_RUN = process.env.SMS_DRY_RUN === 'true' || !PROVIDER;
const OUTBOX_DIR = path.join(__dirname, '..', 'sms_outbox');

function configuredProvider() {
  if (PROVIDER === 'twilio') {
    const { SMS_ACCOUNT_SID: sid, SMS_AUTH_TOKEN: token, SMS_FROM_NUMBER: from } = process.env;
    return sid && token && from ? { name: 'twilio', sid, token, from } : null;
  }
  if (PROVIDER === 'msg91') {
    const { SMS_API_KEY: apiKey, SMS_SENDER_ID: senderId } = process.env;
    return apiKey ? { name: 'msg91', apiKey, senderId: senderId || 'BEXSGN' } : null;
  }
  return null;
}

async function dispatchTwilio(provider, to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${provider.sid}/Messages.json`;
  const auth = Buffer.from(`${provider.sid}:${provider.token}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ To: to, From: provider.from, Body: body })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Twilio request failed (HTTP ${res.status})`);
  return { messageId: data.sid };
}

async function dispatchMsg91(provider, to, body) {
  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { authkey: provider.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: provider.senderId,
      mobiles: to.replace(/^\+/, ''),
      message: body
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.type === 'error') throw new Error(data?.message || `MSG91 request failed (HTTP ${res.status})`);
  return { messageId: data?.request_id || null };
}

/** "+91 98765-43210" -> "+919876543210" (the form the providers expect). Empty when there are no digits. */
function normalizePhone(value) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return `${raw.startsWith('+') ? '+' : ''}${digits}`;
}

/** A phone number a text can be sent to: country code first, 7 to 15 digits in total (E.164). */
function isValidPhone(value) {
  return /^\+[1-9]\d{6,14}$/.test(normalizePhone(value));
}

/** True when texts really leave the server (a provider with credentials, and not SMS_DRY_RUN). */
function isSmsLive() {
  return !DRY_RUN && Boolean(configuredProvider());
}

/** { to, body } -> { success, messageId?, dryRun?, error? }. `to` should include a country code (e.g. +91...). */
async function sendSms({ to, body }) {
  const phone = normalizePhone(to);
  const text = String(body || '').trim();
  if (!phone) return { success: false, error: 'No phone number on file for this recipient.' };
  if (!text) return { success: false, error: 'Empty SMS body.' };

  const provider = !DRY_RUN ? configuredProvider() : null;
  if (!provider) {
    try {
      fs.mkdirSync(OUTBOX_DIR, { recursive: true });
      const safeTo = phone.replace(/[^0-9+]/g, '_');
      const file = path.join(OUTBOX_DIR, `${Date.now()}-${safeTo}.txt`);
      fs.writeFileSync(file, `To: ${phone}\nDate: ${new Date().toISOString()}\n\n${text}\n`);
      console.log(`[SMS dry-run] message for ${phone} saved to ${file}`);
      return { success: true, dryRun: true };
    } catch (err) {
      console.error('[SMS dry-run] could not write outbox file:', err.message);
      return { success: false, error: err.message };
    }
  }

  try {
    const result = provider.name === 'twilio' ? await dispatchTwilio(provider, phone, text) : await dispatchMsg91(provider, phone, text);
    console.log(`[SMS] dispatched via ${provider.name} to ${phone}:`, result.messageId || '');
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error(`[SMS Error] ${provider.name} send failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/** Health-check mirroring emailService's verifySmtpConnection(), logged once at server boot. */
async function verifySmsConfig() {
  if (DRY_RUN) return { success: true, dryRun: true };
  const provider = configuredProvider();
  if (!provider) return { success: false, dryRun: true, error: `SMS_PROVIDER=${PROVIDER} but its credentials are not set` };
  return { success: true, provider: provider.name };
}

module.exports = { sendSms, verifySmsConfig, isSmsLive, normalizePhone, isValidPhone };
