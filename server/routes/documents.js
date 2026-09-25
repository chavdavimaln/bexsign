const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const {
  getOrCreateDocumentIdentifier,
  markDocumentSigned,
  getOrCreateEmployeeSignature,
  getEmployeeSignatureByEmail,
  upsertEmployeeSignature,
  generateEmployeeSignatureId,
  generateBexsignDocId
} = require('../utils/documentIdentifier');
const {
  sendSignatureRequestEmail,
  sendReminderEmail,
  sendDocumentRecalledEmail,
  sendDocumentCompletedEmail,
  sendDocumentCopyEmail
} = require('../utils/emailService');
const requestHelpers = require('../utils/requestHelpers');
const { emitDocumentWebhook, notifyRecipientUsers } = require('../utils/documentEvents');
const trashStore = require('../utils/trashStore');
const { authenticateUser, authenticateOptional } = require('../middleware/authMiddleware');
const { guardDocument, accessFor, visibilityCondition, canSeeDocument } = require('../utils/documentAccess');
const { isUsableSignature } = require('../utils/signatureValidation');
const { sha256, findFingerprint, recordFingerprint } = require('../utils/pdfFingerprints');
const { protectWithPassword } = require('../utils/pdfLock');
const { getCompletedPdfFiles, buildProgressCopy } = require('../utils/requestCompletion');
const { recordValidityCheck, verifyPdfBuffer } = require('../utils/validityLog');
const signingFlow = require('../utils/signingFlow');
const documentVerification = require('../utils/documentVerification');

const EMPTY_SIGNATURE_ERROR = 'The signature is empty. Draw, type or upload a signature before saving.';

// Directory rows never expose an empty image: the card and signing prefill fall back to the typed name
const withUsableSignature = (row) => (row && row.signature_image && !isUsableSignature(row.signature_image)
    ? { ...row, signature_image: null }
    : row);

// Ensure uploads directory exists inside server/
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage for uploaded documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

// Zoho Sign limits: 25 MB per document, 40 documents per request
const upload = multer({ storage: storage, limits: { fileSize: 25 * 1024 * 1024, files: 40 } });

const uploadRequestFiles = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? 'Each document must be 25 MB or smaller.'
                : (err.code === 'LIMIT_FILE_COUNT' ? 'A request can contain at most 40 documents.' : err.message);
            return res.status(400).json({ success: false, error: message });
        }
        next();
    });
};

// Ensure request columns (recipient roles, document text, signed files, settings) exist
requestHelpers.ensureRequestSchema();

const TRUE_VALUES = ['1', 'true', 1, true];

// Map "More settings" from the Send for signatures screen to documents columns (only keys that were sent)
function buildRequestSettings(body = {}) {
    const settings = {};
    if (body.noteToAll !== undefined) settings.custom_message = body.noteToAll || null;
    if (body.daysToComplete !== undefined && body.daysToComplete !== '') settings.expiration_days = parseInt(body.daysToComplete) || 15;
    if (body.reminderDays !== undefined && body.reminderDays !== '') settings.reminder_days = parseInt(body.reminderDays) || 5;
    if (body.signingMode || body.signingOrder) {
        settings.signing_order = signingFlow.describeMode(signingFlow.normalizeMode(body.signingMode || body.signingOrder)).order;
    }
    if (body.documentType !== undefined) settings.document_type = body.documentType || null;
    if (body.description !== undefined) settings.description = body.description || null;
    if (body.agreementValidUntil !== undefined) settings.validity = body.agreementValidUntil || null;
    if (body.autoReminders !== undefined) settings.auto_reminders = TRUE_VALUES.includes(body.autoReminders) ? 1 : 0;
    if (body.allowComments !== undefined) settings.allow_comments = TRUE_VALUES.includes(body.allowComments) ? 1 : 0;
    return settings;
}

/**
 * A signature is evidence: once a recipient has signed, the documents and the fields of that request are frozen.
 * Editing is done on a copy ("Edit as new"), or - when the sender deliberately restarts - by clearing every
 * signature first, so nobody can end up signed to text that changed afterwards.
 *
 * Returns { blocked: true } when the caller should be refused.
 */
async function guardSignedContent(documentId, body = {}, req = null) {
    const touchesContent = body.fields !== undefined || body.fieldsByDoc !== undefined
        || body.documents !== undefined || body.documentsMeta !== undefined;
    if (!touchesContent) return { blocked: false };

    const [[counted]] = await db.query(
        "SELECT COUNT(*) AS signed FROM document_recipients WHERE document_id = ? AND status = 'signed'",
        [documentId]
    );
    if (!Number(counted?.signed)) return { blocked: false };

    const restart = body.restartSigning === true || body.restartSigning === 'true' || body.restartSigning === '1';
    if (!restart) {
        return {
            blocked: true,
            error: 'This request already carries a signature, so its documents and fields cannot be changed. '
                + 'Use "Edit as new" to work on a copy, or restart the signing round to collect every signature again.'
        };
    }

    // Deliberate restart: the collected signatures are cleared and everyone signs the new version
    await requestHelpers.restartSigningRound(documentId);
    await requestHelpers.logRequestEvent(documentId, {
        description: 'Document edited after signing: every signature was cleared and all recipients must sign the new version',
        req
    });
    return { blocked: false, restarted: true };
}

/** Saves the sender's "verify and confirm when everyone has signed" choice in its own table. */
async function applyVerificationSetting(documentId, body = {}, req = null) {
    if (body.requireVerification === undefined) return;
    await documentVerification.saveVerificationSetting(documentId, body.requireVerification, {
        userId: req?.user?.id || null,
        req
    });
}

/** Saves the signing flow (how recipients are emailed and what they may see) in its own table. */
async function applySigningFlow(documentId, body = {}, req = null) {
    const chosen = body.signingMode || body.signingOrder;
    if (!chosen) return;
    await signingFlow.saveSigningFlow(documentId, chosen, { userId: req?.user?.id || null });
}

