const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const smtpPort = parseInt(process.env.SMTP_PORT) || 465;

// SMTP Configuration (.env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD or SMTP_PASS, SMTP_SECURE)
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465, // SSL on 465, STARTTLS otherwise
  auth: {
    user: process.env.SMTP_USER || 'info@bexcodeservices.com',
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || 'tbwffkmwugtbaiuw'
  },
  tls: {
    rejectUnauthorized: false
  }
};

// EMAIL_DRY_RUN=true writes every email (with attachments) as .eml into server/email_outbox instead of sending
const DRY_RUN = process.env.EMAIL_DRY_RUN === 'true';
const OUTBOX_DIR = path.join(__dirname, '..', 'email_outbox');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = DRY_RUN
      ? nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' })
      : nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function deliverMail(mailOptions, label) {
  try {
    const info = await getTransporter().sendMail({
      from: `"BexSign" <${SMTP_CONFIG.auth.user}>`,
      ...mailOptions
    });
    const attachmentCount = (mailOptions.attachments || []).length;
    if (DRY_RUN && info.message) {
      fs.mkdirSync(OUTBOX_DIR, { recursive: true });
      const safeTo = String(mailOptions.to).replace(/[^a-z0-9@._-]/gi, '_');
      const file = path.join(OUTBOX_DIR, `${Date.now()}-${label.replace(/\s+/g, '-')}-${safeTo}.eml`);
      fs.writeFileSync(file, info.message);
      console.log(`[SMTP dry-run] ${label} for ${mailOptions.to} (${attachmentCount} attachments) saved to ${file}`);
    } else {
      console.log(`[SMTP] ${label} dispatched:`, info.messageId, 'to:', mailOptions.to, attachmentCount ? `with ${attachmentCount} attachments` : '');
    }
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP Error] Failed to send ${label}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function verifySmtpConnection() {
  if (DRY_RUN) return { success: true, dryRun: true };
  try {
    await getTransporter().verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function documentListHtml(documentNames = []) {
  if (!Array.isArray(documentNames) || documentNames.length < 2) return '';
  return `
    <div style="margin: 4px 0 18px 0; font-size: 13px; color: #333;">
      This request contains ${documentNames.length} documents:
      <ol style="margin: 8px 0 0 18px; padding: 0;">
        ${documentNames.map((n) => `<li style="padding: 2px 0;">${escapeHtml(n)}</li>`).join('')}
      </ol>
    </div>
  `;
}

/**
 * Base email layout wrapper with BexSign branding
 */
function getBexSignHtmlTemplate({
  headerTitle = 'Digital Signature Request',
  headerColor = '#00a884', // BexSign emerald
  mainMessage = '',
  extraHtml = '',
  details = [],
  ctaText = '',
  ctaLink = '',
  footerNote = ''
}) {
  const detailsRows = details
    .map(
      d => `
      <tr>
        <td style="padding: 7px 0; font-size: 13px; font-weight: 600; color: #555; width: 140px; vertical-align: top;">${d.label}</td>
        <td style="padding: 7px 0; font-size: 13px; color: #222; vertical-align: top;">${d.value || '-'}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; color: #333; }
        .container { max-width: 580px; margin: 25px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e8edea; }
        .logo-bar { padding: 18px 28px; background: #ffffff; display: flex; align-items: center; border-bottom: 1px solid #f0f0f0; }
        .banner { background-color: ${headerColor}; color: #ffffff; padding: 16px 28px; font-size: 18px; font-weight: 700; letter-spacing: 0.2px; }
        .content { padding: 26px 28px; }
        .message { font-size: 14px; line-height: 1.5; color: #333333; margin-bottom: 20px; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .btn-container { text-align: left; margin: 24px 0 16px 0; }
        .btn-cta { display: inline-block; background-color: #00a884; color: #ffffff !important; padding: 12px 28px; border-radius: 4px; font-size: 14px; font-weight: bold; text-decoration: none; box-shadow: 0 2px 4px rgba(0,168,132,0.3); }
        .footer { padding: 18px 28px; background-color: #fafbfc; border-top: 1px solid #eee; font-size: 11px; line-height: 1.5; color: #888; }
        .footer a { color: #00a884; text-decoration: none; }
        @media (max-width: 600px) { .container { margin: 0; border-radius: 0; } .content, .banner, .logo-bar, .footer { padding-left: 18px; padding-right: 18px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Logo Bar -->
        <div class="logo-bar">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align: middle;">
                <div style="background: #00a884; color: #fff; font-weight: 900; font-size: 13px; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-right: 8px;">BS</div>
              </td>
              <td style="vertical-align: middle;">
                <span style="font-size: 16px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px;">Bex<span style="color: #00a884;">Sign</span></span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Colored Banner -->
        <div class="banner">
          ${headerTitle}
        </div>

        <!-- Main Body Content -->
        <div class="content">
          ${mainMessage ? `<div class="message">${mainMessage}</div>` : ''}

          ${extraHtml}

          ${details.length > 0 ? `<table class="details-table">${detailsRows}</table>` : ''}

          ${ctaText && ctaLink ? `
            <div class="btn-container">
              <a href="${ctaLink}" target="_blank" class="btn-cta">${ctaText}</a>
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div class="footer">
          This is an automated email from BexSign. For any queries regarding this email, please contact the sender directly. If you think this email is inappropriate or spam, you may file a report with BexSign <a href="#">here</a>. To turn off reminders for this document, <a href="#">click here</a>.
          ${footerNote ? `<div style="margin-top: 6px; font-style: italic;">${footerNote}</div>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 1. Send Signature Request Email (PDF 1 p.7, PDF 3 p.10)
 */
async function sendSignatureRequestEmail({
  to,
  recipientName = 'Signer',
  documentName = 'Document',
  documentNames = [],
  senderName = 'Manu Yadav',
  senderEmail = 'manu.yadav@oladigital.health',
  orgName = 'Dcode Health',
  expiresOn = 'Sep 16, 2026',
  message = '-',
  privateMessage = '-',
  signingUrl = (process.env.CLIENT_URL || 'http://localhost:3003')
}) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Digital Signature Request',
    headerColor: '#00a884',
    mainMessage: `Hello ${escapeHtml(recipientName)},<br/><br/><strong>${escapeHtml(senderName)}</strong> has requested you to review and sign <strong>${escapeHtml(documentName)}</strong>`,
    extraHtml: documentListHtml(documentNames),
    details: [
      { label: 'Sender', value: escapeHtml(senderEmail) },
      { label: 'Organization Name', value: escapeHtml(orgName) },
      { label: 'Expires on', value: escapeHtml(expiresOn) },
      { label: 'Message to all', value: escapeHtml(message || '-') },
      { label: 'Private Message', value: escapeHtml(privateMessage || '-') }
    ],
    ctaText: 'Start Signing',
    ctaLink: signingUrl
  });

  return deliverMail({
    replyTo: senderEmail,
    to: to,
    subject: `${senderName} from ${orgName} requests you to sign ${documentName}`,
    html: mailHtml
  }, 'Signature request email');
}

/**
 * 2. Send Reminder Email (PDF 2 p.4)
 */
async function sendReminderEmail({
  to,
  recipientName = 'Signer',
  documentName = 'Document',
  documentNames = [],
  senderName = 'Manu Yadav',
  senderEmail = 'manu.yadav@oladigital.health',
  orgName = 'Dcode Health',
  expiresOn = 'Sep 17, 2026',
  message = '-',
  privateMessage = '-',
  signingUrl = (process.env.CLIENT_URL || 'http://localhost:3003')
}) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Digital Signature Request',
    headerColor: '#00a884',
    mainMessage: `Hello ${escapeHtml(recipientName)},<br/><br/><strong>${escapeHtml(senderName)}</strong> has requested you to review and sign <strong>${escapeHtml(documentName)}</strong>`,
    extraHtml: documentListHtml(documentNames),
    details: [
      { label: 'Sender', value: escapeHtml(senderEmail) },
      { label: 'Organization Name', value: escapeHtml(orgName) },
      { label: 'Expires on', value: escapeHtml(expiresOn) },
      { label: 'Message to all', value: escapeHtml(message || '-') },
      { label: 'Private Message', value: escapeHtml(privateMessage || '-') }
    ],
    ctaText: 'Start Signing',
    ctaLink: signingUrl
  });

  return deliverMail({
    replyTo: senderEmail,
    to: to,
    subject: `${senderName} from ${orgName} has sent you a reminder to sign ${documentName}`,
    html: mailHtml
  }, 'Reminder email');
}

/**
 * 3. Send Recalled Email (PDF 2 p.6)
 */
async function sendDocumentRecalledEmail({
  to,
  documentName = 'Document',
  senderEmail = 'manu.yadav@oladigital.health',
  reason = 'Document recalled by sender'
}) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Document recalled',
    headerColor: '#00a884',
    mainMessage: `<strong>${escapeHtml(senderEmail)}</strong> has recalled <strong>${escapeHtml(documentName)}</strong>`,
    details: [
      { label: 'Reason', value: escapeHtml(reason) }
    ]
  });

  return deliverMail({
    to: to,
    subject: `Document ${documentName} has been recalled`,
    html: mailHtml
  }, 'Recalled email');
}

function normalizeAttachments(attachments, documentName) {
  const emailAttachments = [];
  for (const att of attachments) {
    if (typeof att === 'string') {
      const fullPath = path.isAbsolute(att) ? att : path.join(__dirname, '..', att);
      if (fs.existsSync(fullPath)) {
        emailAttachments.push({ filename: path.basename(fullPath), path: fullPath, contentType: 'application/pdf' });
      }
    } else if (att && typeof att === 'object') {
      const cleanName = att.filename ? (att.filename.endsWith('.pdf') ? att.filename : `${att.filename}.pdf`) : `${documentName}.pdf`;
      if (att.content) {
        emailAttachments.push({ filename: cleanName, content: att.content, contentType: att.contentType || 'application/pdf' });
      } else if (att.path) {
        const fullPath = path.isAbsolute(att.path) ? att.path : path.join(__dirname, '..', att.path);
        if (fs.existsSync(fullPath)) {
          emailAttachments.push({ filename: cleanName, path: fullPath, contentType: att.contentType || 'application/pdf' });
        }
      }
    }
  }
  return emailAttachments;
}

/**
 * 4. Send Document Completed Email (PDF 2 p.7, PDF 3 p.11)
 * Attaches the signed copy of every document and the certificate of completion.
 */
async function sendDocumentCompletedEmail({
  to,
  recipientName = '',
  documentName = 'Document',
  documentNames = [],
  senderName = '',
  senderEmail = 'manu.yadav@oladigital.health',
  orgName = '',
  isSender = false,
  attachmentPath = null,
  attachments = []
}) {
  let emailAttachments = [];
  if (Array.isArray(attachments) && attachments.length > 0) {
    emailAttachments = normalizeAttachments(attachments, documentName);
  } else if (attachmentPath) {
    emailAttachments = normalizeAttachments([{ filename: `${documentName.replace(/\.pdf$/i, '')}.pdf`, path: attachmentPath }], documentName);
  }

  const docCount = Math.max(documentNames.length, 1);
  const hasCertificate = emailAttachments.some((a) => /certificate/i.test(a.filename));
  const greeting = recipientName ? `Hello ${escapeHtml(recipientName)},<br/><br/>` : '';
  const whoCompleted = isSender ? 'All recipients have completed' : 'All parties have completed';
  const attachedText = emailAttachments.length > 0
    ? ` The signed ${docCount > 1 ? `copies of the ${docCount} documents are` : 'document is'} attached${hasCertificate ? ' along with the certificate of completion' : ''}.`
    : '';

  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Document completed',
    headerColor: '#00a884',
    mainMessage: `${greeting}${whoCompleted} <strong>${escapeHtml(documentName)}</strong>.${attachedText}`,
    extraHtml: documentListHtml(documentNames),
    details: [
      ...(senderName ? [{ label: 'Sender', value: `${escapeHtml(senderName)} (${escapeHtml(senderEmail)})` }] : []),
      ...(orgName ? [{ label: 'Organization Name', value: escapeHtml(orgName) }] : []),
      { label: 'Attachments', value: emailAttachments.length ? emailAttachments.map((a) => escapeHtml(a.filename)).join('<br/>') : '-' }
    ]
  });

  return deliverMail({
    to: to,
    replyTo: senderEmail,
    subject: `Document ${documentName} has been completed${emailAttachments.length > 1 ? ` (${emailAttachments.length} files attached)` : ''}`,
    html: mailHtml,
    attachments: emailAttachments
  }, 'Completed email');
}

/**
 * 5. Send Document Copy Email (PDF 3 p.12)
 */
async function sendDocumentCopyEmail({
  to,
  documentName = 'Document',
  senderEmail = 'manu.yadav@oladigital.health',
  attachmentPath = null,
  attachments = [],
  signingUrl = ''
}) {
  const emailAttachments = Array.isArray(attachments) && attachments.length > 0
    ? normalizeAttachments(attachments, documentName)
    : (attachmentPath ? normalizeAttachments([{ filename: `${documentName}.pdf`, path: attachmentPath }], documentName) : []);

  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Document copy',
    headerColor: '#00a884',
    mainMessage: emailAttachments.length > 0
      ? `A copy of the document <strong>${escapeHtml(documentName)}</strong> is attached to this email. Kindly download the document from the attachment.`
      : `<strong>${escapeHtml(senderEmail)}</strong> has shared a copy of the document <strong>${escapeHtml(documentName)}</strong> with you.`,
    ctaText: signingUrl ? 'View Document' : '',
    ctaLink: signingUrl
  });

  return deliverMail({
    to: to,
    replyTo: senderEmail,
    subject: `Copy of the document ${documentName}`,
    html: mailHtml,
    attachments: emailAttachments
  }, 'Document copy email');
}

/**
 * 6. Notify the sender that a recipient has signed
 */
async function sendRecipientSignedEmail({
  to,
  senderName = '',
  signerName = 'Recipient',
  signerEmail = '',
  documentName = 'Document',
  remainingCount = 0,
  nextRecipients = []
}) {
  const nextText = nextRecipients.length > 0
    ? `The request has been sent to ${nextRecipients.map((r) => `<strong>${escapeHtml(r.name || r.email)}</strong>`).join(', ')}.`
    : '';
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Document signed',
    headerColor: '#00a884',
    mainMessage: `${senderName ? `Hello ${escapeHtml(senderName)},<br/><br/>` : ''}<strong>${escapeHtml(signerName)}</strong> (${escapeHtml(signerEmail)}) has signed <strong>${escapeHtml(documentName)}</strong>. ${remainingCount > 0 ? `Waiting for ${remainingCount} more recipient${remainingCount === 1 ? '' : 's'}.` : ''} ${nextText}`
  });

  return deliverMail({
    to: to,
    subject: `${signerName} has signed ${documentName}`,
    html: mailHtml
  }, 'Recipient signed email');
}

/**
 * 7. A recipient declined to sign: the sender is told who declined and why.
 */
async function sendDocumentDeclinedEmail({
  to,
  senderName = '',
  documentName = 'Document',
  signerName = 'Recipient',
  signerEmail = '',
  reason = '-'
}) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Document declined',
    headerColor: '#dc2626',
    mainMessage: `${senderName ? `Hello ${escapeHtml(senderName)},<br/><br/>` : ''}<strong>${escapeHtml(signerName)}</strong> (${escapeHtml(signerEmail)}) has declined to sign <strong>${escapeHtml(documentName)}</strong>.`,
    details: [
      { label: 'Reason', value: escapeHtml(reason || '-') },
      { label: 'Declined by', value: escapeHtml(signerEmail) }
    ],
    footerNote: 'No further signatures can be collected for this request. Create a new request if you want to send it again.'
  });

  return deliverMail({
    to,
    subject: `${signerName} declined to sign ${documentName}`,
    html: mailHtml
  }, 'Declined email');
}

/**
 * 8. A recipient assigned their signing to someone else: the sender is told who took over.
 */
async function sendSigningDelegatedEmail({
  to,
  senderName = '',
  documentName = 'Document',
  fromName = 'Recipient',
  fromEmail = '',
  toName = 'New signer',
  toEmail = '',
  reason = '-'
}) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Signing assigned to someone else',
    headerColor: '#0284c7',
    mainMessage: `${senderName ? `Hello ${escapeHtml(senderName)},<br/><br/>` : ''}<strong>${escapeHtml(fromName)}</strong> (${escapeHtml(fromEmail)}) has assigned the signing of <strong>${escapeHtml(documentName)}</strong> to <strong>${escapeHtml(toName)}</strong> (${escapeHtml(toEmail)}).`,
    details: [
      { label: 'Reason', value: escapeHtml(reason || '-') },
      { label: 'New signer', value: escapeHtml(toEmail) }
    ],
    footerNote: 'The signature request has been emailed to the new signer.'
  });

  return deliverMail({
    to,
    subject: `${fromName} assigned ${documentName} to ${toName}`,
    html: mailHtml
  }, 'Assigned email');
}

/**
 * Password reset link ("Forgot password?" and "Send Password Change Link to Email"). The link holds a one-time
 * token that expires after `expiresInMinutes`.
 */
async function sendPasswordResetEmail({ to, name = '', resetUrl, expiresInMinutes = 60, requestIp = '' }) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Reset your BexSign password',
    headerColor: '#00a884',
    mainMessage: `Hello ${escapeHtml(name || to)},<br/><br/>We received a request to reset the password of your BexSign account <strong>${escapeHtml(to)}</strong>. Click the button below to choose a new password.`,
    details: [
      { label: 'Link valid for', value: `${expiresInMinutes} minutes (one use only)` },
      ...(requestIp ? [{ label: 'Requested from IP', value: escapeHtml(requestIp) }] : [])
    ],
    ctaText: 'Reset password',
    ctaLink: resetUrl,
    extraHtml: `<p style="font-size: 12px; color: #666; margin: 0 0 8px 0;">If the button does not work, copy this link into your browser:<br/><a href="${escapeHtml(resetUrl)}" style="color: #00a884; word-break: break-all;">${escapeHtml(resetUrl)}</a></p>`,
    footerNote: 'If you did not ask to reset your password, you can ignore this email: your password stays the same.'
  });

  return deliverMail({
    to,
    subject: 'Reset your BexSign password',
    html: mailHtml,
    text: `Hello ${name || to},\n\nReset the password of your BexSign account ${to} with this link (valid for ${expiresInMinutes} minutes, one use only):\n${resetUrl}\n\nIf you did not ask to reset your password, ignore this email.`
  }, 'Password reset email');
}

/** Confirmation that the account password was changed (reset link or "Update Password"). */
async function sendPasswordChangedEmail({ to, name = '', changedAt = new Date(), requestIp = '' }) {
  const when = new Date(changedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Your BexSign password was changed',
    headerColor: '#00a884',
    mainMessage: `Hello ${escapeHtml(name || to)},<br/><br/>The password of your BexSign account <strong>${escapeHtml(to)}</strong> was changed.`,
    details: [
      { label: 'Changed on', value: escapeHtml(when) },
      ...(requestIp ? [{ label: 'IP address', value: escapeHtml(requestIp) }] : [])
    ],
    footerNote: 'If you did not change your password, reset it right away from the BexSign sign-in page ("Forgot password?") and contact your administrator.'
  });

  return deliverMail({
    to,
    subject: 'Your BexSign password was changed',
    html: mailHtml
  }, 'Password changed email');
}

/** A BexSign notification sent by email (when the user turned on email for its category). */
async function sendNotificationEmail({ to, name = '', title, message = '', categoryLabel = 'Notification', link = '' }) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: escapeHtml(title),
    headerColor: '#00a884',
    mainMessage: `${name ? `Hello ${escapeHtml(name)},<br/><br/>` : ''}${escapeHtml(message)}`,
    details: [{ label: 'Category', value: escapeHtml(categoryLabel) }],
    ctaText: link ? 'Open in BexSign' : '',
    ctaLink: link,
    footerNote: 'You receive this email because email notifications are turned on for this category. Change it in Settings > My Notifications.'
  });
  return deliverMail({ to, subject: title, html: mailHtml }, 'Notification email');
}

/** A scheduled or on-demand report with its CSV attached. */
async function sendReportEmail({ to, reportName, periodLabel = '', rowCount = 0, attachments = [], summary = [] }) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: `Report: ${escapeHtml(reportName)}`,
    headerColor: '#00a884',
    mainMessage: `Your BexSign report <strong>${escapeHtml(reportName)}</strong>${periodLabel ? ` for ${escapeHtml(periodLabel)}` : ''} is attached (${rowCount} row${rowCount === 1 ? '' : 's'}).`,
    details: summary.map(([label, value]) => ({ label: escapeHtml(label), value: escapeHtml(String(value)) })),
    footerNote: 'Scheduled reports can be changed or paused in Reports > Scheduled Reports.'
  });
  return deliverMail({ to, subject: `BexSign report: ${reportName}${periodLabel ? ` (${periodLabel})` : ''}`, html: mailHtml, attachments }, 'Report email');
}

module.exports = {
  sendNotificationEmail,
  sendReportEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendSignatureRequestEmail,
  sendDocumentDeclinedEmail,
  sendSigningDelegatedEmail,
  sendReminderEmail,
  sendDocumentRecalledEmail,
  sendDocumentCompletedEmail,
  sendDocumentCopyEmail,
  sendRecipientSignedEmail,
  verifySmtpConnection
};
