const nodemailer = require('nodemailer');

// SMTP Configuration
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // SSL on 465
  auth: {
    user: process.env.SMTP_USER || 'info@bexcodeservices.com',
    pass: process.env.SMTP_PASSWORD || 'tbwffkmwugtbaiuw'
  },
  tls: {
    rejectUnauthorized: false
  }
};

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
}

/**
 * Base email layout wrapper with BexSign branding
 */
function getBexSignHtmlTemplate({
  headerTitle = 'Digital Signature Request',
  headerColor = '#00a884', // BexSign emerald
  mainMessage = '',
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
  senderName = 'Manu Yadav',
  senderEmail = 'manu.yadav@oladigital.health',
  orgName = 'Dcode Health',
  expiresOn = 'Sep 16, 2026',
  message = '-',
  signingUrl = 'http://localhost:3000'
}) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Digital Signature Request',
    headerColor: '#00a884',
    mainMessage: `<strong>${senderName}</strong> has requested you to review and sign <strong>${documentName}</strong>`,
    details: [
      { label: 'Sender', value: `${senderEmail}` },
      { label: 'Organization Name', value: orgName },
      { label: 'Expires on', value: expiresOn },
      { label: 'Message to all', value: message },
      { label: 'Private Message', value: '-' }
    ],
    ctaText: 'Start Signing',
    ctaLink: signingUrl
  });

  const mailOptions = {
    from: `"BexSign" <${SMTP_CONFIG.auth.user}>`,
    replyTo: senderEmail,
    to: to,
    subject: `${senderName} from ${orgName} requests you to sign ${documentName}`,
    html: mailHtml
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log('[SMTP] Signature request email dispatched:', info.messageId, 'to:', to);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[SMTP Error] Failed to send signature request email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Send Reminder Email (PDF 2 p.4)
 */
async function sendReminderEmail({
  to,
  recipientName = 'Signer',
  documentName = 'Document',
  senderName = 'Manu Yadav',
  senderEmail = 'manu.yadav@oladigital.health',
  orgName = 'Dcode Health',
  expiresOn = 'Sep 17, 2026',
  signingUrl = 'http://localhost:3000'
}) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Digital Signature Request',
    headerColor: '#00a884',
    mainMessage: `<strong>${senderName}</strong> has requested you to review and sign <strong>${documentName}</strong>`,
    details: [
      { label: 'Sender', value: `${senderEmail}` },
      { label: 'Organization Name', value: orgName },
      { label: 'Expires on', value: expiresOn },
      { label: 'Message to all', value: '-' },
      { label: 'Private Message', value: '-' }
    ],
    ctaText: 'Start Signing',
    ctaLink: signingUrl
  });

  const mailOptions = {
    from: `"BexSign" <${SMTP_CONFIG.auth.user}>`,
    replyTo: senderEmail,
    to: to,
    subject: `${senderName} from ${orgName} has sent you a reminder to sign ${documentName}`,
    html: mailHtml
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log('[SMTP] Reminder email sent:', info.messageId, 'to:', to);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[SMTP Error] Failed to send reminder email:', err.message);
    return { success: false, error: err.message };
  }
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
    mainMessage: `<strong>${senderEmail}</strong> has recalled <strong>${documentName}</strong>`,
    details: [
      { label: 'Reason', value: reason }
    ]
  });

  const mailOptions = {
    from: `"BexSign" <${SMTP_CONFIG.auth.user}>`,
    to: to,
    subject: `Document ${documentName} has been recalled`,
    html: mailHtml
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log('[SMTP] Recalled email sent:', info.messageId, 'to:', to);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[SMTP Error] Failed to send recalled email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Send Document Completed Email (PDF 2 p.7, PDF 3 p.11)
 */
async function sendDocumentCompletedEmail({
  to,
  documentName = 'Document',
  senderEmail = 'manu.yadav@oladigital.health',
  attachmentPath = null
}) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Document completed',
    headerColor: '#00a884',
    mainMessage: `The document <strong>${documentName}</strong> is completed. Here is a copy of the completed document.`
  });

  const mailOptions = {
    from: `"BexSign" <${SMTP_CONFIG.auth.user}>`,
    to: to,
    subject: `Document ${documentName} has been completed`,
    html: mailHtml,
    attachments: attachmentPath ? [{ filename: `${documentName}.pdf`, path: attachmentPath }] : []
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log('[SMTP] Completed email sent:', info.messageId, 'to:', to);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[SMTP Error] Failed to send completed email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Send Document Copy Email (PDF 3 p.12)
 */
async function sendDocumentCopyEmail({
  to,
  documentName = 'Document',
  senderEmail = 'manu.yadav@oladigital.health',
  attachmentPath = null
}) {
  const mailHtml = getBexSignHtmlTemplate({
    headerTitle: 'Document copy',
    headerColor: '#00a884',
    mainMessage: `A copy of the document <strong>${documentName}</strong> is attached to this email. Kindly download the document from the attachment.`
  });

  const mailOptions = {
    from: `"BexSign" <${SMTP_CONFIG.auth.user}>`,
    to: to,
    subject: `Copy of the document ${documentName}`,
    html: mailHtml,
    attachments: attachmentPath ? [{ filename: `${documentName}.pdf`, path: attachmentPath }] : []
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log('[SMTP] Document copy email sent:', info.messageId, 'to:', to);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[SMTP Error] Failed to send document copy email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendSignatureRequestEmail,
  sendReminderEmail,
  sendDocumentRecalledEmail,
  sendDocumentCompletedEmail,
  sendDocumentCopyEmail
};