async function applyRequestSettings(documentId, settings) {
    const keys = Object.keys(settings);
    if (keys.length === 0) return;
    await requestHelpers.ensureRequestSchema();
    await db.query(
        `UPDATE documents SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
        [...keys.map((k) => settings[k]), documentId]
    );
}

// Who is asking: a signed-in user (their permissions apply) or a public signing link / the verify page
router.use(authenticateOptional);

// @route   GET /api/documents
// @desc    Get all documents from database with generated BexSign document IDs
router.get('/', guardDocument(), async (req, res) => {
    const { status, folder, userId } = req.query;
    try {
        let query = `
            SELECT d.*,
                   di.bexsign_doc_id,
                   di.signer_name,
                   di.signer_email,
                   di.signature_status,
                   di.signature_image,
                   di.signature_style,
                   di.signed_at,
                   -- Shown in the list: whether the completed request still waits to be verified and confirmed,
                   -- how many documents it holds, and whether it came from a self-sign flow
                   dv.status AS verification_status,
                   dv.required AS verification_required,
                   (SELECT COUNT(*) FROM document_files df WHERE df.document_id = d.id) AS file_count,
                   ss.id AS self_sign_id,
                   ss.stage AS self_sign_stage,
                   ${requestHelpers.OWNER_COLUMNS}
            FROM documents d
            LEFT JOIN document_identifiers di ON d.id = di.document_id
            LEFT JOIN document_verification dv ON dv.document_id = d.id
            LEFT JOIN self_sign_documents ss ON ss.document_id = d.id
            ${requestHelpers.OWNER_JOIN}
            WHERE 1=1
        `;
        const params = [];

        // Only the documents this user may see (own, team, all, or sent to them)
        const access = await accessFor(req);
        const visible = visibilityCondition(access);
        query += ` AND ${visible.sql}`;
        params.push(...visible.params);

        if (status && status.toLowerCase() !== 'all') {
            query += ' AND LOWER(d.status) = LOWER(?)';
            params.push(status);
        } else if (!status || status.toLowerCase() === 'all') {
            query += ' AND LOWER(COALESCE(d.status, "")) != "trashed"';
        }

        if (folder) {
            query += ' AND d.folder_name = ?';
            params.push(folder);
        }

        query += ' ORDER BY d.created_at DESC';

        const [documents] = await db.query(query, params);
        res.json({ success: true, documents });
    } catch (err) {
        console.error('Fetch Documents Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/upload or /api/documents/create
// @desc    Create or update a signing request draft: documents (multiple files), recipients and settings
router.post('/upload', guardDocument({ permission: 'documents.create' }), uploadRequestFiles, async (req, res) => {
    const {
        documentId, document_id, id,
        userId, user_id, documentName, document_name, folderName, folder_name,
        recipientEmail, recipient_email, recipientName, recipient_name,
        templateUsed, template_used, status, recipients
    } = req.body;
    const existingDocId = parseInt(documentId || document_id || id) || 0;
    const docName = String(documentName || document_name || 'New Document').trim() || 'New Document';
    const recipientList = requestHelpers.parseJsonInput(recipients, null);
    const firstRecipient = Array.isArray(recipientList) ? recipientList.find((r) => r && r.email && String(r.email).trim()) : null;
    const recipEmail = recipientEmail || recipient_email || (firstRecipient ? String(firstRecipient.email).trim() : null);
    const recipName = recipientName || recipient_name || firstRecipient?.name || undefined;
    const folder = folderName || folder_name || 'General';
    const template = templateUsed || template_used || null;
    const uId = req.authenticated ? req.user.id : (parseInt(userId || user_id) || 1);
    const docStatus = status || 'Draft';
    const metaDocs = requestHelpers.parseJsonInput(req.body.documentsMeta, null);

    const uploadedFiles = req.files || [];
    const primaryUploaded = uploadedFiles.find(f => f.fieldname === 'documentFile') || uploadedFiles[0];
    const filePath = primaryUploaded ? `/uploads/${primaryUploaded.filename}` : (req.body.file_path || '/uploads/sample.pdf');

    try {
        await requestHelpers.ensureRequestSchema();

        // Continue an existing draft (UPDATE) instead of creating duplicates; unknown ids create a new draft
        let targetId = 0;
        if (existingDocId > 0) {
            const [found] = await db.query('SELECT id FROM documents WHERE id = ?', [existingDocId]);
            if (found.length > 0) {
                if (req.authenticated && !(await canSeeDocument(await accessFor(req), existingDocId))) {
                    return res.status(403).json({ success: false, error: 'You do not have access to this document.' });
                }
                targetId = existingDocId;
            }
        }
        const isNew = targetId === 0;

        if (!isNew) {
            const guard = await guardSignedContent(targetId, req.body, req);
            if (guard.blocked) return res.status(409).json({ success: false, error: guard.error, signatureLocked: true });
        }

        if (!isNew) {
            let updateSql = 'UPDATE documents SET document_name = ?, folder_name = ?, status = ?';
            const updateParams = [docName, folder, docStatus];
            if (recipEmail) {
                updateSql += ', recipient_email = ?';
                updateParams.push(recipEmail);
            }
            if (primaryUploaded && !Array.isArray(metaDocs)) {
                updateSql += ', file_path = ?';
                updateParams.push(filePath);
            }
            updateSql += ' WHERE id = ?';
            updateParams.push(targetId);
            await db.query(updateSql, updateParams);
        } else {
            const [result] = await db.query(
                `INSERT INTO documents (user_id, document_name, file_path, folder_name, status, recipient_email, template_used)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [uId, docName, filePath, folder, docStatus, recipEmail, template]
            );
            targetId = result.insertId;
        }

        await applyRequestSettings(targetId, buildRequestSettings(req.body));
        await applySigningFlow(targetId, req.body, req);
        await applyVerificationSetting(targetId, req.body, req);

        const savedRecipients = Array.isArray(recipientList)
            ? await requestHelpers.saveRecipients(targetId, recipientList)
            : await requestHelpers.getRecipients(targetId);

        // A draft may be emptied only when the client says the user removed every document
        const allowEmptyDocuments = docStatus === 'Draft' && TRUE_VALUES.includes(req.body.documentsCleared);
        const savedFiles = Array.isArray(metaDocs)
            ? await requestHelpers.syncDocumentFiles(targetId, metaDocs, uploadedFiles, { allowEmpty: allowEmptyDocuments })
            : await requestHelpers.getDocumentFiles(targetId);

        if (savedFiles[0]?.file_path) {
            await db.query(`UPDATE documents SET file_path = ? WHERE id = ? AND status <> 'Completed'`, [savedFiles[0].file_path, targetId]);
        }

        // Automatically create record in separate document_identifiers table
        const idRecord = await getOrCreateDocumentIdentifier(targetId, {
            signerEmail: recipEmail || undefined,
            signerName: recipName,
            status: docStatus
        });

        if (isNew) {
            await requestHelpers.logRequestEvent(targetId, {
                description: `Document "${docName}" created as ${docStatus.toLowerCase()} with ID: ${idRecord.bexsign_doc_id}`,
                req
            });
        }

        const [rows] = await db.query('SELECT * FROM documents WHERE id = ?', [targetId]);

        res.status(isNew ? 201 : 200).json({
            success: true,
            message: isNew ? 'Document and BexSign ID saved successfully!' : 'Document draft updated successfully!',
            documentId: targetId,
            bexsignDocId: idRecord.bexsign_doc_id,
            document: {
                ...(rows[0] || { id: targetId, document_name: docName, status: docStatus, file_path: filePath }),
                bexsign_doc_id: idRecord.bexsign_doc_id
            },
            recipients: savedRecipients,
            files: savedFiles,
            filePath: rows[0]?.file_path || filePath
        });
    } catch (err) {
        console.error('Save Document Error:', err);
        res.status(500).json({ success: false, error: 'Database error while saving document' });
    }
});

const verifyUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

// @route   POST /api/documents/verify
// @desc    Check whether a PDF is an unchanged copy of a PDF issued by BexSign (SHA-256 fingerprint registry).
//          Any change to a file, by any application, changes its fingerprint.
router.post('/verify', guardDocument({ public: true }), (req, res, next) => {
    verifyUpload.single('document')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'The file must be 25 MB or smaller.' : err.message });
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'Choose the PDF file you want to verify.' });
    }
    try {
        const hash = sha256(req.file.buffer);
        const match = await findFingerprint(hash);
        if (!match) {
            // Log the check (modified / unknown / not a PDF) for Settings > Document Validity
            const outcome = await verifyPdfBuffer(req.file.buffer, req.file.originalname).catch(() => null);
            await recordValidityCheck({
                req,
                documentId: outcome && outcome.matchType !== 'name' ? outcome.match?.document_id || null : null,
                fileName: req.file.originalname,
                sha256: hash,
                result: outcome?.result || 'unknown',
                message: outcome?.message || 'Not recognized: no PDF issued by BexSign has this fingerprint.',
                source: 'upload'
            });
            return res.json({ success: true, verified: false, sha256: hash, fileName: req.file.originalname });
        }
        await recordValidityCheck({
            req,
            documentId: match.document_id,
            fileName: req.file.originalname,
            sha256: hash,
            result: 'valid',
            message: 'Authentic: unchanged copy of a PDF issued by BexSign.',
            source: 'upload'
        });
        const [docs] = await db.query(
            `SELECT d.id, d.document_name, d.status, d.sent_at, d.completed_at, di.bexsign_doc_id
             FROM documents d LEFT JOIN document_identifiers di ON di.document_id = d.id
             WHERE d.id = ?`,
            [match.document_id]
        );
        const doc = docs[0] || {};
        const recipients = await requestHelpers.getRecipients(match.document_id);
        res.json({
            success: true,
            verified: true,
            sha256: hash,
            fileName: req.file.originalname,
            record: {
                kind: match.kind,
                issuedFileName: match.file_name,
                issuedAt: match.created_at,
                recipientEmail: match.recipient_email,
                requestName: doc.document_name || '-',
                bexsignDocId: doc.bexsign_doc_id || '-',
                status: doc.status || '-',
                sentAt: doc.sent_at,
                completedAt: doc.completed_at,
                signers: recipients
                    .filter((r) => requestHelpers.isSigningRole(r.role))
                    .map((r) => ({ name: r.name, email: r.email, status: r.status, signedAt: r.signed_at }))
            }
        });
    } catch (err) {
        console.error('Verify document error:', err);
        res.status(500).json({ success: false, error: 'The document could not be verified.' });
    }
});

