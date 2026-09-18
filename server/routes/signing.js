const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { 
    markDocumentSigned, 
    getEmployeeSignatureByEmail, 
    upsertEmployeeSignature 
} = require('../utils/documentIdentifier');
const multer = require('multer');
const {
    sendDocumentCompletedEmail,
    sendSignatureRequestEmail,
    sendRecipientSignedEmail,
    sendDocumentDeclinedEmail,
    sendSigningDelegatedEmail
} = require('../utils/emailService');
const { generateServerPdfBuffer } = require('../utils/pdfGenerator');
const requestHelpers = require('../utils/requestHelpers');
const { finalizeCompletedRequest } = require('../utils/requestCompletion');
const { isUsableSignature } = require('../utils/signatureValidation');
const { emitDocumentWebhook, notifyDocumentOwner, notifyRecipientUsers } = require('../utils/documentEvents');
const { logFailedAccess } = require('../utils/platformEvents');

/**
 * Everything that happens once a recipient has completed their part: their field values are stored, they are
 * marked as signed, and the request either completes (signed PDFs + certificate emailed) or moves to the next
 * signer. `signedOnPaper` is a copy signed by hand and uploaded, so no electronic signature is captured.
 * Returns the response payload.
 */
async function completeRecipientSigning({
    doc,
    docId,
    recipient,
    name,
    signatureData = null,
    style = 'font-signature-1',
    submittedFields = [],
    signedOnPaper = false,
    completedPdfs = null,
    req = null
}) {
    const ip = requestHelpers.getRequestIp(req);
    const signedAt = new Date().toISOString();
    let recipients = await requestHelpers.getRecipients(docId);
    const signingRecipients = recipients.filter((r) => requestHelpers.isSigningRole(r.role));

    // 1. Persist ONLY this recipient's field values (other recipients' values are never overwritten)
    const submittedById = new Map(
        (Array.isArray(submittedFields) ? submittedFields : [])
            .filter((f) => f && f.id !== undefined && f.id !== null)
            .map((f) => [String(f.id), f])
    );
    const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ?', [docId]);
    for (const row of fieldRows) {
        const field = requestHelpers.parseFieldRow(row);
        if (!requestHelpers.fieldBelongsToRecipient(field, recipient, signingRecipients)) continue;

        const opts = requestHelpers.parseJsonInput(row.options, {}) || {};
        const incoming = submittedById.get(String(row.id));
        if (incoming) {
            if (incoming.value !== undefined) opts.value = incoming.value;
            if (incoming.gridValue !== undefined) opts.gridValue = incoming.gridValue;
            if (incoming.checked !== undefined) opts.checked = incoming.checked;
        }
        if (field.type === 'Signature' || field.type === 'Initial') {
            if (signatureData) opts.signatureImage = signatureData;
            if (signedOnPaper) opts.signedOnPaper = true;
            opts.signatureStyle = style;
        }
        opts.signerName = name;
        opts.signerEmail = recipient.email;
        opts.signedAt = signedAt;
        if (!opts.assigneeEmail) opts.assigneeEmail = recipient.email;

        await db.query('UPDATE document_fields SET options = ?, recipient_id = ? WHERE id = ?', [JSON.stringify(opts), recipient.id, row.id]);

        const storedValue = (field.type === 'Signature' || field.type === 'Initial')
            ? `Signed by ${name}${signedOnPaper ? ' (on paper)' : ''}`
            : (field.type === 'Split text' && Array.isArray(opts.gridValue) ? opts.gridValue.join('') : String(opts.value ?? ''));
        try {
            await db.query(
                'INSERT INTO document_field_values (field_id, recipient_id, field_value, submitted_at) VALUES (?, ?, ?, NOW())',
                [row.id, recipient.id, storedValue]
            );
        } catch (eVal) {
            console.warn('Field value save warning:', eVal.message);
        }
    }

    // 2. Mark this recipient as signed (with IP, device and signature for the certificate)
    await db.query(
        `UPDATE document_recipients
         SET status = 'signed', signed_at = NOW(), signed_ip = ?, signed_user_agent = ?,
             signature_image = COALESCE(?, signature_image), viewed_at = COALESCE(viewed_at, NOW())
         WHERE id = ?`,
        [ip, String(req?.headers?.['user-agent'] || '').slice(0, 255) || null, signatureData || null, recipient.id]
    );
    await requestHelpers.logRequestEvent(docId, {
        recipientId: recipient.id,
        eventType: 'signed',
        description: `${name} (${recipient.email}) ${recipient.role === 'approver' ? 'approved' : 'signed'} the document${signedOnPaper ? ' with a physically signed copy' : ''}`,
        req
    });

    // Upsert into employee_signatures table for future auto-fetch
    if (signatureData) {
        try {
            await upsertEmployeeSignature({ name, email: recipient.email, signatureImage: signatureData, signatureStyle: style });
        } catch (eSig) {}
    }

    // 3. Request status
    recipients = await requestHelpers.getRecipients(docId);
    const pendingSigners = recipients.filter((r) => requestHelpers.isSigningRole(r.role) && r.status !== 'signed');
    const allCompleted = pendingSigners.length === 0;
    const finalStatus = allCompleted ? 'Completed' : 'In Progress';

    await db.query('UPDATE documents SET status = ?, completed_at = ? WHERE id = ?', [finalStatus, allCompleted ? new Date() : null, docId]);
    await markDocumentSigned(docId, {
        signerName: name,
        signerEmail: recipient.email,
        signatureImage: signatureData || null,
        signatureStyle: style,
        status: finalStatus,
        ipAddress: ip || '127.0.0.1'
    });

    const sender = await requestHelpers.getRequestSender(doc);
    let completion = null;
    let nextRecipients = [];

    // Sender notification and webhooks for the signature (and for completion)
    const signedDoc = { ...doc, status: finalStatus, completed_at: allCompleted ? new Date() : null };
    emitDocumentWebhook('document.signed', signedDoc, { recipient: { ...recipient, status: 'signed' } });
    if (allCompleted) {
        emitDocumentWebhook('document.completed', signedDoc, { recipients });
        await notifyDocumentOwner(signedDoc, {
            title: `"${doc.document_name || 'Document'}" is completed`,
            message: `All recipients have signed. The signed documents and the certificate of completion were emailed to everyone.`,
            severity: 'success'
        });
        await notifyRecipientUsers(signedDoc, recipients, {
            title: `"${doc.document_name || 'Document'}" is completed`,
            message: 'Everyone has signed. The signed documents were emailed to you.',
            severity: 'success',
            exceptEmail: recipient.email
        });
    } else {
        await notifyDocumentOwner(signedDoc, {
            title: `${name} ${recipient.role === 'approver' ? 'approved' : 'signed'} "${doc.document_name || 'Document'}"`,
            message: `${pendingSigners.length} recipient${pendingSigners.length === 1 ? '' : 's'} still ${pendingSigners.length === 1 ? 'needs' : 'need'} to sign: ${pendingSigners.map((r) => r.name || r.email).join(', ')}.`,
            severity: 'success',
            actorEmail: recipient.email,
            actorName: name
        });
    }

    if (allCompleted) {
        await requestHelpers.logRequestEvent(docId, { description: `All recipients completed "${doc.document_name}". Document marked Completed.`, req });
        try {
            completion = await finalizeCompletedRequest(docId, { fallbackAttachments: decodeClientPdfs(completedPdfs) });
        } catch (eComplete) {
            console.error('Completion email error:', eComplete);
            completion = { emailed: [], failed: [{ error: eComplete.message }], files: [], certificatePath: null };
        }
    } else {
        // 4. Email any signer who has not received the request yet (e.g. their invitation failed when it was sent)
        const [freshDocs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
        const isSequential = doc.signing_order === 'sequential';
        const nextGroup = requestHelpers.getActiveSigningGroup(recipients, isSequential).filter((r) => !r.sent_at);
        if (nextGroup.length > 0) {
            const results = await requestHelpers.sendSigningInvitations(freshDocs[0], nextGroup, { req });
            nextRecipients = results.filter((r) => r.success).map((r) => ({ name: r.name, email: r.email }));
        }
        if (sender.email && sender.email.toLowerCase() !== String(recipient.email).toLowerCase()) {
            await sendRecipientSignedEmail({
                to: sender.email,
                senderName: sender.name,
                signerName: name,
                signerEmail: recipient.email,
                documentName: doc.document_name,
                remainingCount: pendingSigners.length,
                nextRecipients
            });
        }
    }

    return {
        success: true,
        message: allCompleted
            ? 'Document completed. The signed documents have been emailed to all parties.'
            : 'Document signed successfully!',
        completed: allCompleted,
        remainingSigners: pendingSigners.map((r) => ({ name: r.name, email: r.email })),
        nextRecipients,
        emailed: completion?.emailed || [],
        emailFailures: completion?.failed || [],
        files: completion?.files || [],
        certificatePath: completion?.certificatePath || null
    };
}

// Scanned copies uploaded from "Print and physically sign"
const physicalCopyDir = path.join(__dirname, '..', 'uploads', 'physical');
if (!fs.existsSync(physicalCopyDir)) fs.mkdirSync(physicalCopyDir, { recursive: true });
const physicalCopyUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, physicalCopyDir),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${String(file.originalname || 'signed-copy.pdf').replace(/[^\w.-]+/g, '_')}`)
    }),
    limits: { fileSize: 25 * 1024 * 1024, files: 1 }
});

/**
 * Loads the request and the recipient acting on it, and checks they may still act:
 * the request must be open, they must be a signer/approver and it must be their turn.
 */
async function loadSigningContext({ documentId, token, email, req = null }) {
    const docId = parseInt(documentId || token) || 0;
    const signerEmail = String(email || '').trim();
    if (!docId) return { error: { status: 400, message: 'Document id is required.' } };

    await requestHelpers.ensureRequestSchema();
    const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
    const doc = docs[0];
    if (!doc) return { error: { status: 404, message: 'Document not found.' } };

    const status = String(doc.status || '').toLowerCase();
    if (status === 'completed') return { error: { status: 409, message: 'This document has already been completed.' } };
    if (['recalled', 'trashed', 'declined', 'expired'].includes(status)) {
        return { error: { status: 409, message: `This document is ${doc.status} and can no longer be signed.` } };
    }

    const recipients = await requestHelpers.getRecipients(docId);
    const recipient = recipients.find((r) => String(r.email || '').toLowerCase() === signerEmail.toLowerCase());
    if (!recipient) {
        await logFailedAccess({ req, email: signerEmail || null, source: 'signing_link', reason: 'Signing action by an email that is not a recipient', documentId: docId });
        return { error: { status: 403, message: 'This email address is not a recipient of the document.' } };
    }
    if (!requestHelpers.isSigningRole(recipient.role)) {
        return { error: { status: 403, message: 'You receive a copy of this document and do not need to sign it.' } };
    }
    if (recipient.status === 'signed') return { error: { status: 409, message: 'You have already signed this document.' } };

    const isSequential = doc.signing_order === 'sequential';
    const activeGroup = requestHelpers.getActiveSigningGroup(recipients, isSequential);
    if (!activeGroup.some((r) => r.id === recipient.id)) {
        return { error: { status: 409, message: `It is not your turn yet. Waiting for ${activeGroup.map((r) => r.name || r.email).join(', ')}.` } };
    }
    return { docId, doc, recipients, recipient, isSequential };
}

// @route   POST /api/signatures/decline
// @desc    A recipient declines to sign, with a reason. The request is closed and the sender is emailed.
router.post('/decline', async (req, res) => {
    const { documentId, token, signerEmail, reason } = req.body;
    const declineReason = String(reason || '').trim();
    if (declineReason.length < 3) {
        return res.status(400).json({ success: false, error: 'Please enter the reason for declining this document.' });
    }
    try {
        const context = await loadSigningContext({ documentId, token, email: signerEmail, req });
        if (context.error) return res.status(context.error.status).json({ success: false, error: context.error.message });
        const { docId, doc, recipient } = context;

        await db.query(
            `UPDATE document_recipients SET status = 'declined', declined_at = NOW(), decline_reason = ?, signed_ip = ? WHERE id = ?`,
            [declineReason, requestHelpers.getRequestIp(req), recipient.id]
        );
        await db.query("UPDATE documents SET status = 'Declined', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [docId]);
        await requestHelpers.logRequestEvent(docId, {
            recipientId: recipient.id,
            eventType: 'declined',
            description: `${recipient.name || recipient.email} (${recipient.email}) declined to sign: ${declineReason}`,
            req
        });
        emitDocumentWebhook('document.declined', { ...doc, status: 'Declined' }, { recipient: { ...recipient, status: 'declined' }, reason: declineReason });
        await notifyDocumentOwner(doc, {
            title: `${recipient.name || recipient.email} declined "${doc.document_name || 'Document'}"`,
            message: `Reason: ${declineReason}. The request is closed; send a corrected copy if needed.`,
            severity: 'error',
            actorEmail: recipient.email,
            actorName: recipient.name
        });

        const sender = await requestHelpers.getRequestSender(doc);
        let emailed = false;
        if (sender.email) {
            const result = await sendDocumentDeclinedEmail({
                to: sender.email,
                senderName: sender.name,
                documentName: doc.document_name || 'Document',
                signerName: recipient.name || recipient.email,
                signerEmail: recipient.email,
                reason: declineReason
            });
            emailed = Boolean(result.success);
        }
        res.json({
            success: true,
            declined: true,
            emailedSender: emailed,
            message: `You have declined to sign "${doc.document_name || 'this document'}". ${emailed ? 'The sender has been informed of your reason.' : ''}`.trim()
        });
    } catch (err) {
        console.error('Decline error:', err);
        res.status(500).json({ success: false, error: 'The document could not be declined.' });
    }
});

// @route   POST /api/signatures/assign
// @desc    A recipient hands their signing over to someone else. The new signer gets the request by email.
router.post('/assign', async (req, res) => {
    const { documentId, token, signerEmail, newEmail, newName, reason } = req.body;
    const nextEmail = String(newEmail || '').trim();
    const nextName = String(newName || '').trim() || nextEmail.split('@')[0];
    const assignReason = String(reason || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return res.status(400).json({ success: false, error: 'Enter a valid email address for the person who should sign.' });
    }
    if (assignReason.length < 3) {
        return res.status(400).json({ success: false, error: 'Please enter the reason for assigning this document.' });
    }
    try {
        const context = await loadSigningContext({ documentId, token, email: signerEmail, req });
        if (context.error) return res.status(context.error.status).json({ success: false, error: context.error.message });
        const { docId, doc, recipients, recipient } = context;

        if (nextEmail.toLowerCase() === String(recipient.email).toLowerCase()) {
            return res.status(400).json({ success: false, error: 'This is your own email address. Enter the person you want to assign it to.' });
        }
        if (recipients.some((r) => r.id !== recipient.id && String(r.email || '').toLowerCase() === nextEmail.toLowerCase())) {
            return res.status(409).json({ success: false, error: 'This person is already a recipient of the document.' });
        }

        // The new signer takes over this recipient's place, fields and signing order
        await db.query(
            `UPDATE document_recipients
             SET email = ?, name = ?, status = 'pending', sent_at = NULL, viewed_at = NULL, signed_at = NULL,
                 signature_image = NULL, delegated_from = ?, delegated_reason = ?
             WHERE id = ?`,
            [nextEmail, nextName, recipient.email, assignReason, recipient.id]
        );

        const signingRecipients = recipients.filter((r) => requestHelpers.isSigningRole(r.role));
        const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ?', [docId]);
        for (const row of fieldRows) {
            const field = requestHelpers.parseFieldRow(row);
            if (!requestHelpers.fieldBelongsToRecipient(field, recipient, signingRecipients)) continue;
            const opts = requestHelpers.parseJsonInput(row.options, {}) || {};
            opts.assigneeEmail = nextEmail;
            opts.assignee = nextName;
            opts.assigneeId = recipient.id;
            await db.query('UPDATE document_fields SET options = ?, recipient_id = ? WHERE id = ?', [JSON.stringify(opts), recipient.id, row.id]);
        }

        await requestHelpers.logRequestEvent(docId, {
            recipientId: recipient.id,
            eventType: 'assigned',
            description: `${recipient.name || recipient.email} (${recipient.email}) assigned the signing to ${nextName} (${nextEmail}): ${assignReason}`,
            req
        });
        await notifyDocumentOwner(doc, {
            title: `${recipient.name || recipient.email} assigned "${doc.document_name || 'Document'}" to ${nextName}`,
            message: `${nextName} (${nextEmail}) now signs instead. Reason: ${assignReason}`,
            severity: 'info',
            actorEmail: recipient.email,
            actorName: recipient.name
        });

        const updated = (await requestHelpers.getRecipients(docId)).find((r) => r.id === recipient.id);
        const [invite] = await requestHelpers.sendSigningInvitations(doc, [updated], { req });
        const sender = await requestHelpers.getRequestSender(doc);
        if (sender.email && sender.email.toLowerCase() !== nextEmail.toLowerCase()) {
            await sendSigningDelegatedEmail({
                to: sender.email,
                senderName: sender.name,
                documentName: doc.document_name || 'Document',
                fromName: recipient.name || recipient.email,
                fromEmail: recipient.email,
                toName: nextName,
                toEmail: nextEmail,
                reason: assignReason
            });
        }

        res.json({
            success: true,
            assigned: true,
            assignedTo: { name: nextName, email: nextEmail },
            emailed: Boolean(invite?.success),
            message: `${nextName} (${nextEmail}) has been asked to sign "${doc.document_name || 'this document'}" in your place.`
        });
    } catch (err) {
        console.error('Assign error:', err);
        res.status(500).json({ success: false, error: 'The document could not be assigned.' });
    }
});

// @route   GET /api/signatures/history/:token?email=
// @desc    Document history shown to a recipient while signing: details, recipients and the activity trail
router.get('/history/:token', async (req, res) => {
    const docId = parseInt(req.params.token) || 0;
    try {
        await requestHelpers.ensureRequestSchema();
        const [docs] = await db.query(
            `SELECT d.*, di.bexsign_doc_id FROM documents d LEFT JOIN document_identifiers di ON di.document_id = d.id WHERE d.id = ?`,
            [docId]
        );
        const doc = docs[0];
        if (!doc) return res.status(404).json({ success: false, error: 'Document not found.' });

        const sender = await requestHelpers.getRequestSender(doc);
        const recipients = await requestHelpers.getRecipients(docId);
        const [activities] = await db.query('SELECT * FROM activity_history WHERE document_id = ? ORDER BY id ASC', [docId]);

        // The action badge of each entry is derived from what the activity says
        const actionOf = (text) => {
            const value = String(text || '').toLowerCase();
            if (value.includes('declin')) return 'DECLINED';
            if (value.includes('assign')) return 'ASSIGNED';
            if (value.includes('completed') || value.includes('all recipients')) return 'COMPLETED';
            if (value.includes('signed') || value.includes('approved')) return 'SIGNED';
            if (value.includes('viewed') || value.includes('opened')) return 'VIEWED';
            if (value.includes('reminder')) return 'REMINDED';
            if (value.includes('emailed') || value.includes('sent')) return 'LINK EMAILED';
            if (value.includes('recall')) return 'RECALLED';
            if (value.includes('copy') || value.includes('duplicat')) return 'COPIED';
            if (value.includes('updated') || value.includes('corrected')) return 'UPDATED';
            if (value.includes('draft') || value.includes('created')) return 'DRAFTED';
            return 'ACTIVITY';
        };
        const performerOf = (text) => {
            const match = /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(String(text || ''));
            return match ? match[0] : 'System Generated';
        };

        res.json({
            success: true,
            document: {
                id: doc.id,
                bexsignDocId: doc.bexsign_doc_id || null,
                name: doc.document_name,
                status: doc.status,
                sender: { name: sender.name, email: sender.email, company: sender.company },
                createdAt: doc.created_at,
                sentAt: doc.sent_at,
                completedAt: doc.completed_at,
                expiresOn: requestHelpers.formatDisplayDate(requestHelpers.getRequestExpiry(doc)),
                signingOrder: doc.signing_order === 'sequential' ? 'Sequential' : 'Parallel',
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || '-'
            },
            recipients: recipients.map((r) => ({
                id: r.id,
                name: r.name,
                email: r.email,
                role: r.role_label || requestHelpers.normalizeRoleLabel(r.role),
                status: r.status,
                step: r.signing_order_index,
                sentAt: r.sent_at,
                viewedAt: r.viewed_at,
                signedAt: r.signed_at,
                declinedAt: r.declined_at,
                declineReason: r.decline_reason,
                delegatedFrom: r.delegated_from
            })),
            activities: activities.map((a) => ({
                at: a.created_at,
                action: actionOf(a.activity_description),
                performedBy: performerOf(a.activity_description),
                ip: a.ip_address,
                activity: a.activity_description
            }))
        });
    } catch (err) {
        console.error('Signing history error:', err);
        res.status(500).json({ success: false, error: 'The document history could not be loaded.' });
    }
});

// @route   GET /api/signatures/token/:token
// @desc    Get public signing session by secure token and auto-fetch saved signature
router.get('/token/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const queryEmail = (req.query.email || req.query.signerEmail || '').trim().toLowerCase();

        // Query recipient by secure token or ID or matching document + email
        let recipientQuery = `SELECT r.*, d.document_name as document_title, d.file_path, d.status as document_status 
                              FROM document_recipients r 
                              JOIN documents d ON r.document_id = d.id 
                              WHERE r.secure_token = ? OR r.id = ?`;
        let recipientParams = [token, parseInt(token) || 0];

        if (queryEmail) {
            recipientQuery += ` OR (r.document_id = ? AND LOWER(r.email) = ?)`;
            recipientParams.push(parseInt(token) || 0, queryEmail);
        }

        const [recipients] = await db.query(recipientQuery, recipientParams);

        if (!recipients || recipients.length === 0) {
            // Check if document ID was passed directly
            const docId = parseInt(token) || 1;
            const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
            const doc = docs[0] || {};
            const email = queryEmail || doc.recipient_email || 'vimal@bexcodeservices.com';
            const isCompleted = (doc.status === 'Completed');
            const existingSig = await getEmployeeSignatureByEmail(email) || await getEmployeeSignatureByEmail('vimal@bexcodeservices.com');

            const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC', [docId]);
            const fieldsList = fieldRows.map(r => {
                let parsedOpts = {};
                try { if (r.options) parsedOpts = JSON.parse(r.options); } catch (e) {}

                // Check assignment
                const fieldAssigneeEmail = (parsedOpts.assigneeEmail || '').toLowerCase();
                const fieldAssigneeName = (parsedOpts.assignee || '').toLowerCase().trim();
                let isAssignedToOther = false;

                if (fieldAssigneeEmail && email && fieldAssigneeEmail !== email.toLowerCase()) {
                    isAssignedToOther = true;
                }

                // Zoho Sign privacy: mask other recipient's values while document is in process
                const shouldMask = !isCompleted && isAssignedToOther;
                let resolvedVal = parsedOpts.value !== undefined ? parsedOpts.value : (r.field_type === 'Sign date' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
                if (shouldMask) resolvedVal = '';

                return {
                    id: r.id,
                    type: r.field_type,
                    label: r.label || r.field_type,
                    x: r.pos_x,
                    y: r.pos_y,
                    width: r.width || 150,
                    height: r.height || 40,
                    page: r.page_number || 1,
                    docIndex: parsedOpts.docIndex !== undefined ? parsedOpts.docIndex : ((r.page_number || 1) - 1),
                    value: resolvedVal,
                    required: Boolean(r.is_required),
                    isAssignedToOther,
                    assignee: parsedOpts.assignee || '',
                    assigneeEmail: parsedOpts.assigneeEmail || '',
                    ...parsedOpts,
                    ...(shouldMask ? { value: '', gridValue: null } : {})
                };
            });

            // Zoho Sign privacy: other recipients' fields are not sent while the request is in progress
            const visibleFields = isCompleted ? fieldsList : fieldsList.filter((f) => !f.isAssignedToOther);
            const fieldsByDoc = {};
            visibleFields.forEach(f => {
                const dIdx = f.docIndex !== undefined ? f.docIndex : 0;
                if (!fieldsByDoc[dIdx]) fieldsByDoc[dIdx] = [];
                fieldsByDoc[dIdx].push(f);
            });

            return res.json({
                success: true,
                recipient: {
                    id: 1,
                    name: existingSig?.employee_name || 'Vimal Chavda',
                    email: email,
                    role: 'signer',
                    status: doc.status || 'In Progress',
                    document_title: doc.document_name || 'Document 1.pdf',
                    custom_message: doc.custom_message || 'Please review and sign this agreement.',
                    file_path: doc.file_path || '/uploads/sample.pdf'
                },
                fields: visibleFields,
                fieldsByDoc,
                fieldCount: fieldsList.length,
                existingSignature: existingSig
            });
        }

        const recipient = recipients[0];
        const isCompleted = (recipient.document_status === 'Completed');
        const [fieldRows] = await db.query(
            `SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC`,
            [recipient.document_id]
        );

        const fieldsList = (fieldRows || []).map(r => {
            let parsedOpts = {};
            try { if (r.options) parsedOpts = JSON.parse(r.options); } catch (e) {}

            // Match assignment against recipient
            const fieldRecipientId = r.recipient_id || parsedOpts.assigneeId;
            const fieldAssigneeEmail = (parsedOpts.assigneeEmail || '').toLowerCase();
            const fieldAssigneeName = (parsedOpts.assignee || '').toLowerCase().trim();
            const curRecEmail = (recipient.email || '').toLowerCase();
            const curRecName = (recipient.name || '').toLowerCase().trim();

            let isAssignedToOther = false;
            if (fieldAssigneeEmail && curRecEmail && fieldAssigneeEmail !== curRecEmail) {
                isAssignedToOther = true;
            } else if (fieldRecipientId && String(fieldRecipientId) !== String(recipient.id)) {
                isAssignedToOther = true;
            } else if (fieldAssigneeName && curRecName && fieldAssigneeName !== curRecName) {
                isAssignedToOther = true;
            }

            // Zoho Sign privacy: mask other recipient's values while document is in process
            const shouldMask = !isCompleted && isAssignedToOther;
            let resolvedVal = parsedOpts.value !== undefined ? parsedOpts.value : (r.field_type === 'Sign date' ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
            if (shouldMask) resolvedVal = '';

            return {
                id: r.id,
                type: r.field_type,
                label: r.label || r.field_type,
                x: r.pos_x,
                y: r.pos_y,
                width: r.width || 150,
                height: r.height || 40,
                page: r.page_number || 1,
                docIndex: parsedOpts.docIndex !== undefined ? parsedOpts.docIndex : ((r.page_number || 1) - 1),
                value: resolvedVal,
                required: Boolean(r.is_required),
                isAssignedToOther,
                assignee: parsedOpts.assignee || 'Other Signer',
                assigneeEmail: parsedOpts.assigneeEmail || '',
                ...parsedOpts,
                ...(shouldMask ? { value: '', gridValue: null } : {})
            };
        });

        // Zoho Sign privacy: other recipients' fields are not sent while the request is in progress
        const visibleFields = isCompleted ? fieldsList : fieldsList.filter((f) => !f.isAssignedToOther);
        const fieldsByDoc = {};
        visibleFields.forEach(f => {
            const dIdx = f.docIndex !== undefined ? f.docIndex : 0;
            if (!fieldsByDoc[dIdx]) fieldsByDoc[dIdx] = [];
            fieldsByDoc[dIdx].push(f);
        });

        // Auto-fetch signature from employee_signatures by email
        const existingSig = await getEmployeeSignatureByEmail(recipient.email) || await getEmployeeSignatureByEmail('vimal@bexcodeservices.com');

        res.json({
            success: true,
            recipient,
            fields: visibleFields,
            fieldsByDoc,
            fieldCount: fieldsList.length,
            existingSignature: existingSig
        });
    } catch (err) {
        console.error('Error fetching signing token session:', err);
        res.status(500).json({ error: 'Database error fetching public signing session' });
    }
});

// @route   POST /api/signatures/save
// @desc    Save signature draft / changes inside document and sync employee_signatures
router.post('/save', async (req, res) => {
    const { documentId, token, signatureData, signerName, signerEmail, signatureStyle, status } = req.body;
    const docId = documentId || parseInt(token) || 1;
    const name = signerName || 'Vimal Chavda';
    const email = signerEmail || 'vimal@bexcodeservices.com';

    try {
        await markDocumentSigned(docId, {
            signerName: name,
            signerEmail: email,
            signatureImage: signatureData || null,
            signatureStyle: signatureStyle || 'font-signature-1',
            status: status || 'In Progress',
            ipAddress: req.ip || '223.181.69.208'
        });

        // Upsert into employee_signatures table
        if (signatureData || signatureStyle) {
            try {
                await upsertEmployeeSignature({
                    name,
                    email,
                    signatureImage: signatureData || null,
                    signatureStyle: signatureStyle || 'font-signature-1'
                });
            } catch (eSig) {
                console.warn('Upsert employee signature warning:', eSig.message);
            }
        }

        if (status) {
            try {
                await db.query('UPDATE documents SET status = ? WHERE id = ?', [status, docId]);
            } catch (e) {}
        }

        res.json({
            success: true,
            message: 'Document and signature changes saved successfully!'
        });
    } catch (err) {
        console.error('Save Signature Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/signatures/viewed
// @desc    Record that a recipient opened the signing page (Zoho Sign "Viewed" status)
router.post('/viewed', async (req, res) => {
    const docId = parseInt(req.body.documentId) || 0;
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!docId || !email) {
        return res.status(400).json({ success: false, error: 'documentId and email are required' });
    }
    try {
        const recipients = await requestHelpers.getRecipients(docId);
        const recipient = recipients.find((r) => String(r.email).toLowerCase() === email);
        if (!recipient) {
            await logFailedAccess({ req, email, source: 'signing_link', reason: 'Signing link opened with an email that is not a recipient', documentId: docId });
            return res.json({ success: false, error: 'Recipient not found' });
        }
        if (!recipient.viewed_at) {
            await db.query(
                "UPDATE document_recipients SET viewed_at = NOW(), status = IF(status IN ('pending', 'sent'), 'viewed', status) WHERE id = ?",
                [recipient.id]
            );
            await requestHelpers.logRequestEvent(docId, {
                recipientId: recipient.id,
                eventType: 'viewed',
                description: `${recipient.name} (${recipient.email}) viewed the document`,
                req
            });
            const [viewedDocs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
            if (viewedDocs[0]) {
                emitDocumentWebhook('document.viewed', viewedDocs[0], { recipient: { ...recipient, status: 'viewed' } });
                await notifyDocumentOwner(viewedDocs[0], {
                    title: `${recipient.name || recipient.email} viewed "${viewedDocs[0].document_name || 'Document'}"`,
                    message: `${recipient.email} opened the signing request.`,
                    actorEmail: recipient.email,
                    actorName: recipient.name
                });
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Viewed event error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

function decodeClientPdfs(completedPdfs) {
    if (!Array.isArray(completedPdfs)) return [];
    return completedPdfs
        .filter((item) => item && item.base64)
        .map((item, idx) => {
            try {
                const filename = item.filename || `Document_${idx + 1}.pdf`;
                return {
                    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
                    content: Buffer.from(item.base64, 'base64'),
                    contentType: 'application/pdf'
                };
            } catch (e) {
                return null;
            }
        })
        .filter(Boolean);
}

// @route   POST /api/signatures/submit
// @desc    Submit the current recipient's fields and signature. Emails any signer not yet invited,
//          or — when every signer/approver has finished — marks the request Completed and emails the signed
//          PDFs plus the certificate of completion to the sender and all recipients.
router.post('/submit', async (req, res) => {
    const { token, recipientId, documentId, signatureData, signerName, signerEmail, signatureStyle, completedPdfs } = req.body;
    const docId = parseInt(documentId || token) || 0;
    const email = String(signerEmail || '').trim();
    const style = signatureStyle || 'font-signature-1';

    if (!docId) {
        return res.status(400).json({ success: false, error: 'Document id is required.' });
    }

    try {
        await requestHelpers.ensureRequestSchema();
        const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [docId]);
        const doc = docs[0];
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Document not found.' });
        }
        const docStatus = String(doc.status || '').toLowerCase();
        if (docStatus === 'completed') {
            return res.json({ success: true, completed: true, alreadyCompleted: true, message: 'This document has already been completed.' });
        }
        if (['recalled', 'trashed', 'declined', 'expired'].includes(docStatus)) {
            return res.status(409).json({ success: false, error: `This document is ${doc.status} and can no longer be signed.` });
        }

        let recipients = await requestHelpers.getRecipients(docId);

        // Legacy single-recipient documents (no recipient rows yet): register the signer as the recipient
        if (recipients.length === 0) {
            const legacyEmail = email || doc.recipient_email;
            if (legacyEmail) {
                recipients = await requestHelpers.saveRecipients(docId, [{ email: legacyEmail, name: signerName, role: 'Needs to sign' }]);
            }
        }

        const recipient = email
            ? recipients.find((r) => String(r.email).toLowerCase() === email.toLowerCase())
            : recipients.find((r) => String(r.id) === String(recipientId));
        if (!recipient) {
            await logFailedAccess({ req, email: email || null, source: 'signing_link', reason: 'Signature submitted by an email that is not a recipient', documentId: docId });
            return res.status(403).json({ success: false, error: 'This email address is not a recipient of the document.' });
        }
        if (!requestHelpers.isSigningRole(recipient.role)) {
            return res.status(403).json({ success: false, error: 'You receive a copy of this document and do not need to sign it.' });
        }
        if (recipient.status === 'signed') {
            return res.json({ success: true, alreadySigned: true, completed: false, message: 'You have already signed this document.' });
        }

        const isSequential = doc.signing_order === 'sequential';
        const activeGroup = requestHelpers.getActiveSigningGroup(recipients, isSequential);
        if (!activeGroup.some((r) => r.id === recipient.id)) {
            return res.status(409).json({
                success: false,
                error: `It is not your turn to sign yet. Waiting for ${activeGroup.map((r) => r.name || r.email).join(', ')}.`
            });
        }

        const name = String(signerName || recipient.name || recipient.email).trim();
        const signingRecipients = recipients.filter((r) => requestHelpers.isSigningRole(r.role));

        const [ownFieldRows] = await db.query('SELECT field_type, recipient_id, options FROM document_fields WHERE document_id = ?', [docId]);
        const ownFields = ownFieldRows
            .map(requestHelpers.parseFieldRow)
            .filter((f) => requestHelpers.fieldBelongsToRecipient(f, recipient, signingRecipients));
        const needsSignature = recipient.role !== 'approver'
            && (ownFieldRows.length === 0 || ownFields.some((f) => f.type === 'Signature' || f.type === 'Initial'));
        if (needsSignature && !isUsableSignature(signatureData)) {
            return res.status(400).json({ success: false, error: 'Your signature is empty. Please draw, type or upload your signature, then finish again.' });
        }
        const submittedFields = req.body.fields || (req.body.fieldsByDoc ? Object.values(req.body.fieldsByDoc).flat() : []);
        const payload = await completeRecipientSigning({
            doc,
            docId,
            recipient,
            name,
            signatureData,
            style,
            submittedFields,
            completedPdfs,
            req
        });
        res.json(payload);
    } catch (err) {
        console.error('Submit Signature Error:', err);
        res.status(500).json({ success: false, error: 'Failed to submit signature' });
    }
});

// @route   POST /api/signatures/physical-copy
// @desc    "Print and physically sign": the recipient uploads the scanned copy they signed on paper, which
//          completes their part of the request (no electronic signature is captured)
router.post('/physical-copy', (req, res, next) => {
    physicalCopyUpload.single('signedDocument')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'The file must be 25 MB or smaller.' : err.message });
        }
        next();
    });
}, async (req, res) => {
    const { documentId, token, signerEmail, signerName } = req.body;
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'Choose the scanned copy of the signed document to upload.' });
    }
    try {
        const context = await loadSigningContext({ documentId, token, email: signerEmail, req });
        if (context.error) return res.status(context.error.status).json({ success: false, error: context.error.message });
        const { docId, doc, recipient } = context;

        const filePath = `/uploads/physical/${req.file.filename}`;
        const name = String(signerName || recipient.name || recipient.email).trim();
        const ip = requestHelpers.getRequestIp(req);
        const submittedFields = requestHelpers.parseJsonInput(req.body.fields, []) || [];

        await db.query('UPDATE document_recipients SET physical_copy_path = ? WHERE id = ?', [filePath, recipient.id]);
        await requestHelpers.logRequestEvent(docId, {
            recipientId: recipient.id,
            eventType: 'physical_copy',
            description: `${name} (${recipient.email}) uploaded a physically signed copy (${req.file.originalname})`,
            req
        });

        const result = await completeRecipientSigning({
            doc,
            docId,
            recipient,
            name,
            signatureData: null,
            style: 'physical',
            submittedFields,
            signedOnPaper: true,
            req
        });
        res.json({ ...result, physicalCopyPath: filePath, message: `Your signed copy has been uploaded. ${result.message}` });
    } catch (err) {
        console.error('Physical copy upload error:', err);
        res.status(500).json({ success: false, error: 'The signed copy could not be uploaded.' });
    }
});

module.exports = router;
