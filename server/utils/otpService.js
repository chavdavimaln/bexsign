/**
 * Recipient access gate (server/utils/otpService.js): the one-time code or passcode a recipient must provide
 * before a public signing link opens their document (Customize > Authentication Type: "Email OTP" / "SMS OTP" /
 * "Offline Passcode"). Mirrors Zoho Sign's recipient authentication — the signing link itself is always emailed
 * normally; this only gates *opening* it.
 *
 * The whole gate is off by default: general_settings.require_signer_otp (Settings > General > "Recipient access
 * codes") is the organization-wide on/off switch. Off, recipients open their link straight away even if a sender
 * picked "Email OTP"/"SMS OTP"/"Offline Passcode" for them in Customize; an admin turns it on when ready.
 *
 * document_recipients columns used: otp_code, otp_expires_at, otp_verified_at, access_passcode, auth_type, phone.
 */
const db = require('../db');
const { sendOtpEmail } = require('./emailService');
const { sendSms } = require('./smsService');
const { logRequestEvent } = require('./requestHelpers');

/** The org-wide switch for the whole recipient access-gate feature (default off). */
async function isAccessGateEnabled() {
  try {
    const [rows] = await db.query('SELECT require_signer_otp FROM general_settings ORDER BY id ASC LIMIT 1');
    return Boolean(rows[0]?.require_signer_otp);
  } catch (err) {
    console.warn('[OTP] Could not read general_settings.require_signer_otp, treating the gate as off:', err.message);
    return false;
  }
}

const CODE_TTL_MINUTES = 10;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email) {
  const [user, domain] = String(email || '').split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length > 4 ? `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}` : '****';
}

async function getRecipient(recipientId) {
  const [rows] = await db.query(
    `SELECT r.id, r.document_id, r.name, r.email, r.phone, r.auth_type, r.access_passcode, r.otp_code, r.otp_expires_at,
            d.document_name
     FROM document_recipients r JOIN documents d ON d.id = r.document_id
     WHERE r.id = ?`,
    [recipientId]
  );
  return rows[0] || null;
}

/** Generates and sends a fresh code by the recipient's auth channel ("Email OTP" or "SMS OTP"). */
async function issueAccessCode(recipientId, req = null) {
  if (!(await isAccessGateEnabled())) return { success: false, error: 'Recipient access codes are turned off.' };
  const recipient = await getRecipient(recipientId);
  if (!recipient) return { success: false, error: 'Recipient not found.' };
  const channel = recipient.auth_type === 'SMS OTP' ? 'sms' : 'email';
  if (channel === 'sms' && !recipient.phone) {
    return { success: false, error: 'No phone number is on file for this recipient.' };
  }

  const code = generateCode();
  await db.query(
    'UPDATE document_recipients SET otp_code = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
    [code, CODE_TTL_MINUTES, recipientId]
  );

  const result = channel === 'sms'
    ? await sendSms({ to: recipient.phone, body: `Your BexSign access code for "${recipient.document_name}" is ${code}. Valid ${CODE_TTL_MINUTES} minutes.` })
    : await sendOtpEmail({ to: recipient.email, name: recipient.name, code, documentName: recipient.document_name, expiresInMinutes: CODE_TTL_MINUTES });

  await logRequestEvent(recipient.document_id, {
    recipientId,
    description: result.success
      ? `Access code sent to ${recipient.name || recipient.email} by ${channel === 'sms' ? 'SMS' : 'email'}`
      : `Access code to ${recipient.name || recipient.email} failed: ${result.error}`,
    req
  });

  return {
    success: result.success,
    error: result.error,
    channel,
    maskedDestination: channel === 'sms' ? maskPhone(recipient.phone) : maskEmail(recipient.email)
  };
}

/** Checks a submitted one-time code; marks the recipient verified on success. */
async function verifyAccessCode(recipientId, code) {
  const recipient = await getRecipient(recipientId);
  if (!recipient) return { success: false, error: 'Recipient not found.' };
  if (!recipient.otp_code || !recipient.otp_expires_at) {
    return { success: false, error: 'Request a new code first.' };
  }
  if (new Date(recipient.otp_expires_at).getTime() < Date.now()) {
    return { success: false, error: 'That code has expired. Request a new one.' };
  }
  if (String(code || '').trim() !== recipient.otp_code) {
    return { success: false, error: 'That code is not correct.' };
  }
  await db.query(
    'UPDATE document_recipients SET otp_verified_at = NOW(), otp_code = NULL, otp_expires_at = NULL WHERE id = ?',
    [recipientId]
  );
  await logRequestEvent(recipient.document_id, { recipientId, description: `${recipient.name || recipient.email} verified their access code` });
  return { success: true };
}

/** Checks a submitted offline passcode (sender-set, nothing is sent); marks the recipient verified on success. */
async function verifyPasscode(recipientId, passcode) {
  const recipient = await getRecipient(recipientId);
  if (!recipient) return { success: false, error: 'Recipient not found.' };
  if (!recipient.access_passcode) return { success: false, error: 'No passcode is set for this recipient.' };
  if (String(passcode || '').trim() !== recipient.access_passcode) {
    return { success: false, error: 'That passcode is not correct.' };
  }
  await db.query('UPDATE document_recipients SET otp_verified_at = NOW() WHERE id = ?', [recipientId]);
  await logRequestEvent(recipient.document_id, { recipientId, description: `${recipient.name || recipient.email} entered the correct access passcode` });
  return { success: true };
}

module.exports = { issueAccessCode, verifyAccessCode, verifyPasscode, maskEmail, maskPhone, isAccessGateEnabled };