// @route   GET /api/documents/employees/signatures
// @desc    Get all employee signatures from employee_signatures table
router.get('/employees/signatures', guardDocument({ public: true }), async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM employee_signatures ORDER BY id ASC');
        res.json({ success: true, employees: rows.map(withUsableSignature) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/employees/:empId/signature
// @desc    Get or generate specific employee signature
router.get('/employees/:empId/signature', guardDocument({ public: true }), async (req, res) => {
    const { empId } = req.params;
    try {
        const employee = await getOrCreateEmployeeSignature(empId);
        res.json({ success: true, employee });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/employees/by-email/:email
// @desc    Find existing employee signature by email address (for auto-fetching)
router.get('/employees/by-email/:email', guardDocument({ public: true }), async (req, res) => {
    const { email } = req.params;
    try {
        const employee = withUsableSignature(await getEmployeeSignatureByEmail(email));
        if (employee) {
            return res.json({ success: true, employee });
        }
        res.json({ success: false, message: 'No existing signature found for this email.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/employees/signatures
// @desc    Create new employee signature entry in database
router.post('/employees/signatures', guardDocument({ permission: 'signatures.manage' }), async (req, res) => {
    const { 
        employee_id, employeeId, 
        employee_name, employeeName, 
        employee_email, employeeEmail, 
        designation, department, 
        signature_image, signatureImage, 
        signature_style, signatureStyle,
        status
    } = req.body;

    const name = employee_name || employeeName || 'New Signer';
    const email = (employee_email || employeeEmail || '').trim();
    const empId = employee_id || employeeId || `EMP${String(Math.floor(100 + Math.random() * 900))}`;
    const style = signature_style || signatureStyle || 'font-signature-1';
    const image = signature_image || signatureImage || null;

    if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
    }
    if (image && !isUsableSignature(image)) {
        return res.status(400).json({ error: EMPTY_SIGNATURE_ERROR });
    }

    try {
        const saved = await upsertEmployeeSignature({
            name,
            email,
            signatureImage: image,
            signatureStyle: style,
            empId,
            designation: designation || 'Specialist',
            department: department || 'Operations'
        });

        res.status(201).json({
            success: true,
            message: 'Employee signature registered successfully!',
            employee: saved
        });
    } catch (err) {
        console.error('Create signature error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   PUT /api/documents/employees/signatures/:id
// @desc    Update employee signature details
router.put('/employees/signatures/:id', guardDocument({ permission: 'signatures.manage', own: false }), async (req, res) => {
    const { id } = req.params;
    const { 
        employee_name, employee_email, employee_id, 
        designation, department, signature_style, signature_image, status 
    } = req.body;

    if (signature_image && !isUsableSignature(signature_image)) {
        return res.status(400).json({ error: EMPTY_SIGNATURE_ERROR });
    }

    try {
        await db.query(
            `UPDATE employee_signatures 
             SET employee_name = COALESCE(?, employee_name),
                 employee_email = COALESCE(?, employee_email),
                 employee_id = COALESCE(?, employee_id),
                 designation = COALESCE(?, designation),
                 department = COALESCE(?, department),
                 signature_style = COALESCE(?, signature_style),
                 signature_image = COALESCE(?, signature_image),
                 status = COALESCE(?, status),
                 updated_at = NOW()
             WHERE id = ?`,
            [
                employee_name || null,
                employee_email ? employee_email.trim() : null,
                employee_id || null,
                designation || null,
                department || null,
                signature_style || null,
                signature_image || null,
                status || null,
                id
            ]
        );

        const [rows] = await db.query('SELECT * FROM employee_signatures WHERE id = ?', [id]);
        res.json({
            success: true,
            message: 'Signature updated successfully!',
            employee: withUsableSignature(rows[0])
        });
    } catch (err) {
        console.error('Update signature error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   DELETE /api/documents/employees/signatures/:id
// @desc    Delete employee signature entry
router.delete('/employees/signatures/:id', guardDocument({ permission: 'signatures.manage', own: false }), async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM employee_signatures WHERE id = ?', [id]);
        res.json({ success: true, message: 'Signature entry deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/:id/identifier
// @desc    Get or generate BexSign ID from separate document_identifiers table
router.get('/:id/identifier', guardDocument({ public: true, recipientLink: true }), async (req, res) => {
    const { id } = req.params;
    try {
        const identifier = await getOrCreateDocumentIdentifier(id);
        res.json({ success: true, identifier });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/:id
// @desc    Get document details by ID joined with document_identifiers table
//          (?email=<recipient> returns only that recipient's fields while the request is in progress)
router.get('/:id', guardDocument({ public: true, recipientLink: true }), async (req, res) => {
    const { id } = req.params;
    const viewerEmail = String(req.query.email || '').trim().toLowerCase();
    try {
        await requestHelpers.ensureRequestSchema();
        const [results] = await db.query(`
            SELECT d.*,
                   di.bexsign_doc_id,
                   di.signer_name,
                   di.signer_email,
                   di.signature_status,
                   di.signature_image,
                   di.signature_style,
                   di.signed_at,
                   ${requestHelpers.OWNER_COLUMNS}
            FROM documents d
            LEFT JOIN document_identifiers di ON d.id = di.document_id
            ${requestHelpers.OWNER_JOIN}
            WHERE d.id = ?
        `, [id]);

        if (results.length === 0) {
            const fallbackId = await getOrCreateDocumentIdentifier(id);
            return res.json({
                success: true,
                document: {
                    id: parseInt(id) || 1,
                    document_name: 'Employment_Agreement_2026.pdf',
                    file_path: '/uploads/sample.pdf',
                    status: 'Draft',
                    recipient_email: 'john@example.com',
                    bexsign_doc_id: fallbackId.bexsign_doc_id
                }
            });
        }

        let doc = results[0];
        const isCompleted = String(doc.status || '').toLowerCase() === 'completed';
        if (!doc.bexsign_doc_id) {
            const idRecord = await getOrCreateDocumentIdentifier(id);
            doc.bexsign_doc_id = idRecord.bexsign_doc_id;
        }

        try {
            const files = await requestHelpers.getDocumentFiles(id);
            if (files && files.length > 0) {
                doc.files = files;
            }
        } catch (eFiles) {
            console.warn('Files query warning:', eFiles.message);
        }

        let recRows = [];
        try {
            recRows = await requestHelpers.getRecipients(id);
            if (recRows && recRows.length > 0) {
                doc.recipients = recRows.map(({ signature_image, ...r }) => r);
            } else if (doc.recipient_email) {
                // Legacy single-recipient document: flagged so editors never prefer it over real recipients
                doc.recipients = [{
                    id: 1,
                    name: doc.signer_name || 'Signer',
                    email: doc.recipient_email,
                    role: 'signer',
                    role_label: 'Needs to sign',
                    signing_order_index: 1,
                    status: 'pending',
                    isFallback: true
                }];
            } else {
                doc.recipients = [];
            }
        } catch (eRecGet) {
            console.warn('Document recipients query warning:', eRecGet.message);
            doc.recipients = [];
        }

        try {
            const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC', [id]);
            const allFields = fieldRows.map(requestHelpers.parseFieldRow);
            // Total placed fields of the request, so a signer view knows fields exist even when none are theirs
            doc.fieldCount = allFields.length;

            if (isCompleted) {
                doc.fields = allFields;
            } else if (viewerEmail) {
                // While the request is in progress a recipient receives their own fields. With "In order, showing
                // completed fields" they also receive, read-only, what the recipients before them filled in.
                const signingRecipients = recRows.filter((r) => requestHelpers.isSigningRole(r.role));
                const viewer = recRows.find((r) => String(r.email || '').trim().toLowerCase() === viewerEmail);
                const viewerFlow = await signingFlow.getSigningFlow(id, doc);
                doc.fields = allFields.reduce((list, f) => {
                    const isMine = viewer
                        ? requestHelpers.fieldBelongsToRecipient(f, viewer, signingRecipients)
                        : (() => {
                            const ownerEmail = String(f.assigneeEmail || '').trim().toLowerCase();
                            return !ownerEmail || ownerEmail === viewerEmail;
                        })();
                    if (isMine) {
                        list.push(f);
                    } else if (viewerFlow.showPreviousFields && f.signedAt) {
                        list.push({ ...f, isAssignedToOther: true, completedByOther: true, readOnly: true });
                    }
                    return list;
                }, []);
            } else if (req.query.view === 'sender') {
                // Sender view: every recipient's fields with the signatures collected so far
                doc.fields = allFields;
            } else {
                doc.fields = allFields.map(({ signatureImage, ...withoutImage }) => withoutImage);
            }
            doc.fieldsByDoc = requestHelpers.groupFieldsByDoc(doc.fields);
        } catch (eFldGet) {
            console.warn('Document fields query warning:', eFldGet.message);
        }

        try {
            doc.sender = await requestHelpers.getRequestSender(doc);
            doc.expires_on = requestHelpers.getRequestExpiry(doc);
        } catch (eSender) {}

        // How this request is sent and what each recipient may see (document_signing_flow)
        try {
            doc.signing_flow = await signingFlow.getSigningFlow(doc.id, doc);
            doc.signing_mode = doc.signing_flow.mode;
        } catch (eFlow) {}

        res.json({ success: true, document: doc });
    } catch (err) {
        const fallbackId = await getOrCreateDocumentIdentifier(id);
        res.json({
            success: true,
            document: {
                id: parseInt(id) || 1,
                document_name: 'Employment_Agreement_2026.pdf',
                file_path: '/uploads/sample.pdf',
                status: 'Draft',
                recipient_email: 'john@example.com',
                bexsign_doc_id: fallbackId.bexsign_doc_id
            }
        });
    }
});

// @route   POST /api/documents/:id/save
// @desc    Save draft: request name, status, documents, recipients and placed fields (per document)
router.post('/:id/save', guardDocument({ permission: 'documents.create' }), async (req, res) => {
    const { id } = req.params;
    const { documentTitle, document_name, status, documents, fields, fieldsOnDoc, fieldsByDoc } = req.body;
    const titleToSave = documentTitle || document_name;

    try {
        await requestHelpers.ensureRequestSchema();
        const [found] = await db.query('SELECT id, status FROM documents WHERE id = ?', [id]);
        if (found.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        const guard = await guardSignedContent(id, req.body, req);
        if (guard.blocked) return res.status(409).json({ success: false, error: guard.error, signatureLocked: true });

        if (titleToSave) {
            await db.query('UPDATE documents SET document_name = ? WHERE id = ?', [titleToSave, id]);
        }
        // A sent/completed request is never downgraded back to Draft by an editor autosave
        const currentStatus = String(found[0].status || '').toLowerCase();
        const keepsStatus = status === 'Draft' && ['in progress', 'completed'].includes(currentStatus);
        if (status && !keepsStatus) {
            await db.query('UPDATE documents SET status = ? WHERE id = ?', [status, id]);
        }
        await applyRequestSettings(id, buildRequestSettings(req.body));
        await applySigningFlow(id, req.body, req);
        await applyVerificationSetting(id, req.body, req);

        const recListSave = req.body.recipients || req.body.recipientList;
        const recipients = Array.isArray(recListSave)
            ? await requestHelpers.saveRecipients(id, recListSave)
            : await requestHelpers.getRecipients(id);

        const files = Array.isArray(documents) && documents.length > 0
            ? await requestHelpers.syncDocumentFiles(id, documents)
            : await requestHelpers.getDocumentFiles(id);

        const fieldCount = await requestHelpers.saveDocumentFields(id, { fieldsByDoc, fields: fields || fieldsOnDoc }, recipients);

        res.json({ success: true, message: 'Document updated successfully', recipients, files, fieldCount });
    } catch (err) {
        console.error('Save document error:', err);
        res.status(500).json({ success: false, error: 'Database error while saving document' });
    }
});

// @route   POST /api/documents/send/:id
// @desc    Save the request and send it. "In order": only the recipients in the first signing step are emailed now,
//          the next step follows once this one has signed. "All at once": every signer is emailed immediately.
router.post('/send/:id', guardDocument({ permission: 'documents.send' }), async (req, res) => {
    const { id } = req.params;
    const { documentName, documents, fieldsByDoc, fields, recipientEmail, recipientName } = req.body;

    try {
        await requestHelpers.ensureRequestSchema();
        const [found] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
        if (found.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        if (documentName) {
            await db.query('UPDATE documents SET document_name = ? WHERE id = ?', [documentName, id]);
        }
        await applyRequestSettings(id, buildRequestSettings(req.body));
        await applySigningFlow(id, req.body, req);
        await applyVerificationSetting(id, req.body, req);

        let recipientList = req.body.recipients || req.body.recipientList;
        if (!Array.isArray(recipientList) || recipientList.length === 0) {
            const legacyEmail = recipientEmail || found[0].recipient_email;
            recipientList = legacyEmail ? [{ email: legacyEmail, name: recipientName, role: 'Needs to sign' }] : [];
        }
        const existingRecipients = await requestHelpers.getRecipients(id);
        const recipients = existingRecipients.length > 0 && !(req.body.recipients || req.body.recipientList)
            ? existingRecipients
            : await requestHelpers.saveRecipients(id, recipientList);

        if (Array.isArray(documents) && documents.length > 0) {
            await requestHelpers.syncDocumentFiles(id, documents);
        }
        await requestHelpers.saveDocumentFields(id, { fieldsByDoc, fields }, recipients);

        const signingRecipients = recipients.filter((r) => requestHelpers.isSigningRole(r.role));
        if (signingRecipients.length === 0) {
            return res.status(400).json({ success: false, error: 'Add at least one recipient who needs to sign or approve before sending.' });
        }

        // Zoho Sign rule: every signer must have at least one field (checked when fields are used)
        const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ?', [id]);
        const placedFields = fieldRows.map(requestHelpers.parseFieldRow);
        if (placedFields.length > 0) {
            const missing = signingRecipients.filter((r) => r.role === 'signer'
                && !placedFields.some((f) => requestHelpers.fieldBelongsToRecipient(f, r, signingRecipients)));
            if (missing.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Add at least one field for ${missing.map((r) => r.name || r.email).join(', ')} before sending.`,
                    missingRecipients: missing.map((r) => r.email)
                });
            }
        }

        // A request that was sent before (in progress, completed, recalled...) starts a new signing round:
        // otherwise recipients who already signed are skipped and nobody would be emailed
        const previousStatus = String(found[0].status || '').trim().toLowerCase();
        const restarted = previousStatus !== '' && previousStatus !== 'draft';
        if (restarted) {
            await requestHelpers.restartSigningRound(id);
        }

        await db.query(
            `UPDATE documents SET status = 'In Progress', sent_at = ${restarted ? 'NOW()' : 'COALESCE(sent_at, NOW())'} WHERE id = ?`,
            [id]
        );
        const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
        const doc = docs[0];
        await getOrCreateDocumentIdentifier(id, { status: 'In Progress' });

        const roundRecipients = restarted ? await requestHelpers.getRecipients(id) : recipients;
        // In order: only the first step is emailed now, the next step goes out when this one has signed
        const flow = await signingFlow.getSigningFlow(id, doc);
        const isSequential = flow.isSequential;
        const group = requestHelpers.getActiveSigningGroup(roundRecipients, isSequential);
        if (group.length === 0) {
            return res.status(409).json({
                success: false,
                error: 'No recipient is waiting to sign this document, so no email was sent.'
            });
        }
        const results = await requestHelpers.sendSigningInvitations(doc, group, { req });
        const dispatchedEmails = results.filter((r) => r.success).map((r) => r.email);
        const failedEmails = results.filter((r) => !r.success);

        if (restarted) {
            await requestHelpers.logRequestEvent(id, {
                description: `Signing restarted for "${doc.document_name}": every recipient must sign again (previous status: ${found[0].status})`,
                req
            });
        }
        await requestHelpers.logRequestEvent(id, {
            description: `Document "${doc.document_name}" sent for signature (${flow.short}) to: ${group.map((r) => r.email).join(', ')}`,
            req
        });
        emitDocumentWebhook('document.sent', doc, { recipients: group });

        const finalRecipients = await requestHelpers.getRecipients(id);
        const signingRecipientsNow = finalRecipients.filter((r) => requestHelpers.isSigningRole(r.role));
        res.json({
            success: true,
            restarted,
            signingOrder: isSequential ? 'sequential' : 'parallel',
            signingMode: flow.mode,
            signingModeLabel: flow.label,
            message: failedEmails.length
                ? `Document sent. Email could not be delivered to: ${failedEmails.map((f) => f.email).join(', ')}`
                : `Document dispatched to: ${dispatchedEmails.join(', ')}`,
            dispatchedEmails,
            dispatched: results.filter((r) => r.success).map((r) => ({ name: r.name, email: r.email })),
            failedEmails,
            // Signers who receive the request later, in signing order
            waiting: signingRecipientsNow
                .filter((r) => !group.some((g) => g.id === r.id))
                .map((r) => ({ name: r.name, email: r.email, step: r.signing_order_index })),
            recipients: finalRecipients
        });
    } catch (err) {
        console.error('Send Error:', err);
        res.status(500).json({ success: false, error: 'Database error while sending document' });
    }
});

// @route   POST /api/documents/:id/bundle-pdf
// @desc    The request's signed documents and/or its certificate of completion merged into a single PDF,
//          optionally protected with a password. Used by "Download" on the document page.
router.post('/:id/bundle-pdf', guardDocument({ permission: 'documents.download', public: true, recipientLink: true }), async (req, res) => {
    const { id } = req.params;
    const include = String(req.body?.include || 'both').toLowerCase(); // documents | certificate | both
    const password = String(req.body?.password || '').trim();
    try {
        const [docs] = await db.query('SELECT id, document_name FROM documents WHERE id = ?', [id]);
        if (docs.length === 0) return res.status(404).json({ success: false, error: 'Document not found' });

        const bundle = await getCompletedPdfFiles(id);
        const sources = [];
        if (include !== 'certificate') {
            bundle.documents.filter((d) => d.buffer).forEach((d) => sources.push(d.buffer));
        }
        if (include !== 'documents' && bundle.certificate) sources.push(bundle.certificate);
        if (sources.length === 0) {
            return res.status(400).json({ success: false, error: 'There is nothing to download for this request yet.' });
        }

        const pdfMerge = require('../utils/pdfMerge');
        let merged = sources.length === 1 ? sources[0] : (await pdfMerge.mergeToBuffer(sources)).buffer;
        const name = `${String(docs[0].document_name || 'Document').replace(/[^\w\s.-]+/g, '').trim() || 'Document'}.pdf`;
        if (password) {
            merged = await protectWithPassword(merged, password, { Title: name.replace(/\.pdf$/i, '') });
        }
        await requestHelpers.logRequestEvent(id, { description: `Signed documents downloaded${include === 'both' ? ' with the certificate of completion' : ''}`, req });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        res.send(merged);
    } catch (err) {
        console.error('Bundle download error:', err);
        res.status(500).json({ success: false, error: 'The download could not be prepared.' });
    }
});

// @route   GET /api/documents/:id/activity
// @desc    Everything that happened to one request, for the Activity history panel: who did it, what action it
//          was, and the sentence describing it. `?format=csv` downloads the same rows.
router.get('/:id/activity', guardDocument(), async (req, res) => {
    const { id } = req.params;
    try {
        const [docs] = await db.query('SELECT id, document_name, user_id FROM documents WHERE id = ?', [id]);
        if (docs.length === 0) return res.status(404).json({ success: false, error: 'Document not found' });

        const owner = await requestHelpers.getRequestSender(docs[0]);
        const recipients = await requestHelpers.getRecipients(id);
        const byId = new Map(recipients.map((r) => [String(r.id), r]));

        const [events] = await db.query(
            'SELECT id, recipient_id, event_type, ip_address, user_agent, created_at FROM signature_events WHERE document_id = ? ORDER BY id ASC',
            [id]
        ).catch(() => [[]]);
        const [lines] = await db.query(
            'SELECT id, activity_description, ip_address, created_at FROM activity_history WHERE document_id = ? ORDER BY id ASC',
            [id]
        ).catch(() => [[]]);

        // The readable sentence carries the detail; the event row carries the action, the actor and the IP
        const ACTIONS = {
            sent: 'LINK EMAILED',
            reminded: 'REMINDER SENT',
            viewed: 'VIEWED',
            terms_agreed: 'TERMS AGREED',
            signed: 'SIGNING SUCCESS',
            declined: 'DECLINED',
            email_failed: 'EMAIL FAILED',
            recalled: 'RECALLED',
            delegated: 'REASSIGNED'
        };
        const actorFor = (description = '') => {
            const match = /\(([^)@\s]+@[^)\s]+)\)/.exec(description);
            if (match) {
                const recipient = recipients.find((r) => String(r.email).toLowerCase() === match[1].toLowerCase());
                return recipient?.name || match[1];
            }
            if (/emailed to|was sent|reminder/i.test(description)) return 'System Generated';
            return owner.name || 'BexSign';
        };
        const actionFor = (description = '') => {
            const text = description.toLowerCase();
            if (text.includes('created as draft') || text.includes('drafted')) return 'DRAFTED';
            if (text.includes('agreed to the electronic record')) return 'TERMS AGREED';
            if (text.includes('reminder')) return 'REMINDER SENT';
            if (text.includes('emailed') || text.includes('sent for signature')) return 'LINK EMAILED';
            if (text.includes('viewed')) return 'VIEWED';
            if (text.includes('declined')) return 'DECLINED';
            if (text.includes('signed') || text.includes('approved')) return 'SIGNING SUCCESS';
            if (text.includes('completed')) return 'COMPLETED';
            if (text.includes('recall')) return 'RECALLED';
            if (text.includes('restarted') || text.includes('correct')) return 'UPDATED';
            if (text.includes('download')) return 'DOWNLOADED';
            return 'UPDATED';
        };

        const rows = [
            ...lines.map((row) => ({
                at: row.created_at,
                by: actorFor(row.activity_description),
                action: actionFor(row.activity_description),
                activity: row.activity_description,
                ip: row.ip_address || null
            })),
            // Events without a matching sentence (older rows) still appear
            ...events
                .filter((event) => !lines.some((row) => Math.abs(new Date(row.created_at) - new Date(event.created_at)) < 2000))
                .map((event) => {
                    const recipient = byId.get(String(event.recipient_id));
                    return {
                        at: event.created_at,
                        by: recipient?.name || recipient?.email || owner.name || 'BexSign',
                        action: ACTIONS[event.event_type] || String(event.event_type || '').toUpperCase(),
                        activity: `${recipient ? `${recipient.name || recipient.email}: ` : ''}${String(event.event_type || '').replace(/_/g, ' ')}`,
                        ip: event.ip_address || null
                    };
                })
        ].sort((a, b) => new Date(a.at) - new Date(b.at));

        if (String(req.query.format || '').toLowerCase() === 'csv') {
            const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
            const csv = ['Time of activity,Performed by,Action,Activity,IP address']
                .concat(rows.map((row) => [requestHelpers.formatDisplayDate(row.at, true), row.by, row.action, row.activity, row.ip || ''].map(escape).join(',')))
                .join('\n');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="activity-${id}.csv"`);
            return res.send(csv);
        }
        res.json({ success: true, documentName: docs[0].document_name, total: rows.length, activity: rows });
    } catch (err) {
        console.error('Activity history error:', err);
        res.status(500).json({ success: false, error: 'The activity history could not be loaded.' });
    }
});

// @route   GET /api/documents/:id/signing-flow
// @desc    How this request is sent (order and field visibility), which step it is waiting on, and every signing
//          email it has sent so far (document_signing_flow + signing_email_dispatch)
router.get('/:id/signing-flow', guardDocument(), async (req, res) => {
    const { id } = req.params;
    try {
        const [docs] = await db.query('SELECT id, document_name, status, signing_order FROM documents WHERE id = ?', [id]);
        if (docs.length === 0) return res.status(404).json({ success: false, error: 'Document not found' });
        const flow = await signingFlow.getSigningFlow(id, docs[0]);
        const recipients = await requestHelpers.getRecipients(id);
        const group = requestHelpers.getActiveSigningGroup(recipients, flow.isSequential);
        res.json({
            success: true,
            flow,
            modes: signingFlow.SIGNING_FLOW_MODES,
            waitingOn: group.map((r) => ({ id: r.id, name: r.name, email: r.email, step: r.signing_order_index, status: r.status })),
            upNext: recipients
                .filter((r) => requestHelpers.isSigningRole(r.role)
                    && !['signed', 'declined'].includes(r.status)
                    && !group.some((g) => g.id === r.id))
                .map((r) => ({ id: r.id, name: r.name, email: r.email, step: r.signing_order_index })),
            emails: await signingFlow.getDispatchLog(id)
        });
    } catch (err) {
        console.error('Signing flow error:', err);
        res.status(500).json({ success: false, error: 'The signing flow could not be loaded.' });
    }
});

// @route   PUT /api/documents/:id/signing-flow
// @desc    Change the signing flow of a request that has not been sent yet
router.put('/:id/signing-flow', guardDocument({ permission: 'documents.send' }), async (req, res) => {
    const { id } = req.params;
    try {
        const [docs] = await db.query('SELECT id, status FROM documents WHERE id = ?', [id]);
        if (docs.length === 0) return res.status(404).json({ success: false, error: 'Document not found' });
        if (String(docs[0].status || '').toLowerCase() !== 'draft') {
            return res.status(409).json({ success: false, error: 'The signing flow can only be changed while the request is a draft.' });
        }
        const flow = await signingFlow.saveSigningFlow(id, req.body?.mode || req.body?.signingMode, { userId: req.user?.id || null });
        res.json({ success: true, flow });
    } catch (err) {
        console.error('Signing flow save error:', err);
        res.status(500).json({ success: false, error: 'The signing flow could not be saved.' });
    }
});

// @route   POST /api/documents/:id/remind
// @desc    Send reminder via SMTP to the recipients whose turn it is
router.post(['/:id/remind', '/remind/:id'], guardDocument({ permission: 'documents.send' }), async (req, res) => {
    const { id } = req.params;
    try {
        const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
        const doc = docs[0];
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const recipients = await requestHelpers.getRecipients(id);
        let group = requestHelpers.getActiveSigningGroup(recipients, doc.signing_order === 'sequential');
        if (recipients.length === 0 && doc.recipient_email) {
            group = [{ id: null, email: doc.recipient_email, name: doc.recipient_email.split('@')[0] }];
        }
        if (group.length === 0) {
            return res.json({ success: true, message: 'All recipients have already completed this document.' });
        }

        // Signers who never received the request (e.g. sent before every signer was emailed at once) get the invitation
        const notInvited = group.filter((r) => r.id && !r.sent_at);
        const results = [
            ...await requestHelpers.sendSigningInvitations(doc, notInvited, { req }),
            ...await requestHelpers.sendSigningInvitations(doc, group.filter((r) => !notInvited.includes(r)), { req, isReminder: true })
        ];
        const sent = results.filter((r) => r.success).map((r) => r.email);
        res.json({
            success: sent.length > 0,
            message: sent.length > 0 ? `Reminder email sent to ${sent.join(', ')}` : 'Reminder email could not be sent.',
            results
        });
    } catch (err) {
        console.error('Remind error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/:id/recall
// @desc    Recall a sent document with reason and dispatch recalled email to notified recipients
router.post(['/:id/recall', '/recall/:id'], guardDocument({ permission: 'documents.recall' }), async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const recallReason = reason || 'first recall';

    try {
        await db.query("UPDATE documents SET status = 'Recalled' WHERE id = ?", [id]);

        const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
        const doc = docs[0] || {};
        const docTitle = doc.document_name || 'Document';
        const sender = await requestHelpers.getRequestSender(doc);
        const recipients = await requestHelpers.getRecipients(id);

        let targets = recipients
            .filter((r) => r.sent_at || ['sent', 'viewed', 'signed'].includes(r.status))
            .map((r) => r.email);
        if (targets.length === 0 && doc.recipient_email) targets = [doc.recipient_email];

        for (const to of [...new Set(targets)]) {
            await sendDocumentRecalledEmail({
                to,
                documentName: docTitle,
                senderEmail: sender.email,
                reason: recallReason
            });
        }

        await requestHelpers.logRequestEvent(id, { description: `Document recalled. Reason: "${recallReason}"`, req });
        await notifyRecipientUsers(doc, recipients.filter((r) => targets.includes(r.email)), {
            category: 'signing',
            severity: 'warning',
            title: `"${docTitle}" was recalled`,
            message: `${sender.name} recalled this request, so it no longer needs your signature. Reason: ${recallReason}`
        });
        emitDocumentWebhook('document.recalled', doc, { reason: recallReason });

        res.json({ success: true, message: 'Document recalled successfully.' });
    } catch (err) {
        console.error('Recall error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/:id/correct
// @desc    Handle "Correct document" and "Correct & save" flow (PDF 2 p.2)
router.post('/:id/correct', guardDocument({ permission: 'documents.recall' }), async (req, res) => {
    const { id } = req.params;
    const { documentName, recipients, customMessage } = req.body;
    try {
        if (documentName) {
            await db.query('UPDATE documents SET document_name = ? WHERE id = ?', [documentName, id]);
        }
        if (customMessage) {
            await db.query('UPDATE documents SET custom_message = ? WHERE id = ?', [customMessage, id]);
        }
        // Update recipient if passed
        if (recipients && Array.isArray(recipients) && recipients[0]?.email) {
            await db.query('UPDATE documents SET recipient_email = ? WHERE id = ?', [recipients[0].email, id]);
        }

        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (?, ?, ?)`,
                [id, `Document corrections applied and saved`, req.ip || '127.0.0.1']
            );
        } catch (e) {}

        res.json({ success: true, message: 'Document correction saved successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/:id/extend
// @desc    Extend expiry date for document (PDF 2 p.3)
router.post(['/:id/extend', '/extend/:id'], guardDocument({ permission: 'documents.recall' }), async (req, res) => {
    const { id } = req.params;
    const { newExpiryDate } = req.body;
    try {
        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (?, ?, ?)`,
                [id, `Document expiry date extended to ${newExpiryDate || 'Sep 18, 2026'}`, req.ip || '127.0.0.1']
            );
        } catch (e) {}

        res.json({ success: true, message: 'Expiry date extended successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/:id/reminder-settings
// @desc    Update automatic reminder frequency (PDF 2 p.5)
router.post(['/:id/reminder-settings', '/reminder-settings/:id'], guardDocument({ permission: 'documents.send' }), async (req, res) => {
    const { id } = req.params;
    const reminderDays = req.body.reminderDays ?? req.body.reminderFrequencyDays;
    const autoReminders = req.body.autoReminders ?? req.body.autoReminder;
    try {
        await requestHelpers.ensureRequestSchema();
        if (reminderDays) {
            await db.query('UPDATE documents SET reminder_days = ? WHERE id = ?', [parseInt(reminderDays) || 5, id]);
        }
        if (autoReminders !== undefined) {
            await db.query('UPDATE documents SET auto_reminders = ? WHERE id = ?', [autoReminders ? 1 : 0, id]);
        }
        res.json({ success: true, message: 'Reminder settings updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/:id/upload-signed
// @desc    Upload physically signed document copy & mark completed (PDF 2 p.7)
router.post(['/:id/upload-signed', '/upload-signed/:id'], guardDocument({ permission: 'documents.send' }), upload.single('signedDocument'), async (req, res) => {
    const { id } = req.params;
    const { signerEmail } = req.body;
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        let updateSql = "UPDATE documents SET status = 'Completed'";
        const params = [];
        if (filePath) {
            updateSql += ", file_path = ?";
            params.push(filePath);
        }
        updateSql += " WHERE id = ?";
        params.push(id);
        await db.query(updateSql, params);

        const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
        const doc = docs[0] || {};
        const targetEmail = signerEmail || doc.recipient_email || 'vimal@bexcodeservices.com';
        const docTitle = doc.document_name || 'Document';

        // Disptach completed email
        await sendDocumentCompletedEmail({
            to: targetEmail,
            documentName: docTitle,
            senderEmail: 'manu.yadav@oladigital.health'
        });

        try {
            await db.query(
                `INSERT INTO activity_history (document_id, activity_description, ip_address)
                 VALUES (?, ?, ?)`,
                [id, `Physically signed document copy uploaded for ${targetEmail}. Status marked Completed.`, req.ip || '127.0.0.1']
            );
        } catch (e) {}

        res.json({ 
            success: true, 
            message: 'Signed document uploaded and marked Completed successfully!',
            filePath 
        });
    } catch (err) {
        console.error('Upload signed error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/:id/email-copy
// @desc    Email a copy of the document to up to three addresses (PDF 3 p.7).
//          Completed requests attach every signed PDF and the certificate of completion.
router.post('/:id/email-copy', guardDocument({ permission: 'documents.download', public: true, recipientLink: true }), async (req, res) => {
    const { id } = req.params;
    const { emails } = req.body;

    const emailList = (Array.isArray(emails) ? emails : [emails])
        .map((e) => String(e || '').trim())
        .filter(Boolean)
        .slice(0, 3);
    if (emailList.length === 0) {
        return res.status(400).json({ success: false, error: 'Please provide at least one recipient email.' });
    }

    try {
        const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
        const doc = docs[0] || {};
        const docTitle = doc.document_name || 'Document';
        const sender = await requestHelpers.getRequestSender(doc);
        const files = await requestHelpers.getDocumentFiles(id);

        // Completed requests attach the current locked signed PDFs (rebuilt first if issued with an older layout)
        const attachments = [];
        if (String(doc.status || '').toLowerCase() === 'completed' && files.length > 0) {
            const completed = await completedPdfBuffers(id);
            completed.documents.filter((d) => d.buffer).forEach((d) => attachments.push({ filename: d.name, content: d.buffer, contentType: 'application/pdf' }));
            if (attachments.length > 0 && completed.certificate) {
                attachments.push({ filename: 'Certificate of Completion.pdf', content: completed.certificate, contentType: 'application/pdf' });
            }
        }

        const results = [];
        for (const recipient of emailList) {
            const result = await sendDocumentCopyEmail({
                to: recipient,
                documentName: docTitle,
                senderEmail: sender.email,
                attachments,
                signingUrl: attachments.length > 0 ? '' : requestHelpers.buildSigningUrl(id, recipient)
            });
            results.push({ email: recipient, ...result });
        }

        const sent = results.filter((r) => r.success).map((r) => r.email);
        if (sent.length > 0) {
            await requestHelpers.logRequestEvent(id, {
                description: `Copy of document dispatched to ${sent.join(', ')}${attachments.length ? ` with ${attachments.length} PDF attachment(s)` : ''}`,
                req
            });
        }

        res.json({
            success: sent.length > 0,
            message: sent.length > 0
                ? `A copy of "${docTitle}" was emailed to ${sent.join(', ')}${attachments.length ? ` with ${attachments.length} PDF attachment(s)` : ''}.`
                : 'The email could not be sent.',
            results
        });
    } catch (err) {
        console.error('Email copy error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Name of an editable copy: "doc-2" -> "doc-2 (Copy)", then "doc-2 (Copy 2)", ... (never an existing request name)
async function nextCopySuffix(name) {
    const stem = String(name || 'Document').trim().replace(/\.pdf$/i, '').replace(/ \(Copy(?: \d+)?\)$/i, '');
    const [rows] = await db.query("SELECT document_name FROM documents WHERE LOWER(COALESCE(status, '')) <> 'trashed'");
    const taken = new Set(rows.map((r) => String(r.document_name || '').trim().replace(/\.pdf$/i, '').toLowerCase()));
    for (let n = 1; n < 1000; n++) {
        const suffix = ` (Copy${n > 1 ? ` ${n}` : ''})`;
        if (!taken.has(`${stem}${suffix}`.toLowerCase())) return suffix;
    }
    return ` (Copy ${Date.now()})`;
}

const withCopySuffix = (name, suffix) => {
    const text = String(name || 'Document').trim();
    const hasPdf = /\.pdf$/i.test(text);
    const stem = text.replace(/\.pdf$/i, '').replace(/ \(Copy(?: \d+)?\)$/i, '');
    return `${stem}${suffix}${hasPdf ? '.pdf' : ''}`;
};

// @route   POST /api/documents/:id/clone
// @desc    Edit a sent or completed request as a new draft copy. Its documents, recipients (pending again), placed
//          fields (without signatures or signer-entered values) and settings are copied; the original request and
//          its signed documents are never changed. The copy is renamed automatically ("... (Copy)").
router.post('/:id/clone', guardDocument({ permission: 'documents.create' }), async (req, res) => {
    const { id } = req.params;
    try {
        await requestHelpers.ensureRequestSchema();
        const [existing] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, error: 'Original document not found' });
        }
        const source = existing[0];
        const ownerId = req.authenticated ? req.user.id : (parseInt(req.body?.userId, 10) || source.user_id || 1);
        const suffix = await nextCopySuffix(source.document_name);
        const copyName = withCopySuffix(source.document_name, suffix);
        const sourceFiles = await requestHelpers.getDocumentFiles(id);

        const [insertRes] = await db.query(
            `INSERT INTO documents
             (user_id, document_name, file_path, folder_name, status, recipient_email, template_used, custom_message,
              signing_order, expiration_days, reminder_days, document_type, description, validity, auto_reminders, allow_comments)
             VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ownerId,
                copyName,
                sourceFiles[0]?.file_path || '/uploads/sample.pdf',
                source.folder_name,
                source.recipient_email,
                source.template_used,
                source.custom_message,
                source.signing_order,
                source.expiration_days,
                source.reminder_days,
                source.document_type,
                source.description,
                source.validity,
                source.auto_reminders,
                source.allow_comments
            ]
        );
        const newDocId = insertRes.insertId;

        // Documents (original uploads and text, not the signed PDFs)
        await requestHelpers.syncDocumentFiles(newDocId, sourceFiles.map((f) => ({
            name: withCopySuffix(f.file_name, suffix),
            filePath: f.file_path,
            documentText: f.document_text
        })));

        // Recipients keep their roles and signing steps, and start pending
        const sourceRecipients = await requestHelpers.getRecipients(id);
        const newRecipients = await requestHelpers.saveRecipients(newDocId, sourceRecipients.map((r) => ({
            email: r.email,
            name: r.name,
            role: r.role_label || r.role,
            deliveryMode: r.delivery_mode,
            privateNote: r.private_note,
            signingOrder: r.signing_order_index
        })));

        // Placed fields per document, then clear anything a signer entered in the original
        const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC', [id]);
        const sourceFields = fieldRows.map(requestHelpers.parseFieldRow);
        if (sourceFields.length > 0) {
            await requestHelpers.saveDocumentFields(newDocId, { fieldsByDoc: requestHelpers.groupFieldsByDoc(sourceFields) }, newRecipients);
        }
        await requestHelpers.restartSigningRound(newDocId);

        const sourceIdentifier = await getOrCreateDocumentIdentifier(id);
        const idRecord = await getOrCreateDocumentIdentifier(newDocId, { status: 'Draft' });
        await requestHelpers.logRequestEvent(newDocId, {
            description: `Created "${copyName}" as an editable copy of "${source.document_name}" (${sourceIdentifier?.bexsign_doc_id || `#${id}`})`,
            req
        });
        await requestHelpers.logRequestEvent(id, {
            description: `Copied to a new draft "${copyName}" for editing; this request was not changed`,
            req
        });

        res.status(201).json({
            success: true,
            message: `"${copyName}" was created as a draft copy.`,
            newDocumentId: newDocId,
            documentName: copyName,
            bexsignDocId: idRecord.bexsign_doc_id
        });
    } catch (err) {
        console.error('Clone Document Error:', err);
        res.status(500).json({ success: false, error: 'The copy could not be created.' });
    }
});

function sendPdfDownload(res, buffer, fileName, hash) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/"/g, "'")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('X-BexSign-SHA256', hash);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-BexSign-SHA256');
    res.send(buffer);
}

// Signed PDFs of a completed request (rebuilt first when missing or issued with an older layout)
const completedPdfBuffers = getCompletedPdfFiles;

// @route   GET /api/documents/:id/signed-pdf?index=<document index>[&email=<recipient>]
//          POST /api/documents/:id/signed-pdf { index, email, password } (the copy also needs the password to open)
// @desc    Download a locked PDF (flattened, encrypted, certified) of a sent request: the final signed document of a
//          completed request; while in progress, a recipient's own copy (email) or the sender's copy with every
//          signature collected so far. Drafts are not issued.
router.get('/:id/signed-pdf', guardDocument({ permission: 'documents.download', public: true, recipientLink: true }), (req, res) => serveLockedPdf(req, res, req.query));
router.post('/:id/signed-pdf', guardDocument({ permission: 'documents.download', public: true, recipientLink: true }), (req, res) => serveLockedPdf(req, res, req.body || {}));

async function serveLockedPdf(req, res, params) {
    const { id } = req.params;
    const index = Math.max(parseInt(params.index, 10) || 0, 0);
    const email = String(params.email || '').trim();
    const password = typeof params.password === 'string' ? params.password : '';
    if (password && (password.length < 4 || password.length > 64)) {
        return res.status(400).json({ success: false, error: 'The password must be 4 to 64 characters long.' });
    }
    // Sends the issued file, or a password-protected copy of it (recorded so it can be verified as well)
    const send = async (buffer, fileName, hash, kind) => {
        if (!password) return sendPdfDownload(res, buffer, fileName, hash);
        const protectedBuffer = await protectWithPassword(buffer, password, { Title: fileName.replace(/\.pdf$/i, '') });
        const protectedHash = await recordFingerprint(protectedBuffer, {
            documentId: id,
            fileIndex: index,
            kind: 'protected-copy',
            fileName,
            recipientEmail: email || null
        });
        return sendPdfDownload(res, protectedBuffer, fileName, protectedHash);
    };
    try {
        const [docs] = await db.query('SELECT id, status FROM documents WHERE id = ?', [id]);
        if (docs.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found.' });
        }
        if (String(docs[0].status || '').toLowerCase() === 'completed') {
            const { documents } = await completedPdfBuffers(id);
            const item = documents[Math.min(index, documents.length - 1)];
            if (!item || !item.buffer) {
                return res.status(404).json({ success: false, error: 'The signed document is not available.' });
            }
            return send(item.buffer, item.name, sha256(item.buffer));
        }
        const status = String(docs[0].status || '').toLowerCase();
        if (status === 'draft' || status === 'trashed') {
            return res.status(409).json({ success: false, error: 'Send the document first: drafts are downloaded from the editor.' });
        }
        const copy = await buildProgressCopy(id, { email, fileIndex: index });
        if (copy) return send(copy.buffer, copy.fileName, copy.sha256);
        res.status(404).json({ success: false, error: 'This email address is not a recipient of the document.' });
    } catch (err) {
        console.error('Signed PDF download error:', err);
        res.status(500).json({ success: false, error: 'The signed document could not be prepared.' });
    }
}

// @route   GET /api/documents/:id/certificate-pdf
// @desc    Download the locked Certificate of Completion of a completed request
router.get('/:id/certificate-pdf', guardDocument({ permission: 'documents.download', public: true, recipientLink: true }), async (req, res) => {
    const { id } = req.params;
    try {
        const [docs] = await db.query('SELECT id, status FROM documents WHERE id = ?', [id]);
        if (docs.length === 0 || String(docs[0].status || '').toLowerCase() !== 'completed') {
            return res.status(409).json({ success: false, error: 'The certificate is available once the document is completed.' });
        }
        const { certificate } = await completedPdfBuffers(id);
        sendPdfDownload(res, certificate, 'Certificate of Completion.pdf', sha256(certificate));
    } catch (err) {
        console.error('Certificate download error:', err);
        res.status(500).json({ success: false, error: 'The certificate could not be prepared.' });
    }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document (supports permanent deletion or moving to trash)
router.delete('/:id', guardDocument(), async (req, res) => {
    const { id } = req.params;
    const { permanent } = req.query;
    try {
        // Moving to the trash needs "Delete documents"; discarding an unsent draft is part of creating one
        const access = await accessFor(req);
        const [drafts] = await db.query("SELECT status FROM documents WHERE id = ?", [id]);
        const isDraft = String(drafts[0]?.status || '').toLowerCase() === 'draft';
        const discardingDraft = (permanent === 'true' || permanent === true) && isDraft;
        if (!access.can('documents.delete') && !(discardingDraft && access.can('documents.create'))) {
            return res.status(403).json({ success: false, error: 'You do not have permission for this action (Delete documents). Ask a manager to grant it.' });
        }
        if (permanent === 'true' || permanent === true) {
            // Discarding an unsent draft: removed at once, never listed in the trash
            try {
                await db.query('DELETE FROM document_identifiers WHERE document_id = ?', [id]);
            } catch (e) {}
            await db.query('DELETE FROM documents WHERE id = ?', [id]);
            await db.query("DELETE FROM trash_items WHERE item_type = 'document' AND item_id = ?", [id]).catch(() => {});
            res.json({ success: true, message: 'Document permanently deleted.' });
        } else {
            await trashStore.trashDocuments([id], req.user);
            res.json({ success: true, message: 'Document moved to trash successfully.' });
        }
    } catch (err) {
        console.error('Delete Document Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/:id/trash
// @desc    Move document to trash
router.post('/:id/trash', guardDocument({ permission: 'documents.delete' }), async (req, res) => {
    const { id } = req.params;
    try {
        await trashStore.trashDocuments([id], req.user);
        res.json({ success: true, message: 'Document moved to trash successfully.' });
    } catch (err) {
        console.error('Move Document To Trash Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/:id/versions
// @desc    Get all versions for a document (PDF 4 Page 3 Item 5)
router.get('/:id/versions', guardDocument(), async (req, res) => {
    const { id } = req.params;
    try {
        let [rows] = await db.query(
            'SELECT * FROM document_versions WHERE document_id = ? ORDER BY id DESC',
            [id]
        );

        // If no versions recorded yet, generate default version 1.0 from document data
        if (!rows || rows.length === 0) {
            const [docs] = await db.query(
                `SELECT d.*, ${requestHelpers.OWNER_COLUMNS} FROM documents d ${requestHelpers.OWNER_JOIN} WHERE d.id = ?`,
                [id]
            );
            const doc = docs && docs[0] ? docs[0] : null;

            const defaultVersion = {
                id: 1,
                document_id: parseInt(id),
                version_number: 1,
                version_label: '1.0',
                created_by: (doc && (doc.owner || doc.owner_email)) || 'BexSign',
                details: (doc && doc.status === 'Completed') 
                    ? 'Physically signed this document and uploaded a copy'
                    : 'Initial draft version and document creation',
                file_path: (doc && doc.file_path) ? doc.file_path : null,
                action_type: (doc && doc.status) ? doc.status : 'Draft',
                created_at: (doc && doc.created_at) ? doc.created_at : new Date()
            };

            // Safely auto-seed version 1.0 into table so subsequent requests are persistent
            try {
                await db.query(
                    `INSERT INTO document_versions 
                     (document_id, version_number, version_label, created_by, details, file_path, action_type, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id, 
                        1, 
                        defaultVersion.version_label, 
                        defaultVersion.created_by, 
                        defaultVersion.details, 
                        defaultVersion.file_path, 
                        defaultVersion.action_type, 
                        defaultVersion.created_at
                    ]
                );
                [rows] = await db.query(
                    'SELECT * FROM document_versions WHERE document_id = ? ORDER BY id DESC',
                    [id]
                );
            } catch (seedErr) {
                rows = [defaultVersion];
            }
        }

        res.json({ success: true, versions: rows });
    } catch (err) {
        console.error('Fetch versions error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/documents/:id/versions
// @desc    Add a new version for a document
router.post('/:id/versions', guardDocument({ permission: 'documents.create' }), async (req, res) => {
    const { id } = req.params;
    const { version_label, created_by, details, file_path, action_type } = req.body;
    try {
        const [existing] = await db.query(
            'SELECT COUNT(*) as cnt FROM document_versions WHERE document_id = ?',
            [id]
        );
        const nextNum = (existing && existing[0] ? existing[0].cnt : 0) + 1;
        const nextLabel = version_label || `${nextNum}.0`;
        let versionAuthor = created_by;
        if (!versionAuthor) {
            // Default author: the request's owner (the user who created it)
            const [ownerRows] = await db.query(
                `SELECT ${requestHelpers.OWNER_COLUMNS} FROM documents d ${requestHelpers.OWNER_JOIN} WHERE d.id = ?`,
                [id]
            );
            versionAuthor = ownerRows[0]?.owner || ownerRows[0]?.owner_email || 'BexSign';
        }

        const [result] = await db.query(
            `INSERT INTO document_versions 
             (document_id, version_number, version_label, created_by, details, file_path, action_type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id, 
                nextNum, 
                nextLabel, 
                versionAuthor,
                details || 'Updated document version', 
                file_path || null, 
                action_type || 'Updated'
            ]
        );

        res.status(201).json({
            success: true,
            versionId: result.insertId,
            version_label: nextLabel,
            message: `Version ${nextLabel} recorded successfully.`
        });
    } catch (err) {
        console.error('Insert version error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/:id/form-data
// @desc    Get filled form fields and recipient values for Form Data Modal (PDF 4 Page 3 Item 4)
router.get('/:id/form-data', guardDocument({ public: true, recipientLink: true }), async (req, res) => {
    const { id } = req.params;
    try {
        const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [id]);
        if (!docs || docs.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const doc = docs[0];

        // Fetch recipients from document_recipients if any
        let [recipients] = await db.query(
            'SELECT * FROM document_recipients WHERE document_id = ?',
            [id]
        );

        // Fetch field values if any
        const [fieldValues] = await db.query(
            `SELECT df.label, df.field_type, dfv.field_value, dfv.recipient_id, df.description
             FROM document_fields df
             LEFT JOIN document_field_values dfv ON df.id = dfv.field_id
             WHERE df.document_id = ?`,
            [id]
        );

        // Build list of recipients with their fields
        let recipientList = [];
        if (recipients && recipients.length > 0) {
            recipientList = recipients.map(r => {
                const rFields = fieldValues.filter(f => f.recipient_id === r.id);
                return {
                    id: r.id,
                    name: r.name,
                    email: r.email,
                    fields: rFields.length > 0 ? rFields.map(f => ({
                        name: f.label || f.field_type || 'Field',
                        value: f.field_value || '-'
                    })) : [
                        { name: 'Full Name', value: r.name || 'Vimal Chavda' },
                        { name: 'Email', value: r.email },
                        { name: 'Date Signed', value: doc.signed_at ? new Date(doc.signed_at).toLocaleDateString() : 'Sep 01, 2026' },
                        { name: 'Signature Status', value: doc.status || 'Completed' }
                    ]
                };
            });
        } else {
            // Default single recipient from document record
            const primaryEmail = doc.recipient_email || 'vimal@bexcodeservices.com';
            const primaryName = doc.signer_name || 'Vimal Chavda';
            recipientList = [
                {
                    id: 1,
                    name: primaryName,
                    email: primaryEmail,
                    fields: [
                        { name: 'Full Name', value: primaryName },
                        { name: 'Email Address', value: primaryEmail },
                        { name: 'Signature Date', value: doc.signed_at ? new Date(doc.signed_at).toLocaleDateString() : 'Sep 01, 2026' },
                        { name: 'Document Title', value: doc.document_name || doc.title || "This is vnc's doc" },
                        { name: 'Execution Status', value: doc.status || 'Completed' },
                        { name: 'Organization', value: 'Dcode Health' }
                    ]
                }
            ];
        }

        res.json({
            success: true,
            documentId: id,
            documentName: doc.document_name || doc.title,
            recipients: recipientList
        });
    } catch (err) {
        console.error('Form data error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/documents/:id/certificate-data
// @desc    Get complete audit trail & metadata for authentic Completion Certificate (PDF 4 Page 3)
router.get('/:id/certificate-data', guardDocument({ public: true, recipientLink: true }), async (req, res) => {
    const { id } = req.params;
    try {
        const [docs] = await db.query(
            `SELECT d.*, 
                    di.bexsign_doc_id, 
                    di.signer_name, 
                    di.signer_email, 
                    di.signature_image, 
                    di.signature_style, 
                    di.signed_at as di_signed_at,
                    ${requestHelpers.OWNER_COLUMNS}
             FROM documents d
             LEFT JOIN document_identifiers di ON d.id = di.document_id
             ${requestHelpers.OWNER_JOIN}
             WHERE d.id = ?`,
            [id]
        );

        if (!docs || docs.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const doc = docs[0];

        let history = [];
        try {
            const [rows] = await db.query(
                'SELECT * FROM activity_history WHERE document_id = ? ORDER BY id ASC',
                [id]
            );
            history = rows || [];
        } catch (histErr) {
            console.warn('Activity history query notice:', histErr.message);
        }

        // The certificate is evidence: every value comes from the request itself, and anything that never
        // happened is reported as "-" instead of being invented.
        const recipients = await requestHelpers.getRecipients(id);
        const files = await requestHelpers.getDocumentFiles(id);
        const flow = await signingFlow.getSigningFlow(id, doc);
        const [events] = await db.query(
            'SELECT recipient_id, event_type, ip_address, user_agent, created_at FROM signature_events WHERE document_id = ? ORDER BY id ASC',
            [id]
        ).catch(() => [[]]);

        // What each signer actually signed with: the signature stored on their own signature field
        const [fieldRows] = await db.query(
            "SELECT recipient_id, field_type, options FROM document_fields WHERE document_id = ? AND field_type IN ('Signature', 'Initial')",
            [id]
        ).catch(() => [[]]);
        const signedWith = new Map();
        fieldRows.forEach((row) => {
            const opts = requestHelpers.parseJsonInput(row.options, {}) || {};
            if (!opts.signedAt) return;
            const key = String(opts.signerEmail || '').toLowerCase() || `id:${row.recipient_id}`;
            if (!signedWith.has(key)) {
                signedWith.set(key, {
                    image: opts.signatureImage || '',
                    style: opts.signatureStyle || 'font-signature-1',
                    name: opts.signerName || '',
                    onPaper: Boolean(opts.signedOnPaper)
                });
            }
        });

        const stamp = (value) => (value ? requestHelpers.formatDisplayDate(value, true) : '-');
        const deviceOf = (userAgent) => {
            if (!userAgent) return '-';
            if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) return 'Mobile';
            return 'Web';
        };
        const roleOf = (r) => {
            const label = String(r.role_label || '').trim();
            if (label) return label;
            if (r.role === 'approver') return 'Approver';
            if (r.role === 'viewer') return 'Receives a copy';
            if (r.role === 'reviewer') return 'Reviewer';
            return 'Signer';
        };

        const signerRows = recipients.map((r) => {
            const mine = events.filter((e) => String(e.recipient_id) === String(r.id));
            const signedEvent = [...mine].reverse().find((e) => e.event_type === 'signed');
            const used = signedWith.get(String(r.email || '').toLowerCase()) || signedWith.get(`id:${r.id}`) || {};
            return {
                id: r.id,
                name: r.name || r.email,
                email: r.email,
                role: roleOf(r),
                // "Receives a copy": never views or signs; emailedOn is when the completed documents reached them
                isCopy: !requestHelpers.isSigningRole(r.role),
                status: r.status,
                order: r.signing_order_index || 1,
                // What this recipient actually signed with: their drawn or uploaded image, or - when they typed
                // their name - the exact style they chose, so the certificate shows the same signature they used
                signatureImage: used.image || r.signature_image || '',
                signatureStyle: used.style || 'font-signature-1',
                signedName: used.name || r.name || r.email,
                signedOnPaper: Boolean(used.onPaper || r.physical_copy_path),
                emailedOn: stamp(r.sent_at),
                viewedOn: stamp(r.viewed_at),
                termsAgreedOn: stamp(r.consent_at),
                signedOn: stamp(r.signed_at),
                declinedOn: stamp(r.declined_at),
                declineReason: r.decline_reason || '',
                accessedFrom: (r.signed_ip || signedEvent?.ip_address || '-').toString().replace(/^::ffff:/, ''),
                deviceUsed: deviceOf(r.signed_user_agent || signedEvent?.user_agent),
                authenticationType: 'Email link'
            };
        });

        const isSigningRole = (r) => ['Signer', 'Needs to sign', 'In-person signer'].includes(r.role) || /sign/i.test(r.role);
        const certificateData = {
            documentId: doc.bexsign_doc_id || '-',
            documentName: doc.document_name || doc.title || 'Document',
            owner: doc.owner || doc.owner_email || '-',
            ownerEmail: doc.owner_email || '-',
            organization: doc.owner_company || 'BexSign',
            orgAddress: doc.owner_company ? '' : '',
            sentOn: stamp(doc.sent_at || doc.created_at),
            completedOn: stamp(doc.completed_at),
            signOrder: flow.label,
            signOrderShort: flow.short,
            noOfDocuments: files.length || 1,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time',
            signersCount: signerRows.filter(isSigningRole).length,
            receivesCopyCount: signerRows.filter((r) => /copy/i.test(r.role)).length,
            approversCount: signerRows.filter((r) => /approver/i.test(r.role)).length,
            witnessesCount: 0,
            recipientReviewersCount: signerRows.filter((r) => /review/i.test(r.role)).length,
            status: doc.status || '-',
            isPhysicallySigned: signerRows.some((r) => r.signedOnPaper),
            documents: files.map((f) => ({ name: f.file_name })),
            recipients: signerRows,
            // Kept for older callers that expect a single signer
            signer: signerRows.find((r) => r.status === 'signed') || signerRows[0] || null,
            history: history || []
        };

        res.json({ success: true, certificate: certificateData });
    } catch (err) {
        console.error('Certificate data error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

