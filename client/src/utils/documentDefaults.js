/**
 * Document Content Presets and Defaults
 * Ensures that all documents in BexSign render real, professional legal text & data
 * instead of a static generic placeholder like "check the document for signature".
 */

export const DEFAULT_DOCUMENT_TEXTS = {
  employment: `STANDARD EMPLOYMENT AGREEMENT

This Employment Agreement (the "Agreement") is made and entered into by and between Bexcode Services (the "Company") and the undersigned individual (the "Employee").

1. APPOINTMENT AND SCOPE OF DUTIES
The Company agrees to employ the Employee, and the Employee agrees to faithfully perform all duties, services, and responsibilities associated with their designated role to the highest professional standards.

2. COMPENSATION AND PERFORMANCE EVALUATION
The Employee shall be entitled to compensation as specified in their formal offer schedule, payable in accordance with the Company's standard payroll cycles, subject to applicable statutory deductions and annual performance evaluations.

3. CONFIDENTIALITY AND PROPRIETARY ASSETS
The Employee acknowledges that in the course of employment, they will have access to confidential business information, proprietary source code, internal strategies, and trade secrets. The Employee covenants not to disclose or misappropriate any such materials during or following the term of employment.

4. INTELLECTUAL PROPERTY RIGHTS
All inventions, designs, source code, workflows, and documentation created or developed by the Employee in connection with their duties shall be the exclusive property of the Company from inception.

5. GOVERNING LAW AND EXECUTION
This Agreement shall be governed by and construed in accordance with the governing laws. The parties hereto have caused this Agreement to be executed by their authorized digital signatures.`,

  nda: `NON-DISCLOSURE AND MUTUAL CONFIDENTIALITY AGREEMENT

This Mutual Non-Disclosure Agreement (the "Agreement") is entered into by and between Bexcode Services and the undersigned Party to govern the disclosure and protection of proprietary information.

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" refers to any non-public technical, commercial, financial, operational, or legal information disclosed directly or indirectly by either party, whether in written, electronic, oral, or visual form.

2. NON-USE AND NON-DISCLOSURE OBLIGATIONS
The receiving party agrees to protect the Confidential Information with the same degree of care it uses for its own confidential assets (at least a reasonable degree of care) and shall not disclose such information to any third party without prior written consent.

3. DURATION OF CONFIDENTIALITY
The obligations of confidentiality shall remain binding upon the parties for a period of three (3) consecutive years from the date of final signature.

4. ELECTRONIC RECORD AND SIGNATURE RATIFICATION
The parties confirm that execution via certified electronic signature constitutes an authentic, binding, and enforceable legal signature pursuant to the Electronic Transactions Act.`,

  service: `MASTER PROFESSIONAL SERVICES AGREEMENT

This Master Professional Services Agreement (the "Agreement") sets forth the operational terms between Bexcode Services ("Service Provider") and the designated Client ("Client").

1. DELIVERABLES AND SCOPE OF WORK
Service Provider will perform the digital signature certification, audit trail logging, and enterprise document workflow services detailed in the applicable Statement of Work or document order.

2. PERFORMANCE AND COMPLIANCE STANDARDS
All electronic transactions, audit logs, and digital certificates generated under this Agreement shall adhere to industry best practices, cryptographic standards, and applicable compliance frameworks.

3. BILLING, FEES, AND INVOICING
Client agrees to settle all approved invoices within the agreed schedule through designated corporate banking channels.

4. ACCEPTANCE AND AUTHORIZATION
By applying an authorized signature below, the parties confirm that they have read, understood, and consented to all provisions of this Master Services Agreement.`,

  standard: `MUTUAL BUSINESS AGREEMENT AND CONSENT

This Document represents a formal, legally binding agreement executed between Bexcode Services and the designated Signer.

1. SCOPE AND PURPOSE
The undersigned parties hereby ratify the terms, covenants, and conditions specified within this document and agree to the cryptographic authentication protocols implemented herein.

2. ELECTRONIC SIGNATURE LEGAL VALIDITY
Both parties expressly consent to the execution of this document via BexSign electronic signatures and acknowledge that digital signatures possess the same legal force as handwritten signatures.

3. RECORD KEEPING AND AUDIT TRAIL
A comprehensive digital certificate and time-stamped audit trail will be generated upon completion, verifying signer identity, IP address, and document integrity.

4. ACKNOWLEDGMENT AND EXECUTION
Please review the contents of this document carefully before affixing your signature in the designated field below.`
};

/**
 * Returns structured document body text tailored to the document name or template
 */
export function getDefaultDocContent(docName = '', customMessage = '') {
  if (customMessage && customMessage.trim() && customMessage !== 'check the document for signature') {
    return customMessage;
  }

  const name = (docName || '').toLowerCase();
  if (name.includes('employ') || name.includes('offer') || name.includes('hr') || name.includes('job')) {
    return DEFAULT_DOCUMENT_TEXTS.employment;
  }
  if (name.includes('nda') || name.includes('confidential') || name.includes('disclosure')) {
    return DEFAULT_DOCUMENT_TEXTS.nda;
  }
  if (name.includes('service') || name.includes('customer') || name.includes('client') || name.includes('sla')) {
    return DEFAULT_DOCUMENT_TEXTS.service;
  }
  return DEFAULT_DOCUMENT_TEXTS.standard;
}
