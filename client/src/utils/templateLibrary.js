/**
 * BexSign template library: ready-to-send documents in nine categories (Business, HR, Sales, Real Estate, Legal,
 * Finance, Healthcare, Education, Procurement). Each template builds plain-text document content with [bracketed]
 * placeholders; the sender edits the text before sending. Templates are examples and are not legal advice.
 */

export const TEMPLATE_CATEGORIES = [
  {
    id: 'business',
    letter: 'A',
    label: 'Business & Corporate',
    description: 'Partnerships, services, vendors, NDAs and MOUs',
    icon: 'briefcase',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    iconTone: 'bg-sky-100 text-sky-700'
  },
  {
    id: 'hr',
    letter: 'B',
    label: 'Employment & HR',
    description: 'Hiring, contracts, policies and separation',
    icon: 'users',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    iconTone: 'bg-violet-100 text-violet-700'
  },
  {
    id: 'sales',
    letter: 'C',
    label: 'Sales & Customer',
    description: 'Customer agreements, orders, subscriptions and consents',
    icon: 'cart',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    iconTone: 'bg-amber-100 text-amber-700'
  },
  {
    id: 'real-estate',
    letter: 'D',
    label: 'Real Estate',
    description: 'Rentals, leases, sales, inspections and tenants',
    icon: 'home',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    iconTone: 'bg-orange-100 text-orange-700'
  },
  {
    id: 'legal',
    letter: 'E',
    label: 'Legal',
    description: 'Consents, releases, waivers, POA and affidavits',
    icon: 'scale',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    iconTone: 'bg-slate-200 text-slate-700',
    notice: 'Legal templates are examples only and are not legal advice. Review and adapt them for the laws of the relevant jurisdiction, ideally with a qualified lawyer, before sending.'
  },
  {
    id: 'finance',
    letter: 'F',
    label: 'Finance & Accounting',
    description: 'Payments, loans, credit and approvals',
    icon: 'finance',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconTone: 'bg-emerald-100 text-emerald-700',
    notice: 'Never ask for full card or bank account numbers inside a document. These templates collect only the last 4 digits; take full payment details through a secure payment system.'
  },
  {
    id: 'healthcare',
    letter: 'G',
    label: 'Healthcare',
    description: 'Patient consents, registration and authorizations',
    icon: 'health',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    iconTone: 'bg-rose-100 text-rose-700',
    notice: 'These forms can contain sensitive health information. Make sure your use meets the privacy, security and compliance rules that apply to you (for example HIPAA, GDPR or local health-data laws): send only to the intended patient, use signer authentication, and limit who receives copies.'
  },
  {
    id: 'education',
    letter: 'H',
    label: 'Education',
    description: 'Enrollment, consents, training and policies',
    icon: 'education',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconTone: 'bg-indigo-100 text-indigo-700'
  },
  {
    id: 'procurement',
    letter: 'I',
    label: 'Procurement & Vendors',
    description: 'Vendor onboarding, suppliers and approvals',
    icon: 'truck',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
    iconTone: 'bg-teal-100 text-teal-700'
  }
];

export const TEMPLATE_KINDS = {
  agreement: 'Agreement',
  form: 'Form',
  acknowledgment: 'Acknowledgment',
  consent: 'Consent',
  authorization: 'Authorization',
  letter: 'Letter',
  approval: 'Approval',
  checklist: 'Checklist',
  declaration: 'Declaration'
};

// ---- Shared clauses ----
const GENERAL_TERMS = [
  ['ENTIRE AGREEMENT AND AMENDMENTS', 'This Agreement is the entire agreement between the parties about its subject and replaces all earlier proposals and discussions. It may be changed only in writing signed by both parties. If any provision is found unenforceable, the remaining provisions stay in full effect.'],
  ['GOVERNING LAW AND DISPUTES', 'This Agreement is governed by the laws of [Governing Jurisdiction]. The parties will first try to resolve any dispute in good faith; unresolved disputes will be decided by the courts of [Venue].'],
  ['ELECTRONIC SIGNATURES', 'The parties agree that this Agreement may be signed electronically through BexSign and in counterparts, and that each electronic signature has the same legal effect as a handwritten signature.']
];

const CONFIDENTIALITY_CLAUSE = ['CONFIDENTIALITY', 'Each party will keep the other party\'s non-public business, technical and financial information confidential, use it only to perform this Agreement, and protect it with at least reasonable care.'];

const HEALTH_PRIVACY = ['PRIVACY OF HEALTH INFORMATION', 'Health information is kept confidential and is used or disclosed only for treatment, payment and health care operations, or as permitted or required by law, as described in the [Practice Name] Notice of Privacy Practices.'];

const DECLARATION = 'I confirm that the information in this form is true, complete and accurate to the best of my knowledge. I will inform [Organization Name] promptly if any of it changes, and I agree to sign this form electronically.';

const ACKNOWLEDGE = 'By signing below, I confirm that I have read and understood this document and I agree to comply with it.';

const blank = (label) => `${label}: ______________________________`;

// ---- Templates ----
// kind: agreement (parties + numbered sections + general terms), form (field sections), other kinds (statement
// sections + closing), letter (free text). `shared` reuses another template's content under a second category.
const T = [];
const add = (category, name, spec) => T.push({ category, name, ...spec });

// A. Business & Corporate
add('business', 'General Business Agreement', {
  kind: 'agreement',
  description: 'Flexible agreement for a business arrangement between two parties',
  parties: ['Company', 'Counterparty'],
  purpose: 'The parties wish to set out the terms on which they will work together on [Project or Arrangement].',
  sections: [
    ['PURPOSE AND SCOPE', 'The parties will cooperate on [Describe the business arrangement], including the activities, deliverables and responsibilities described in this Agreement and any attached schedule.'],
    ['RESPONSIBILITIES OF THE PARTIES', 'The Company will [Company responsibilities]. The Counterparty will [Counterparty responsibilities]. Each party will perform its obligations promptly, professionally and in compliance with applicable law.'],
    ['PAYMENT', 'In consideration of the obligations in this Agreement, [Paying Party] will pay [Amount and Currency] according to the following schedule: [Payment Schedule]. Invoices are due within [30] days of receipt.'],
    ['TERM AND TERMINATION', 'This Agreement starts on the Effective Date and continues until [End Date or Completion]. Either party may terminate it with [30] days\' written notice, or immediately if the other party materially breaches it and does not cure the breach within [15] days of notice.'],
    CONFIDENTIALITY_CLAUSE
  ]
});
add('business', 'Service Agreement', {
  kind: 'agreement',
  description: 'Services, standards, fees and termination between a provider and client',
  parties: ['Service Provider', 'Client'],
  sections: [
    ['SERVICES', 'The Service Provider will provide the following services: [Description of Services] (the "Services") at [Location or Remotely], starting on [Start Date].'],
    ['SERVICE STANDARDS', 'The Services will be performed with reasonable skill and care, by suitably qualified personnel, in line with good industry practice and any service levels agreed in writing.'],
    ['FEES AND PAYMENT', 'The Client will pay [Fee Amount] [per hour, month or project]. The Service Provider will invoice [monthly], and the Client will pay each undisputed invoice within [30] days. Pre-approved expenses are reimbursed at cost.'],
    ['CLIENT RESPONSIBILITIES', 'The Client will provide timely access to information, premises, systems and decision-makers reasonably needed for the Services.'],
    ['LIMITATION OF LIABILITY', 'Except for fraud, confidentiality breaches or liability that cannot be limited by law, each party\'s total liability under this Agreement is limited to the fees paid in the [12] months before the claim.'],
    ['TERM AND TERMINATION', 'This Agreement continues until [End Date] unless terminated by either party with [30] days\' written notice. Fees for Services performed up to termination remain payable.'],
    CONFIDENTIALITY_CLAUSE
  ]
});
add('business', 'Business Partnership Agreement', {
  kind: 'agreement',
  description: 'Capital, profit sharing, management and exit terms for partners',
  parties: ['Partner A', 'Partner B'],
  purpose: 'The partners wish to carry on business together as a partnership under the name [Partnership Name].',
  sections: [
    ['NAME AND PURPOSE', 'The partnership will operate as [Partnership Name] from [Principal Place of Business] for the purpose of [Business Purpose].'],
    ['CAPITAL CONTRIBUTIONS', 'Partner A will contribute [Amount or Assets] and Partner B will contribute [Amount or Assets]. Additional contributions require the written agreement of all partners.'],
    ['PROFITS AND LOSSES', 'Net profits and losses will be shared [50% Partner A and 50% Partner B], calculated at the end of each [financial year] after expenses and agreed reserves.'],
    ['MANAGEMENT AND DECISIONS', 'Each partner has an equal say in day-to-day management. Decisions on borrowing above [Amount], admitting new partners, selling major assets or changing the business require unanimous written consent.'],
    ['BOOKS AND ACCOUNTS', 'Complete books of account will be kept at the principal place of business and will be open to inspection by each partner at any reasonable time.'],
    ['WITHDRAWAL AND DISSOLUTION', 'A partner may withdraw with [90] days\' written notice. The remaining partner may buy the withdrawing partner\'s share at fair value. On dissolution, assets are applied first to debts and then distributed according to capital accounts.']
  ]
});
add('business', 'Vendor Agreement', {
  kind: 'agreement',
  description: 'Goods or services from a vendor with pricing, delivery and quality terms',
  parties: ['Company', 'Vendor'],
  sections: [
    ['SCOPE OF SUPPLY', 'The Vendor will supply the goods and services described in [Schedule A or Description] in accordance with purchase orders issued by the Company.'],
    ['ORDERS AND DELIVERY', 'Each purchase order will state quantities, delivery dates and delivery location. The Vendor will deliver on time and notify the Company immediately of any expected delay.'],
    ['PRICING AND INVOICING', 'Prices are as set out in [Price Schedule] and are fixed for [12 months] unless agreed otherwise in writing. Invoices must reference the purchase order number and are payable within [45] days.'],
    ['QUALITY AND WARRANTIES', 'The Vendor warrants that all goods and services meet the agreed specifications, are free from defects and comply with applicable laws and standards. Non-conforming items will be replaced or re-performed at the Vendor\'s cost.'],
    ['COMPLIANCE', 'The Vendor will comply with the Company\'s supplier code of conduct, applicable anti-bribery, labour, data-protection and environmental laws, and will maintain appropriate insurance.'],
    ['TERM AND TERMINATION', 'This Agreement runs for [Term] and renews by written agreement. Either party may terminate it with [60] days\' notice or immediately for an uncured material breach.'],
    CONFIDENTIALITY_CLAUSE
  ]
});
add('business', 'Supplier Agreement', {
  kind: 'agreement',
  description: 'Ongoing supply of products with forecasts, delivery, inspection and warranties',
  parties: ['Buyer', 'Supplier'],
  sections: [
    ['SUPPLY OF PRODUCTS', 'The Supplier will manufacture and supply the products listed in [Product Schedule] (the "Products") to the Buyer on the terms of this Agreement.'],
    ['FORECASTS AND PURCHASE ORDERS', 'The Buyer may share non-binding forecasts. Only purchase orders accepted by the Supplier within [3] business days are binding.'],
    ['DELIVERY, TITLE AND RISK', 'Products are delivered [Incoterm and Location]. Title and risk pass to the Buyer on delivery.'],
    ['INSPECTION AND REJECTION', 'The Buyer may inspect Products within [10] days of delivery and reject any that do not meet the specifications. Rejected Products will be replaced or credited at the Supplier\'s cost.'],
    ['PRICING AND PAYMENT', 'Prices are set out in the Product Schedule. Payment is due [30] days from the date of a valid invoice.'],
    ['WARRANTY', 'The Supplier warrants that the Products will conform to the specifications and be free from defects in materials and workmanship for [12] months from delivery.'],
    ['TERM', 'This Agreement lasts for [Term] and may be terminated by either party with [90] days\' written notice.']
  ]
});
add('business', 'Consulting Agreement', {
  kind: 'agreement',
  description: 'Consulting services, fees, IP ownership and independence of the consultant',
  parties: ['Company', 'Consultant'],
  sections: [
    ['CONSULTING SERVICES', 'The Consultant will provide the following consulting services: [Description of Services], including the deliverables listed in any attached statement of work.'],
    ['FEES AND EXPENSES', 'The Company will pay the Consultant [Rate] per [hour, day or project], invoiced [monthly]. Reasonable pre-approved expenses will be reimbursed on submission of receipts.'],
    ['INDEPENDENT CONTRACTOR', 'The Consultant is an independent contractor and not an employee, and is responsible for their own taxes, insurance and equipment. The Consultant has no authority to bind the Company.'],
    ['INTELLECTUAL PROPERTY', 'All work product created for the Company under this Agreement belongs to the Company upon payment. The Consultant keeps ownership of pre-existing tools and know-how and grants the Company a licence to use them as part of the deliverables.'],
    CONFIDENTIALITY_CLAUSE,
    ['TERM AND TERMINATION', 'This Agreement starts on [Start Date] and ends on [End Date] unless terminated earlier by either party with [14] days\' written notice.']
  ]
});
add('business', 'Professional Services Agreement', {
  kind: 'agreement',
  description: 'Professional services with deliverables, acceptance and liability terms',
  parties: ['Client', 'Service Provider'],
  sections: [
    ['SCOPE OF SERVICES', 'The Service Provider will perform the professional services described in [Scope Description] (the "Services") and deliver the deliverables listed there.'],
    ['PERSONNEL AND STANDARD OF CARE', 'The Services will be performed by qualified personnel with the degree of skill and care normally exercised by professionals in the same field.'],
    ['FEES AND INVOICING', 'The Client will pay [Fees] as set out in [Fee Schedule]. Invoices are payable within [30] days; late amounts may bear interest at [1%] per month.'],
    ['DELIVERABLES AND ACCEPTANCE', 'The Client will review each deliverable within [10] business days and either accept it or describe any non-conformity in writing. Deliverables not rejected in that time are deemed accepted.'],
    ['INTELLECTUAL PROPERTY', 'On full payment, the Client owns the final deliverables. The Service Provider keeps its pre-existing materials and methods.'],
    ['LIMITATION OF LIABILITY', 'Neither party is liable for indirect or consequential losses. Each party\'s total liability is limited to the fees paid under this Agreement.'],
    CONFIDENTIALITY_CLAUSE
  ]
});
add('business', 'Master Service Agreement', {
  kind: 'agreement',
  description: 'Framework terms for ongoing work ordered through statements of work',
  parties: ['Customer', 'Provider'],
  sections: [
    ['STRUCTURE', 'This Master Service Agreement sets the general terms for services the Provider performs for the Customer. Each project will be described in a Statement of Work ("SOW") signed by both parties. If an SOW conflicts with this Agreement, this Agreement prevails unless the SOW expressly says otherwise.'],
    ['CHANGE ORDERS', 'Changes to the scope, schedule or fees of an SOW must be agreed in a written change order signed by both parties.'],
    ['FEES AND INVOICING', 'Fees are stated in each SOW. Unless the SOW says otherwise, the Provider invoices monthly and the Customer pays within [30] days.'],
    ['WARRANTIES', 'The Provider warrants that the services will be performed in a professional and workmanlike manner and will materially conform to the applicable SOW.'],
    ['INDEMNIFICATION', 'Each party will defend and indemnify the other against third-party claims arising from its gross negligence, wilful misconduct or breach of law.'],
    ['LIMITATION OF LIABILITY', 'Neither party is liable for indirect, special or consequential damages. Each party\'s total liability for each SOW is limited to the fees paid under that SOW in the previous [12] months.'],
    ['TERM AND TERMINATION', 'This Agreement lasts for [Term] and continues to apply to any SOW still in progress. Either party may terminate with [60] days\' notice.'],
    CONFIDENTIALITY_CLAUSE
  ]
});
add('business', 'Statement of Work (SOW)', {
  kind: 'agreement',
  description: 'Project scope, deliverables, milestones, fees and acceptance criteria',
  parties: ['Customer', 'Provider'],
  intro: 'This Statement of Work ("SOW") is entered into on [Effective Date] under the [Master Service Agreement] dated [MSA Date] between [Customer Name] (the "Customer") and [Provider Name] (the "Provider").',
  sections: [
    ['PROJECT OVERVIEW', '[Short description of the project, its objectives and expected business outcome.]'],
    ['SCOPE OF WORK', 'In scope: [List of activities].\nOut of scope: [List of exclusions].'],
    ['DELIVERABLES AND MILESTONES', 'Milestone 1: [Deliverable] - due [Date]\nMilestone 2: [Deliverable] - due [Date]\nMilestone 3: [Deliverable] - due [Date]'],
    ['FEES AND PAYMENT SCHEDULE', 'Total fees: [Amount and Currency], payable as follows: [Percentage] on signature, [Percentage] on Milestone 2 and [Percentage] on final acceptance.'],
    ['ACCEPTANCE CRITERIA', 'Each deliverable is accepted when it meets the following criteria: [Acceptance Criteria]. The Customer will confirm acceptance within [5] business days of delivery.'],
    ['ASSUMPTIONS AND DEPENDENCIES', '[Assumptions, customer dependencies and resources the Customer will provide.]'],
    ['PROJECT CONTACTS', 'Customer contact: [Name, Email]\nProvider contact: [Name, Email]']
  ],
  noGeneral: true,
  closing: 'This SOW is governed by the Master Service Agreement. By signing below, the parties agree to this SOW.'
});
add('business', 'Non-Disclosure Agreement (NDA)', {
  id: 'nda',
  kind: 'agreement',
  description: 'Mutual protection of confidential information shared between two parties',
  parties: ['First Party', 'Second Party'],
  purpose: 'The parties wish to exchange confidential information to evaluate or carry out [Purpose] (the "Purpose").',
  sections: [
    ['CONFIDENTIAL INFORMATION', '"Confidential Information" means all non-public business, technical, financial, customer and product information disclosed by one party (the "Discloser") to the other (the "Recipient"), in any form, that is marked confidential or would reasonably be understood to be confidential.'],
    ['OBLIGATIONS OF THE RECIPIENT', 'The Recipient will use Confidential Information only for the Purpose, will not disclose it to anyone except employees and advisers who need to know it and are bound by similar confidentiality duties, and will protect it with at least reasonable care.'],
    ['EXCLUSIONS', 'These obligations do not apply to information that is or becomes public through no fault of the Recipient, was already lawfully known to the Recipient, is independently developed, or is received from a third party without a duty of confidentiality. Disclosure required by law is allowed after prompt notice to the Discloser where lawful.'],
    ['TERM', 'This Agreement applies to disclosures made during [2] years from the Effective Date, and the confidentiality obligations last for [3] years after each disclosure (trade secrets for as long as they remain trade secrets).'],
    ['RETURN OF INFORMATION', 'On request, the Recipient will return or destroy all Confidential Information and confirm this in writing.'],
    ['REMEDIES', 'Unauthorised disclosure may cause irreparable harm, and the Discloser may seek injunctive relief in addition to any other remedy.']
  ]
});
add('business', 'Confidentiality Agreement', {
  id: 'confidentiality',
  kind: 'agreement',
  description: 'One-way duty to keep a company\'s information confidential',
  parties: ['Company', 'Recipient'],
  sections: [
    ['CONFIDENTIAL INFORMATION', 'Confidential information includes all business plans, financial data, customer lists, pricing, technology, software, processes and other non-public information of the Company that the Recipient receives or accesses.'],
    ['DUTY OF CONFIDENTIALITY', 'The Recipient will keep the confidential information strictly confidential, use it only for [Permitted Purpose], and not copy, share or publish it without the Company\'s prior written consent.'],
    ['PERMITTED DISCLOSURES', 'The Recipient may disclose confidential information only when required by law or court order, after giving the Company prompt notice where lawful and disclosing no more than required.'],
    ['DURATION', 'These obligations continue during the relationship and for [5] years after it ends.'],
    ['RETURN OR DESTRUCTION', 'When the relationship ends or on request, the Recipient will return or securely destroy all confidential information and copies.']
  ]
});
add('business', 'Memorandum of Understanding (MOU)', {
  kind: 'agreement',
  description: 'Non-binding outline of cooperation, roles and next steps',
  parties: ['First Party', 'Second Party'],
  intro: 'This Memorandum of Understanding ("MOU") is made on [Date] between [First Party Name] and [Second Party Name] (together, the "Parties").',
  sections: [
    ['PURPOSE', 'The Parties intend to cooperate on [Purpose of Cooperation] and record their shared understanding in this MOU.'],
    ['SCOPE OF COOPERATION', 'The Parties expect to work together on the following activities: [Activities].'],
    ['ROLES AND RESPONSIBILITIES', 'The First Party will [Responsibilities]. The Second Party will [Responsibilities].'],
    ['COSTS', 'Each Party bears its own costs unless the Parties agree otherwise in writing.'],
    ['NON-BINDING NATURE', 'This MOU is a statement of intent and does not create legally binding obligations, except for the confidentiality commitment below. Binding terms will be set out in a separate definitive agreement.'],
    CONFIDENTIALITY_CLAUSE,
    ['DURATION', 'This MOU takes effect on signature and remains in place for [12] months unless replaced by a definitive agreement or ended by either Party with written notice.']
  ],
  noGeneral: true,
  closing: 'Signed electronically by the authorised representatives of the Parties.'
});

// B. Employment & HR
add('hr', 'Employment Agreement', {
  kind: 'agreement',
  description: 'Role, pay, hours, leave, confidentiality and termination for a new employee',
  parties: ['Employer', 'Employee'],
  sections: [
    ['POSITION AND DUTIES', 'The Employer employs the Employee as [Job Title] in the [Department] department, reporting to [Manager Title]. The Employee will perform the duties of the role and other reasonable duties assigned.'],
    ['START DATE AND PROBATION', 'Employment starts on [Start Date]. The first [3] months are a probationary period, during which either party may end employment with [1] week\'s notice.'],
    ['COMPENSATION AND BENEFITS', 'The Employee will receive a gross salary of [Amount] per [year or month], paid [monthly] in arrears, less applicable deductions. The Employee is eligible for the benefits described in the Employer\'s benefits policy.'],
    ['WORKING HOURS AND LEAVE', 'Normal working hours are [Hours] per week, [Days and Times]. The Employee is entitled to [Number] days of paid annual leave per year in addition to public holidays.'],
    ['CONFIDENTIALITY AND INTELLECTUAL PROPERTY', 'The Employee will keep the Employer\'s confidential information secret during and after employment. All work created in the course of employment belongs to the Employer.'],
    ['TERMINATION AND NOTICE', 'After probation, either party may end employment with [1 month\'s] written notice. The Employer may terminate immediately for gross misconduct.']
  ]
});
add('hr', 'Offer Letter', {
  kind: 'letter',
  description: 'Formal job offer with position, start date, pay and acceptance',
  parties: ['Employer', 'Candidate'],
  text: `OFFER LETTER

[Date]

Dear [Candidate Name],

We are pleased to offer you the position of [Job Title] at [Company Name], reporting to [Manager Name]. We were impressed by your experience and believe you will be a valuable addition to our team.

1. POSITION AND START DATE
Your employment will begin on [Start Date] at [Work Location or Remote]. This is a [full-time or part-time] position of [Hours] hours per week.

2. COMPENSATION
Your starting salary will be [Amount] per [year or month], paid [monthly], less applicable taxes and deductions. You will also be eligible for [Bonus or Incentive Details].

3. BENEFITS
You will be eligible for [Health Insurance, Retirement Plan, Paid Leave and other benefits] in line with company policy.

4. CONDITIONS OF THE OFFER
This offer depends on [satisfactory reference checks, background verification and proof of eligibility to work] and on signing our standard employment agreement and confidentiality agreement.

5. ACCEPTANCE
Please confirm your acceptance by signing this letter by [Offer Expiry Date]. We look forward to welcoming you to [Company Name].

Sincerely,
[Hiring Manager Name]
[Title], [Company Name]

ACCEPTANCE
I accept this offer of employment on the terms described above.`
});
add('hr', 'Employee Contract', {
  kind: 'agreement',
  description: 'Fixed-term or permanent contract of employment with key terms',
  parties: ['Employer', 'Employee'],
  sections: [
    ['CONTRACT TYPE AND TERM', 'This is a [permanent or fixed-term] contract starting on [Start Date][ and ending on End Date].'],
    ['JOB TITLE AND DUTIES', 'The Employee is employed as [Job Title]. A job description is attached and may be updated reasonably by the Employer.'],
    ['REMUNERATION', 'The Employee will be paid [Amount] per [period] by bank transfer on [Pay Day], less statutory deductions. Overtime is [paid at Rate or not paid].'],
    ['PLACE AND HOURS OF WORK', 'The place of work is [Location]. Working hours are [Hours], with a [Length] unpaid break each day.'],
    ['LEAVE AND SICKNESS', 'The Employee is entitled to [Number] days of annual leave. Sickness absence must be reported by [Time] on the first day and is paid in line with the sick-pay policy.'],
    ['CODE OF CONDUCT', 'The Employee will follow the Employer\'s policies, including the code of conduct, IT and data-protection policies, as updated from time to time.'],
    ['TERMINATION', 'Either party may end this contract with [Notice Period] written notice, subject to any longer statutory notice.']
  ]
});
add('hr', 'Independent Contractor Agreement', {
  kind: 'agreement',
  description: 'Services by a self-employed contractor, payment and contractor status',
  parties: ['Company', 'Contractor'],
  sections: [
    ['SERVICES', 'The Contractor will provide the following services: [Services], in accordance with the timelines agreed with the Company.'],
    ['PAYMENT', 'The Company will pay [Rate or Fixed Fee] on receipt of a valid invoice. Invoices are payable within [30] days.'],
    ['CONTRACTOR STATUS', 'The Contractor is self-employed and controls how the services are performed. The Contractor is responsible for their own taxes, social contributions, insurance and licences and is not entitled to employee benefits.'],
    ['EQUIPMENT AND EXPENSES', 'The Contractor provides their own equipment. Expenses are reimbursed only if approved in writing in advance.'],
    ['INTELLECTUAL PROPERTY', 'Work product created for the Company is assigned to the Company on payment.'],
    CONFIDENTIALITY_CLAUSE,
    ['TERM AND TERMINATION', 'This Agreement runs from [Start Date] to [End Date] and may be terminated by either party with [14] days\' written notice.']
  ]
});
add('hr', 'Freelancer Agreement', {
  kind: 'agreement',
  description: 'Project work by a freelancer with milestones, revisions and ownership',
  parties: ['Client', 'Freelancer'],
  sections: [
    ['PROJECT AND DELIVERABLES', 'The Freelancer will complete [Project Description] and deliver: [Deliverables].'],
    ['FEES AND MILESTONES', 'The total fee is [Amount], paid as follows: [Deposit Percentage] before work starts and the balance on delivery of the final files.'],
    ['REVISIONS', 'The fee includes [2] rounds of revisions. Further changes are charged at [Hourly Rate].'],
    ['DEADLINES', 'Draft delivery: [Date]. Final delivery: [Date]. Deadlines move if the Client provides feedback or materials late.'],
    ['OWNERSHIP AND PORTFOLIO USE', 'On full payment, the Client owns the final deliverables. The Freelancer may show the work in their portfolio unless the Client objects in writing.'],
    ['CANCELLATION', 'If the Client cancels the project, fees for work completed up to cancellation are payable and the deposit is non-refundable.']
  ]
});
add('hr', 'Internship Agreement', {
  id: 'internship',
  kind: 'agreement',
  description: 'Internship period, learning objectives, supervision and stipend',
  parties: ['Company', 'Intern'],
  sections: [
    ['INTERNSHIP PERIOD', 'The internship runs from [Start Date] to [End Date] at [Location or Remote], for [Hours] hours per week.'],
    ['LEARNING OBJECTIVES AND DUTIES', 'The internship is designed to give practical experience in [Field]. The Intern will assist with [Tasks] under supervision.'],
    ['SUPERVISION', '[Supervisor Name, Title] will supervise the Intern, provide regular feedback and complete any evaluation required by the Intern\'s institution.'],
    ['STIPEND', 'The Intern will receive [Stipend Amount or "no stipend"] per [month], paid [Payment Method].'],
    CONFIDENTIALITY_CLAUSE,
    ['CONDUCT AND TERMINATION', 'The Intern will follow company policies. Either party may end the internship early with [1] week\'s written notice.']
  ]
});
add('hr', 'Employee Confidentiality Agreement', {
  kind: 'agreement',
  description: 'Employee duty to protect company information during and after employment',
  parties: ['Company', 'Employee'],
  sections: [
    ['CONFIDENTIAL INFORMATION', 'Confidential information includes trade secrets, customer and supplier data, pricing, financial results, business plans, source code, personnel data and any other non-public information of the Company.'],
    ['OBLIGATIONS DURING EMPLOYMENT', 'The Employee will access and use confidential information only as needed for their job and will follow the Company\'s information-security policies.'],
    ['OBLIGATIONS AFTER EMPLOYMENT', 'After employment ends, the Employee will not use or disclose any confidential information. This obligation continues for as long as the information remains confidential.'],
    ['RETURN OF PROPERTY', 'On leaving, the Employee will return all Company devices, documents and data and delete any copies from personal devices and accounts.'],
    ['REMEDIES', 'A breach may result in disciplinary action, termination and legal proceedings, including injunctive relief.']
  ]
});
add('hr', 'Employee NDA', {
  kind: 'agreement',
  description: 'Non-disclosure agreement signed by employees for sensitive work',
  parties: ['Company', 'Employee'],
  sections: [
    ['NON-DISCLOSURE', 'The Employee will not disclose the Company\'s confidential information to any person outside the Company without prior written approval.'],
    ['PERMITTED USE', 'Confidential information may be used only to perform the Employee\'s duties for the Company.'],
    ['COMPELLED DISCLOSURE', 'If the Employee is legally required to disclose confidential information, they will notify the Company promptly (where lawful) so that the Company may seek protection. Nothing in this Agreement prevents reporting possible violations of law to a government authority.'],
    ['DURATION', 'These obligations apply during employment and for [3] years after it ends, and indefinitely for trade secrets.'],
    ['RETURN OF INFORMATION', 'All confidential materials remain Company property and must be returned on request or when employment ends.']
  ]
});
add('hr', 'Remote Work Agreement', {
  kind: 'agreement',
  description: 'Rules for working from home: schedule, equipment, security and expenses',
  parties: ['Employer', 'Employee'],
  sections: [
    ['REMOTE WORK ARRANGEMENT', 'The Employee may work remotely from [Remote Location] on [Days] starting [Start Date]. All other terms of employment remain unchanged.'],
    ['AVAILABILITY AND COMMUNICATION', 'The Employee will be available during core hours of [Core Hours], respond to messages promptly and attend scheduled meetings by video.'],
    ['WORKSPACE AND EQUIPMENT', 'The Employee will maintain a safe, quiet workspace. The Employer provides [Laptop, Monitor and other equipment], which remains Employer property.'],
    ['DATA SECURITY', 'The Employee will use a secure network and VPN, lock devices when unattended, keep work data off personal devices and report any security incident immediately.'],
    ['EXPENSES', 'The Employer will reimburse [Internet or other approved expenses] up to [Amount] per month on submission of receipts.'],
    ['REVIEW AND REVOCATION', 'This arrangement will be reviewed every [6] months and may be changed or ended by the Employer with [2] weeks\' notice.']
  ]
});
add('hr', 'Company Policy Acknowledgment', {
  kind: 'acknowledgment',
  description: 'Employee confirms receipt and understanding of a company policy',
  intro: 'Employee name: [Employee Name]\nEmployee ID: [Employee ID]\nDepartment: [Department]\nPolicy: [Policy Name], version [Version], effective [Date]',
  sections: [
    ['RECEIPT OF POLICY', 'I confirm that I have received and read the [Policy Name] of [Company Name].'],
    ['UNDERSTANDING', 'I understand the policy and have had the opportunity to ask questions about it.'],
    ['COMPLIANCE', 'I agree to comply with the policy and understand that breaching it may lead to disciplinary action, up to and including termination of employment.'],
    ['UPDATES', 'I understand that the Company may update the policy and that I will be informed of material changes.']
  ],
  closing: ACKNOWLEDGE
});
add('hr', 'Employee Handbook Acknowledgment', {
  kind: 'acknowledgment',
  description: 'Employee confirms receipt of the employee handbook',
  intro: 'Employee name: [Employee Name]\nJob title: [Job Title]\nHandbook version: [Version or Date]',
  sections: [
    ['RECEIPT OF HANDBOOK', 'I acknowledge that I have received a copy of, or electronic access to, the [Company Name] Employee Handbook.'],
    ['RESPONSIBILITY TO READ', 'I understand that it is my responsibility to read the handbook and follow the policies, procedures and standards of conduct it describes.'],
    ['NOT A CONTRACT', 'I understand that the handbook is a guide and does not create a contract of employment, and that the Company may revise it at any time.'],
    ['QUESTIONS', 'If I have questions about the handbook, I will ask my manager or the HR department.']
  ],
  closing: ACKNOWLEDGE
});
add('hr', 'Termination / Separation Agreement', {
  kind: 'agreement',
  description: 'End of employment with final pay, severance, release and return of property',
  parties: ['Employer', 'Employee'],
  sections: [
    ['SEPARATION DATE', 'The Employee\'s employment will end on [Separation Date] (the "Separation Date").'],
    ['FINAL PAY AND BENEFITS', 'The Employer will pay all salary and accrued unused leave up to the Separation Date in the next regular payroll. Benefits end on [Benefits End Date], subject to any continuation rights under law.'],
    ['SEVERANCE', 'Provided the Employee signs and does not revoke this Agreement, the Employer will pay severance of [Amount], less applicable deductions, within [14] days of the Agreement becoming effective.'],
    ['RETURN OF PROPERTY', 'By the Separation Date, the Employee will return all Company property, including devices, access cards and documents.'],
    ['RELEASE OF CLAIMS', 'In exchange for the severance, the Employee releases the Employer from all claims related to the employment and its termination, to the extent permitted by law.'],
    ['CONFIDENTIALITY AND NON-DISPARAGEMENT', 'Both parties will keep the terms of this Agreement confidential and will not make disparaging statements about each other.'],
    ['REVIEW PERIOD', 'The Employee has [21] days to consider this Agreement, is advised to consult a lawyer, and may revoke it within [7] days after signing where the law provides such a right.']
  ]
});
add('hr', 'Salary / Compensation Agreement', {
  kind: 'agreement',
  description: 'Base salary, variable pay and payment schedule for an employee',
  parties: ['Employer', 'Employee'],
  sections: [
    ['BASE SALARY', 'Effective [Effective Date], the Employee\'s base salary is [Amount] per [year or month].'],
    ['VARIABLE PAY', 'The Employee is eligible for [bonus, commission or incentive] of up to [Amount or Percentage], based on [Performance Criteria], at the Employer\'s discretion.'],
    ['PAYMENT SCHEDULE', 'Salary is paid [monthly] on [Pay Day] by bank transfer. Variable pay is paid within [30] days after the end of the performance period.'],
    ['DEDUCTIONS', 'All payments are subject to applicable taxes, social contributions and authorised deductions.'],
    ['REVIEW', 'Compensation will be reviewed [annually]. Any change will be confirmed in writing.'],
    ['CONFIDENTIALITY', 'The Employee is asked to treat the details of this Agreement as confidential, to the extent permitted by law.']
  ]
});
add('hr', 'Joining Form', {
  kind: 'form',
  description: 'New-joiner details collected on the first day',
  intro: 'Please complete this form before your first day at [Company Name]. Personal data is used only for employment administration.',
  fields: [
    ['PERSONAL DETAILS', ['Full name', 'Date of birth', 'Gender (optional)', 'Nationality', 'Government ID type and number (last 4 digits)']],
    ['CONTACT DETAILS', ['Current address', 'Permanent address', 'Mobile number', 'Personal email']],
    ['JOB DETAILS', ['Job title', 'Department', 'Reporting manager', 'Date of joining', 'Work location']],
    ['EMERGENCY CONTACT', ['Name', 'Relationship', 'Phone number']],
    ['PAYROLL DETAILS', ['Bank name', 'Account holder name', 'Account number (last 4 digits only; full details are collected securely by payroll)']],
    ['DOCUMENTS SUBMITTED', ['Photo ID (yes or no)', 'Address proof (yes or no)', 'Education certificates (yes or no)', 'Previous employment letters (yes or no)']]
  ]
});
add('hr', 'Employee Information Form', {
  kind: 'form',
  description: 'Personal, contact, emergency and employment information of an employee',
  intro: 'Please keep your information with [Company Name] up to date by completing this form.',
  fields: [
    ['PERSONAL INFORMATION', ['Full name', 'Preferred name', 'Date of birth', 'Employee ID']],
    ['CONTACT INFORMATION', ['Home address', 'Mobile number', 'Personal email']],
    ['EMERGENCY CONTACT', ['Name', 'Relationship', 'Phone number', 'Alternate phone number']],
    ['EMPLOYMENT INFORMATION', ['Job title', 'Department', 'Manager', 'Start date', 'Employment type']],
    ['EDUCATION AND SKILLS', ['Highest qualification', 'Institution', 'Year of completion', 'Languages spoken']]
  ]
});

// C. Sales & Customer
add('sales', 'Customer Agreement', {
  kind: 'agreement',
  description: 'Terms for supplying products or services to a customer',
  parties: ['Company', 'Customer'],
  sections: [
    ['PRODUCTS AND SERVICES', 'The Company will provide the products and services described in the applicable order form (the "Offerings").'],
    ['ORDERS', 'Orders are binding once confirmed by the Company in writing. Each order form is part of this Agreement.'],
    ['FEES AND PAYMENT', 'The Customer will pay the fees in each order form. Invoices are due within [30] days. Fees exclude taxes, which the Customer pays in addition.'],
    ['CUSTOMER RESPONSIBILITIES', 'The Customer will use the Offerings lawfully, keep account credentials secure and ensure its users comply with this Agreement.'],
    ['SUPPORT', 'The Company will provide support by [Email or Phone] during [Support Hours] in line with its support policy.'],
    ['LIMITATION OF LIABILITY', 'The Company\'s total liability is limited to the fees paid by the Customer in the [12] months before the claim.'],
    ['TERM AND TERMINATION', 'This Agreement continues while any order form is active. Either party may terminate for an uncured material breach on [30] days\' notice.']
  ]
});
add('sales', 'Sales Agreement', {
  kind: 'agreement',
  description: 'Sale of goods with price, delivery, title and warranty',
  parties: ['Seller', 'Buyer'],
  sections: [
    ['GOODS', 'The Seller agrees to sell and the Buyer agrees to buy: [Description, Quantity and Specifications of Goods] (the "Goods").'],
    ['PRICE AND PAYMENT', 'The total price is [Amount and Currency], payable [in full on delivery or per Payment Schedule] by [Payment Method].'],
    ['DELIVERY', 'The Seller will deliver the Goods to [Delivery Address] by [Delivery Date]. Delivery costs are paid by [Seller or Buyer].'],
    ['TITLE AND RISK', 'Risk passes to the Buyer on delivery. Title passes when the Seller receives full payment.'],
    ['INSPECTION', 'The Buyer may inspect the Goods within [7] days of delivery and must notify the Seller of any defect or shortfall in that period.'],
    ['WARRANTY', 'The Seller warrants that the Goods match their description, are of satisfactory quality and are free from defects for [Warranty Period].']
  ]
});
add('sales', 'Purchase Agreement', {
  kind: 'agreement',
  description: 'Purchase of goods or equipment with payment, delivery and default terms',
  parties: ['Buyer', 'Seller'],
  sections: [
    ['ITEMS PURCHASED', 'The Seller will sell the following items to the Buyer: [Item Description, Model, Serial Numbers and Quantity].'],
    ['PURCHASE PRICE', 'The purchase price is [Amount and Currency], including [taxes and delivery or as stated].'],
    ['PAYMENT TERMS', '[Deposit Amount] is due on signing and the balance of [Amount] is due on [Date or Delivery].'],
    ['DELIVERY', 'Delivery will take place at [Location] on or before [Date].'],
    ['INSPECTION AND ACCEPTANCE', 'The Buyer may inspect the items on delivery. Items are accepted unless the Buyer reports a non-conformity within [5] days.'],
    ['WARRANTIES', 'The Seller warrants that it owns the items, that they are free of liens and that they are sold [with the manufacturer warranty or "as is"].'],
    ['DEFAULT', 'If either party fails to perform, the other may cancel this Agreement after giving [10] days\' written notice to remedy the failure.']
  ]
});
add('sales', 'Order Form', {
  kind: 'form',
  description: 'Customer order with items, pricing, billing terms and authorization',
  intro: 'Order number: [Order Number]\nOrder date: [Date]\nThis Order Form is governed by the [Customer Agreement or Terms of Service] of [Company Name].',
  fields: [
    ['CUSTOMER DETAILS', ['Company name', 'Billing address', 'Contact name', 'Contact email', 'Tax ID (if applicable)']],
    ['ORDER DETAILS', ['Item 1 - description, quantity, unit price', 'Item 2 - description, quantity, unit price', 'Item 3 - description, quantity, unit price']],
    ['PRICING SUMMARY', ['Subtotal', 'Discount', 'Taxes', 'Total amount']],
    ['BILLING AND TERM', ['Billing frequency', 'Payment terms', 'Start date', 'Term length', 'Purchase order reference']]
  ],
  closing: 'By signing, the Customer orders the items above and agrees to pay the total amount on the stated terms.'
});
add('sales', 'Quote / Proposal Approval', {
  kind: 'approval',
  description: 'Customer approval of a quote or proposal to start work',
  intro: 'Quote or proposal number: [Quote Number]\nIssued on: [Date]\nPrepared for: [Customer Name]\nPrepared by: [Company Name]',
  sections: [
    ['SUMMARY OF SCOPE', '[Summary of the products, services or project covered by the quote.]'],
    ['PRICE', 'Total price: [Amount and Currency], [excluding or including] taxes. Payment terms: [Payment Terms].'],
    ['VALIDITY', 'This quote is valid until [Expiry Date]. Prices and availability may change after that date.'],
    ['APPROVAL', 'By signing, the Customer approves the quote above, authorises [Company Name] to proceed, and agrees that the work will be carried out under [Company Name]\'s terms and conditions.']
  ],
  closing: 'Approved by the authorised representative of the Customer.'
});
add('sales', 'Customer Onboarding Form', {
  kind: 'form',
  description: 'New customer company, contact, billing and service details',
  intro: 'Welcome to [Company Name]. Please complete this form so that we can set up your account.',
  fields: [
    ['COMPANY INFORMATION', ['Legal company name', 'Trading name', 'Registered address', 'Website', 'Tax or registration number']],
    ['PRIMARY CONTACT', ['Name', 'Job title', 'Email', 'Phone']],
    ['BILLING CONTACT', ['Name', 'Email', 'Billing address (if different)', 'Purchase order required (yes or no)']],
    ['SERVICE REQUIREMENTS', ['Products or plan', 'Number of users or units', 'Preferred start date', 'Special requirements']]
  ]
});
add('sales', 'Service Subscription Agreement', {
  kind: 'agreement',
  description: 'Recurring subscription to a service with renewal, billing and cancellation',
  parties: ['Provider', 'Subscriber'],
  sections: [
    ['SUBSCRIPTION SERVICES', 'The Provider grants the Subscriber access to [Service Name] on the [Plan Name] plan for [Number] users during the subscription term.'],
    ['SUBSCRIPTION TERM AND RENEWAL', 'The initial term is [12] months from [Start Date]. It renews automatically for further [12]-month terms unless either party gives notice of non-renewal at least [30] days before the end of the current term.'],
    ['FEES AND BILLING', 'Subscription fees of [Amount] per [month or year] are billed in advance. Fees may change at renewal with [30] days\' prior notice.'],
    ['ACCEPTABLE USE', 'The Subscriber will not misuse the service, attempt to access it without authorisation, or use it for unlawful purposes.'],
    ['DATA AND PRIVACY', 'The Provider processes the Subscriber\'s data only to provide the service and in line with its privacy policy and applicable data-protection laws.'],
    ['AVAILABILITY AND SUPPORT', 'The Provider aims for [99.5%] monthly availability, excluding scheduled maintenance, and provides support during [Support Hours].'],
    ['CANCELLATION', 'The Subscriber may cancel at any time; cancellation takes effect at the end of the paid period and fees already paid are not refunded unless required by law.']
  ]
});
add('sales', 'Product Subscription Agreement', {
  kind: 'agreement',
  description: 'Recurring delivery of products with plan, billing, shipping and returns',
  parties: ['Company', 'Subscriber'],
  sections: [
    ['PRODUCTS AND DELIVERY SCHEDULE', 'The Company will deliver [Products] to [Delivery Address] every [Frequency], starting [First Delivery Date].'],
    ['PLAN AND BILLING', 'The Subscriber is billed [Amount] per delivery on [Billing Day] using the payment method on file.'],
    ['RENEWAL AND CANCELLATION', 'The subscription continues until cancelled. The Subscriber may pause, skip or cancel a delivery up to [3] days before its dispatch date.'],
    ['SHIPPING AND RETURNS', 'Damaged or incorrect products reported within [7] days are replaced or refunded.'],
    ['CHANGES', 'The Company may change products or prices with [30] days\' notice; the Subscriber may cancel before the change takes effect.']
  ]
});
add('sales', 'Client Agreement', {
  kind: 'agreement',
  description: 'Engagement terms between a business and its client',
  parties: ['Company', 'Client'],
  sections: [
    ['ENGAGEMENT', 'The Client engages the Company to provide [Services or Engagement Description] starting [Start Date].'],
    ['RESPONSIBILITIES', 'The Company will deliver the engagement professionally and on schedule. The Client will provide instructions, materials and approvals on time.'],
    ['FEES', 'The Client will pay [Fee Structure]. A retainer of [Amount] is payable on signing and credited against the final invoice.'],
    ['COMMUNICATION', 'Each party will name a main contact. Requests and approvals are made by email to those contacts.'],
    CONFIDENTIALITY_CLAUSE,
    ['TERMINATION', 'Either party may end this Agreement with [30] days\' written notice; fees for work performed until then remain payable.']
  ]
});
add('sales', 'Customer Consent Form', {
  kind: 'consent',
  description: 'Customer consent for communications and use of personal data',
  intro: 'Customer name: [Customer Name]\nCustomer email: [Email]\nCompany: [Company Name]',
  sections: [
    ['PURPOSE', '[Company Name] would like your consent to use your personal data for the purposes you select below. Consent is optional and does not affect the service you receive.'],
    ['CONSENT CHOICES', '[ ] I agree to receive product news, offers and newsletters by email.\n[ ] I agree to be contacted by phone about products and services.\n[ ] I agree that my feedback and testimonial may be published with my first name.'],
    ['HOW YOUR DATA IS USED', 'Your data is processed in line with our privacy policy at [Privacy Policy URL] and is never sold to third parties.'],
    ['WITHDRAWING CONSENT', 'You may withdraw consent at any time by emailing [Contact Email] or using the unsubscribe link in our messages.']
  ],
  closing: 'By signing, I give the consents selected above.'
});
add('sales', 'Terms & Conditions Acceptance', {
  kind: 'acknowledgment',
  description: 'Customer accepts the company\'s terms and conditions',
  intro: 'Customer: [Customer Name]\nTerms and Conditions version: [Version], dated [Date], available at [Terms URL]',
  sections: [
    ['ACCEPTANCE OF TERMS', 'I confirm that I have read the Terms and Conditions of [Company Name] and agree to be bound by them.'],
    ['AUTHORITY', 'If I sign on behalf of an organisation, I confirm that I am authorised to accept these terms for it.'],
    ['CHANGES', 'I understand that [Company Name] may update its Terms and Conditions and will notify me of material changes.']
  ],
  closing: 'Accepted electronically on the date shown in the signature details.'
});
add('sales', 'Payment Authorization Form', {
  id: 'payment-authorization-form',
  kind: 'authorization',
  description: 'Customer authorises one-time or recurring charges',
  intro: 'Customer name: [Customer Name]\nBilling address: [Billing Address]\nEmail: [Email]',
  sections: [
    ['PAYMENT DETAILS', 'Payment method: [Card or Bank Account]\nCard or account ending in: [Last 4 Digits]\nFull payment details are entered only in [Company Name]\'s secure payment system and never written in this form.'],
    ['AUTHORIZED CHARGE', 'Amount: [Amount and Currency]\nType: [One-time or Recurring]\nFrequency and start date: [Frequency, Start Date]\nFor: [Description of Goods or Services]'],
    ['AUTHORIZATION', 'I authorise [Company Name] to charge the payment method above for the amounts described. For recurring charges, this authorisation remains in effect until I cancel it in writing with at least [7] days\' notice.'],
    ['DISPUTES AND REFUNDS', 'I agree to contact [Company Name] about any incorrect charge before disputing it with my bank, and I understand refunds follow the refund policy.']
  ],
  closing: 'I confirm that I am the authorised holder of the payment method above.'
});

// D. Real Estate
add('real-estate', 'Rental Agreement', {
  kind: 'agreement',
  description: 'Residential rental of a property with rent, deposit and house rules',
  parties: ['Landlord', 'Tenant'],
  sections: [
    ['PROPERTY', 'The Landlord rents to the Tenant the property at [Property Address], including [Furniture, Parking or Storage] (the "Property").'],
    ['TERM', 'The rental starts on [Start Date] and continues [for Months or on a month-to-month basis] until ended as set out below.'],
    ['RENT', 'Rent is [Amount] per month, payable in advance on the [1st] day of each month by [Payment Method]. A late fee of [Amount] applies after [5] days.'],
    ['SECURITY DEPOSIT', 'The Tenant pays a deposit of [Amount], which is returned within [30] days after move-out, less lawful deductions for unpaid rent or damage beyond normal wear and tear.'],
    ['UTILITIES', 'The Tenant pays [Electricity, Water, Internet and other utilities]. The Landlord pays [Utilities paid by Landlord].'],
    ['USE AND OCCUPANCY', 'The Property is used only as a private residence for the Tenant and [Other Occupants]. No subletting without the Landlord\'s written consent.'],
    ['MAINTENANCE AND ENTRY', 'The Tenant keeps the Property clean and reports repairs promptly. The Landlord handles repairs and may enter with [24] hours\' notice, except in an emergency.'],
    ['ENDING THE RENTAL', 'Either party may end the rental with [30] days\' written notice, subject to local tenancy law.']
  ]
});
add('real-estate', 'Lease Agreement', {
  kind: 'agreement',
  description: 'Fixed-term lease with rent escalation, repairs, insurance and default',
  parties: ['Lessor', 'Lessee'],
  sections: [
    ['PREMISES', 'The Lessor leases to the Lessee the premises at [Premises Address], approximately [Area] (the "Premises").'],
    ['LEASE TERM AND RENEWAL', 'The lease runs for [Term] from [Commencement Date]. The Lessee may renew for a further [Term] by giving [3] months\' notice before expiry.'],
    ['RENT AND ESCALATION', 'Rent is [Amount] per [month], payable in advance, and increases by [Percentage] on each anniversary of the commencement date.'],
    ['SECURITY DEPOSIT', 'The Lessee pays a deposit of [Amount] on signing, held as security for the Lessee\'s obligations.'],
    ['PERMITTED USE', 'The Premises may be used only for [Permitted Use] and in compliance with applicable laws and building rules.'],
    ['REPAIRS AND ALTERATIONS', 'The Lessee handles minor repairs and keeps the Premises in good condition. Structural repairs are the Lessor\'s responsibility. Alterations need the Lessor\'s written consent.'],
    ['INSURANCE', 'The Lessee maintains liability and contents insurance of at least [Amount] and provides proof on request.'],
    ['ASSIGNMENT AND SUBLETTING', 'The Lessee may not assign or sublet without the Lessor\'s prior written consent, not to be unreasonably withheld.'],
    ['DEFAULT', 'If rent is unpaid for [15] days or another breach is not remedied within [30] days of notice, the Lessor may terminate the lease as permitted by law.']
  ]
});
add('real-estate', 'Property Management Agreement', {
  kind: 'agreement',
  description: 'Owner appoints a manager to lease, maintain and account for a property',
  parties: ['Owner', 'Manager'],
  sections: [
    ['APPOINTMENT', 'The Owner appoints the Manager as the exclusive manager of the property at [Property Address] (the "Property").'],
    ['MANAGER DUTIES', 'The Manager will advertise and lease units, screen tenants, collect rent, arrange repairs up to [Amount] without prior approval, handle tenant communication and comply with applicable housing laws.'],
    ['MANAGEMENT FEES', 'The Owner pays the Manager [Percentage] of monthly rent collected, plus a leasing fee of [Amount or Percentage] for each new tenancy.'],
    ['OWNER OBLIGATIONS', 'The Owner keeps the Property insured, funds necessary repairs and provides all information needed to manage the Property.'],
    ['ACCOUNTS AND REPORTING', 'The Manager keeps rent in a separate trust account and provides a monthly statement of income and expenses by the [10th] of each month.'],
    ['TERM AND TERMINATION', 'This Agreement lasts [12] months and renews automatically unless either party gives [60] days\' written notice.']
  ]
});
add('real-estate', 'Property Sale Agreement', {
  kind: 'agreement',
  description: 'Sale of real property with deposit, conditions, title and closing',
  parties: ['Seller', 'Buyer'],
  sections: [
    ['PROPERTY', 'The Seller agrees to sell and the Buyer agrees to buy the property at [Property Address], legally described as [Legal Description] (the "Property").'],
    ['PURCHASE PRICE AND DEPOSIT', 'The purchase price is [Amount]. The Buyer pays a deposit of [Amount] to [Escrow Agent] within [3] business days of signing; the balance is paid at closing.'],
    ['CONDITIONS', 'This sale depends on [financing approval, satisfactory inspection and other conditions] being satisfied by [Condition Date].'],
    ['TITLE', 'The Seller will transfer good and marketable title, free of liens and encumbrances except [Permitted Exceptions].'],
    ['CLOSING', 'Closing will take place on or before [Closing Date] at [Location or through Escrow Agent]. Closing costs are divided as follows: [Closing Cost Allocation].'],
    ['POSSESSION', 'The Buyer receives possession and keys on [closing or Possession Date], with the Property in the same condition as at signing, normal wear excepted.'],
    ['DEFAULT', 'If the Buyer defaults, the Seller may keep the deposit as liquidated damages. If the Seller defaults, the Buyer may seek return of the deposit or specific performance.']
  ]
});
add('real-estate', 'Purchase Agreement', {
  id: 'real-estate-purchase-agreement',
  kind: 'agreement',
  description: 'Buyer offer to purchase property with financing and inspection contingencies',
  parties: ['Buyer', 'Seller'],
  sections: [
    ['PROPERTY', 'The Buyer offers to purchase the property at [Property Address], including fixtures and [Included Items] (the "Property").'],
    ['PRICE AND FINANCING', 'The purchase price is [Amount], paid by [Down Payment Amount] at closing and a mortgage loan of [Loan Amount]. The Buyer will apply for financing within [5] days.'],
    ['EARNEST MONEY', 'The Buyer deposits earnest money of [Amount] with [Escrow Holder], credited to the price at closing.'],
    ['INSPECTIONS AND CONTINGENCIES', 'The Buyer may carry out inspections within [10] days and may cancel with a full refund of earnest money if the inspection, appraisal or financing contingency is not satisfied.'],
    ['CLOSING COSTS', 'Closing costs are paid as follows: [Closing Cost Allocation]. Property taxes are prorated to the closing date.'],
    ['CLOSING DATE', 'Closing will occur on or before [Closing Date].']
  ]
});
add('real-estate', 'Tenant Application', {
  kind: 'form',
  description: 'Prospective tenant details, rental history, income and screening consent',
  intro: 'Property applied for: [Property Address]\nDesired move-in date: [Date]',
  fields: [
    ['APPLICANT', ['Full name', 'Date of birth', 'Phone', 'Email']],
    ['CURRENT RESIDENCE', ['Address', 'How long at this address', 'Current landlord name and phone', 'Monthly rent', 'Reason for moving']],
    ['EMPLOYMENT AND INCOME', ['Employer', 'Job title', 'Length of employment', 'Monthly income']],
    ['REFERENCES', ['Reference 1 - name, relationship, phone', 'Reference 2 - name, relationship, phone']],
    ['OCCUPANTS AND PETS', ['Other occupants (names and ages)', 'Pets (type and number)', 'Vehicles']]
  ],
  extra: [['CONSENT TO SCREENING', 'I authorise [Landlord or Agency Name] to verify the information in this application, contact my references and employer, and obtain credit and background reports as permitted by law.']]
});
add('real-estate', 'Tenant Information Form', {
  kind: 'form',
  description: 'Contact, occupant, vehicle and emergency details for a tenant file',
  intro: 'Property: [Property Address]\nUnit: [Unit Number]\nLease start date: [Date]',
  fields: [
    ['TENANT DETAILS', ['Full name', 'Phone', 'Email', 'Preferred contact method']],
    ['OTHER OCCUPANTS', ['Name and relationship', 'Name and relationship']],
    ['VEHICLES', ['Make, model and colour', 'Registration number']],
    ['EMERGENCY CONTACT', ['Name', 'Relationship', 'Phone']],
    ['PAYMENT', ['Rent payment method', 'Rent due date']]
  ]
});
add('real-estate', 'Property Inspection Form', {
  kind: 'checklist',
  description: 'Room-by-room condition report with notes and meter readings',
  intro: 'Property: [Property Address]\nInspection type: [Move-in, Routine or Move-out]\nInspection date: [Date]\nInspected by: [Name]',
  fields: [
    ['LIVING AREAS', ['Walls and ceilings - condition (good, fair, poor) and notes', 'Floors and carpets', 'Windows and blinds', 'Doors and locks', 'Lights and switches']],
    ['KITCHEN', ['Cabinets and counters', 'Sink and taps', 'Appliances', 'Ventilation']],
    ['BATHROOMS', ['Toilet', 'Shower or bath', 'Basin and taps', 'Tiles and grout']],
    ['BEDROOMS', ['Walls and floors', 'Wardrobes', 'Windows and fittings']],
    ['EXTERIOR AND SAFETY', ['Garden and yard', 'Smoke alarms tested', 'Meter readings (electricity, water, gas)', 'Keys handed over (number)']]
  ],
  closing: 'The signers agree that this report accurately records the condition of the property on the inspection date.'
});
add('real-estate', 'Move-In / Move-Out Checklist', {
  kind: 'checklist',
  description: 'Condition checklist signed at the start and end of a tenancy',
  intro: 'Property: [Property Address]\nTenant: [Tenant Name]\nMove-in date: [Date]\nMove-out date: [Date]',
  fields: [
    ['ENTRY AND LIVING ROOM', ['Move-in condition and notes', 'Move-out condition and notes']],
    ['KITCHEN', ['Move-in condition and notes', 'Move-out condition and notes']],
    ['BEDROOMS', ['Move-in condition and notes', 'Move-out condition and notes']],
    ['BATHROOMS', ['Move-in condition and notes', 'Move-out condition and notes']],
    ['KEYS, METERS AND APPLIANCES', ['Keys received at move-in', 'Keys returned at move-out', 'Meter readings at move-in', 'Meter readings at move-out']]
  ],
  closing: 'The landlord and tenant confirm this checklist reflects the condition of the property on the dates shown and will be used to assess the security deposit.'
});
add('real-estate', 'Maintenance Authorization', {
  kind: 'authorization',
  description: 'Owner or tenant approves maintenance work, access and cost limit',
  intro: 'Property: [Property Address]\nRequest number: [Request Number]\nRequested by: [Name]',
  sections: [
    ['WORK DESCRIPTION', '[Description of the maintenance or repair work.]'],
    ['CONTRACTOR', 'Work will be carried out by [Contractor Name, Licence Number].'],
    ['COST LIMIT', 'Approved cost up to [Amount]. Any additional cost requires further written approval.'],
    ['ACCESS', 'Access is permitted on [Date and Time Window]. [Tenant will or will not be present.]'],
    ['AUTHORIZATION', 'I authorise the work described above, the access arrangements and the cost limit, and agree to pay [or charge to Owner Account] the approved amount on completion.']
  ],
  closing: 'Signed by the person authorising the work.'
});
add('real-estate', 'Broker Agreement', {
  kind: 'agreement',
  description: 'Client appoints a real estate broker with commission terms',
  parties: ['Client', 'Broker'],
  sections: [
    ['APPOINTMENT', 'The Client appoints the Broker as its [exclusive] agent to [sell, buy or lease] the property at or described as [Property] (the "Property").'],
    ['TERM', 'This appointment runs from [Start Date] to [End Date].'],
    ['BROKER DUTIES', 'The Broker will market the Property or search for suitable properties, present all offers, advise on pricing and negotiate in the Client\'s best interest.'],
    ['COMMISSION', 'The Client will pay the Broker a commission of [Percentage or Amount] of the [sale price or rent] when a transaction is completed during the term, or within [90] days after it with a buyer or tenant introduced by the Broker.'],
    ['CLIENT OBLIGATIONS', 'The Client will provide accurate information about the Property, refer all enquiries to the Broker and allow reasonable access for viewings.'],
    ['TERMINATION', 'Either party may terminate with [30] days\' written notice. Commission for transactions already agreed remains payable.']
  ]
});

// E. Legal
add('legal', 'NDA', { shared: 'nda', description: 'Mutual non-disclosure agreement protecting confidential information' });
add('legal', 'Confidentiality Agreement', { shared: 'confidentiality', description: 'One-way confidentiality obligations of a recipient' });
add('legal', 'Consent Agreement', {
  kind: 'consent',
  description: 'Written consent to a specific activity, use or arrangement',
  intro: 'Consenting party: [Full Name]\nRequesting party: [Organization or Person]\nDate: [Date]',
  sections: [
    ['PURPOSE OF CONSENT', 'The Requesting Party asks for consent to [Describe the Activity, Use or Arrangement].'],
    ['SCOPE OF CONSENT', 'This consent covers [Scope, including any limits on time, place or use] and nothing beyond it.'],
    ['VOLUNTARY CONSENT', 'I confirm that my consent is given freely, that the purpose has been explained to me and that I have had the opportunity to ask questions.'],
    ['WITHDRAWAL', 'I may withdraw this consent at any time by written notice to [Contact Details]. Withdrawal does not affect anything done in reliance on the consent before it was withdrawn.']
  ],
  closing: 'By signing below, I give the consent described above.'
});
add('legal', 'Authorization Letter', {
  kind: 'letter',
  description: 'Letter authorising a representative to act on someone\'s behalf',
  text: `AUTHORIZATION LETTER

[Date]

To: [Recipient Organization or Whom It May Concern]

I, [Full Name], residing at [Address], holder of [ID Type] ending in [Last 4 Digits], authorise [Representative Name], holder of [ID Type] ending in [Last 4 Digits], to act on my behalf for the following purpose:

1. AUTHORIZED ACTIONS
[Describe exactly what the representative may do, for example collect documents, submit an application or receive a delivery.]

2. VALIDITY
This authorisation is valid from [Start Date] to [End Date], unless revoked earlier in writing.

3. IDENTIFICATION
The representative will present this letter together with their own valid photo identification.

4. RESPONSIBILITY
I accept responsibility for the actions taken by the representative within the scope of this authorisation.

Sincerely,
[Full Name]
[Phone Number]`
});
add('legal', 'Legal Services Agreement', {
  kind: 'agreement',
  description: 'Engagement of a law firm: scope, fees, retainer and responsibilities',
  parties: ['Law Firm', 'Client'],
  sections: [
    ['SCOPE OF REPRESENTATION', 'The Law Firm will represent the Client in [Matter Description]. Services outside this scope, including appeals, require a separate written agreement.'],
    ['FEES AND RETAINER', 'Fees are charged at [Hourly Rates or Fixed Fee]. The Client pays a retainer of [Amount], held in the Law Firm\'s client trust account and applied to invoices.'],
    ['COSTS AND EXPENSES', 'The Client pays filing fees, expert fees, travel and other costs incurred for the matter.'],
    ['BILLING', 'The Law Firm invoices [monthly] with a description of work performed. Invoices are payable within [30] days.'],
    ['CLIENT RESPONSIBILITIES', 'The Client will provide complete and truthful information, respond promptly and keep the Law Firm informed of relevant developments.'],
    ['NO GUARANTEE', 'The Law Firm cannot guarantee the outcome of the matter.'],
    ['TERMINATION AND FILES', 'The Client may end the engagement at any time; the Law Firm may withdraw as permitted by professional rules. Files are kept for [7] years after the matter closes.']
  ]
});
add('legal', 'Settlement Agreement', {
  kind: 'agreement',
  description: 'Resolution of a dispute with payment, release and confidentiality',
  parties: ['First Party', 'Second Party'],
  sections: [
    ['BACKGROUND', 'A dispute has arisen between the parties regarding [Description of Dispute] (the "Dispute"). The parties wish to settle it fully and finally without admission of liability.'],
    ['SETTLEMENT PAYMENT', '[Paying Party] will pay [Amount] to [Receiving Party] within [14] days of the date of this Agreement by [Payment Method].'],
    ['RELEASE', 'On receipt of the settlement payment, each party releases the other from all claims arising from or connected with the Dispute, whether known or unknown.'],
    ['NO ADMISSION', 'This Agreement is a compromise and is not an admission of liability by either party.'],
    ['CONFIDENTIALITY', 'The parties will keep the terms of this Agreement confidential, except as required by law or to professional advisers.'],
    ['DISMISSAL OF PROCEEDINGS', 'Within [7] days of payment, the parties will file any documents needed to withdraw or dismiss proceedings relating to the Dispute, each bearing its own costs.']
  ]
});
add('legal', 'Release Agreement', {
  kind: 'agreement',
  description: 'Release of claims in exchange for consideration',
  parties: ['Releasor', 'Releasee'],
  sections: [
    ['CONSIDERATION', 'In exchange for [Amount or Other Consideration], the receipt of which is acknowledged, the Releasor gives the release below.'],
    ['RELEASE OF CLAIMS', 'The Releasor releases the Releasee and its officers, employees and agents from all claims, demands and liabilities arising from [Event or Matter], to the extent permitted by law.'],
    ['UNKNOWN CLAIMS', 'The Releasor understands that this release covers claims that are not yet known, and accepts that risk.'],
    ['NO ADMISSION', 'The Releasee does not admit any liability.'],
    ['COVENANT NOT TO SUE', 'The Releasor will not bring any legal proceeding against the Releasee regarding the released claims.']
  ]
});
add('legal', 'Waiver Form', {
  kind: 'acknowledgment',
  description: 'Participant waiver and assumption of risk for an activity',
  intro: 'Participant: [Full Name]\nActivity: [Activity Name]\nDate or period: [Date]\nOrganizer: [Organization Name]',
  sections: [
    ['DESCRIPTION OF ACTIVITY', '[Description of the activity, location and main risks.]'],
    ['ASSUMPTION OF RISK', 'I understand that the activity involves risks, including [Specific Risks], which may result in injury, illness or property damage, and I voluntarily accept those risks.'],
    ['RELEASE AND WAIVER', 'To the extent permitted by law, I release the Organizer and its staff and volunteers from liability for injury or loss arising from my participation, except where caused by their gross negligence or wilful misconduct.'],
    ['MEDICAL AUTHORIZATION', 'I authorise the Organizer to obtain emergency medical treatment for me if needed, at my expense.'],
    ['RULES', 'I agree to follow all safety rules and the instructions of the Organizer\'s staff.']
  ],
  closing: 'I have read this waiver, understand it and sign it voluntarily. If the participant is under 18, a parent or guardian signs on their behalf.'
});
add('legal', 'Power of Attorney', {
  kind: 'agreement',
  description: 'Principal appoints an agent to act on their behalf',
  parties: ['Principal', 'Agent'],
  intro: 'By this Power of Attorney, I, [Principal Full Name] of [Address] (the "Principal"), appoint [Agent Full Name] of [Address] (the "Agent") as my attorney-in-fact.',
  sections: [
    ['POWERS GRANTED', 'The Agent may act for the Principal in the following matters: [Banking, Property, Tax, Legal or other specific powers].'],
    ['LIMITATIONS', 'The Agent may not [List any restrictions, for example make gifts or sell the family home].'],
    ['EFFECTIVE DATE AND DURATION', 'This Power of Attorney takes effect on [Date or Event] and remains in force until [End Date or revocation]. It [does or does not] continue if the Principal becomes incapacitated.'],
    ['DUTIES OF THE AGENT', 'The Agent will act in good faith and in the Principal\'s best interest, keep records and keep the Principal\'s property separate from their own.'],
    ['REVOCATION', 'The Principal may revoke this Power of Attorney at any time by written notice to the Agent and to any third party relying on it.'],
    ['THIRD-PARTY RELIANCE', 'A third party may rely on this document until it receives written notice of revocation.']
  ],
  noGeneral: true,
  closing: 'Many jurisdictions require a power of attorney to be witnessed and notarised. Signed electronically by the Principal and accepted by the Agent.'
});
add('legal', 'Declaration Form', {
  kind: 'declaration',
  description: 'Formal declaration that stated facts are true',
  intro: 'Declarant: [Full Name]\nAddress: [Address]\nPurpose of declaration: [Purpose]',
  sections: [
    ['STATEMENT', 'I declare that:\n1) [Statement of fact]\n2) [Statement of fact]\n3) [Statement of fact]'],
    ['TRUTHFULNESS', 'I declare that the information above is true and correct to the best of my knowledge and belief, and I understand that making a false declaration may have legal consequences.']
  ],
  closing: 'Declared and signed electronically on the date shown in the signature details.'
});
add('legal', 'Affidavit', {
  kind: 'declaration',
  description: 'Sworn statement of facts by an affiant',
  intro: 'State or country: [Jurisdiction]\nAffiant: [Full Name], of [Address], [Occupation]',
  sections: [
    ['STATEMENT OF FACTS', 'I, [Full Name], being of legal age, state under oath as follows:\n1) [Fact]\n2) [Fact]\n3) [Fact]'],
    ['PERSONAL KNOWLEDGE', 'The facts in this affidavit are within my personal knowledge, and I am competent to testify to them.'],
    ['OATH', 'I swear or affirm that the statements in this affidavit are true and correct, and I understand that a false statement may be punishable as perjury.'],
    ['NOTARIZATION', 'Subscribed and sworn before me on [Date] by [Affiant Name].\nNotary public: [Name], commission expires [Date].']
  ],
  closing: 'Where the law requires an affidavit to be sworn before a notary or commissioner, complete that step in addition to signing.'
});
add('legal', 'General Agreement', {
  kind: 'agreement',
  description: 'Simple general-purpose agreement between two parties',
  parties: ['First Party', 'Second Party'],
  sections: [
    ['SUBJECT OF THE AGREEMENT', 'The parties agree as follows regarding [Subject of the Agreement].'],
    ['OBLIGATIONS', 'The First Party will [Obligations]. The Second Party will [Obligations].'],
    ['CONSIDERATION', 'In exchange, [Party] will pay or provide [Consideration] by [Date].'],
    ['TERM', 'This Agreement starts on the Effective Date and ends on [End Date or Completion of Obligations].'],
    ['TERMINATION', 'Either party may terminate this Agreement if the other materially breaches it and does not cure the breach within [15] days of written notice.']
  ]
});

// F. Finance & Accounting
add('finance', 'Payment Agreement', {
  kind: 'agreement',
  description: 'Instalment plan for an amount owed, with late payment and default terms',
  parties: ['Payee', 'Payer'],
  sections: [
    ['AMOUNT OWED', 'The Payer owes the Payee [Amount and Currency] for [Reason for Debt].'],
    ['PAYMENT SCHEDULE', 'The Payer will pay [Number] instalments of [Amount] on the [Day] of each month, starting [First Payment Date], until the full amount is paid.'],
    ['PAYMENT METHOD', 'Payments are made by [Bank Transfer or other method] to [Payee Account Reference].'],
    ['LATE PAYMENT', 'A payment more than [10] days late incurs a fee of [Amount] or interest at [Rate], as permitted by law.'],
    ['EARLY PAYMENT', 'The Payer may pay the remaining balance early without penalty.'],
    ['DEFAULT', 'If the Payer misses [2] consecutive payments, the full remaining balance becomes due immediately.']
  ]
});
add('finance', 'Invoice Approval', {
  kind: 'approval',
  description: 'Internal approval of a supplier invoice before payment',
  intro: 'Supplier: [Supplier Name]\nInvoice number: [Invoice Number]\nInvoice date: [Date]\nAmount: [Amount and Currency]\nPurchase order: [PO Number]',
  sections: [
    ['BUDGET AND COST CENTRE', 'Cost centre: [Cost Centre]\nBudget line: [Budget Line]\nProject: [Project]'],
    ['VERIFICATION', '[ ] Goods or services were received as ordered\n[ ] Prices and quantities match the purchase order\n[ ] Invoice is arithmetically correct and taxes are applied correctly'],
    ['APPROVAL', 'I approve payment of this invoice in the amount above and confirm it is within my approval limit of [Approval Limit].']
  ],
  closing: 'Approved by the budget holder.'
});
add('finance', 'Credit Agreement', {
  kind: 'agreement',
  description: 'Trade credit line with limit, terms, interest and security',
  parties: ['Creditor', 'Customer'],
  sections: [
    ['CREDIT LIMIT', 'The Creditor grants the Customer a trade credit limit of [Amount], which the Creditor may review at any time.'],
    ['CREDIT TERMS', 'Invoices are payable within [30] days of the invoice date. The Creditor may suspend deliveries if the limit is exceeded or payments are overdue.'],
    ['INTEREST AND FEES', 'Overdue amounts bear interest at [Rate] per month, as permitted by law, plus reasonable collection costs.'],
    ['SECURITY', '[Personal guarantee, deposit or other security, if any.]'],
    ['FINANCIAL INFORMATION', 'The Customer will provide financial statements on request and will notify the Creditor of any material change in its financial position.'],
    ['DEFAULT', 'On default, all outstanding amounts become immediately due and the Creditor may withdraw the credit facility.']
  ]
});
add('finance', 'Loan Agreement', {
  kind: 'agreement',
  description: 'Loan amount, interest, repayment schedule, prepayment and default',
  parties: ['Lender', 'Borrower'],
  sections: [
    ['LOAN AMOUNT', 'The Lender lends the Borrower [Amount and Currency] (the "Loan"), paid by [Method] on [Disbursement Date].'],
    ['INTEREST', 'The Loan bears interest at [Rate]% per year, calculated on the outstanding balance [monthly].'],
    ['REPAYMENT', 'The Borrower repays the Loan in [Number] monthly instalments of [Amount], starting [First Repayment Date], until the Loan and interest are paid in full.'],
    ['PREPAYMENT', 'The Borrower may prepay all or part of the Loan at any time without penalty. Prepayments are applied first to interest and then to principal.'],
    ['SECURITY', '[Collateral or guarantee securing the Loan, if any.]'],
    ['DEFAULT', 'If a payment is more than [15] days late or the Borrower becomes insolvent, the Lender may declare the whole balance immediately due.']
  ]
});
add('finance', 'Financial Authorization', {
  kind: 'authorization',
  description: 'Authorises a person to approve or perform financial transactions',
  intro: 'Organisation: [Organization Name]\nAuthorised person: [Full Name, Title]\nEffective: [Start Date] to [End Date]',
  sections: [
    ['SCOPE OF AUTHORITY', 'The authorised person may [approve purchases, sign cheques, initiate payments or other actions] on behalf of the organisation.'],
    ['LIMITS', 'Single transaction limit: [Amount]\nMonthly limit: [Amount]\nTransactions above these limits need approval from [Approver Title].'],
    ['CONDITIONS', 'All transactions must follow the organisation\'s financial policies and be supported by documentation.'],
    ['REVOCATION', 'This authorisation may be revoked at any time by written notice from [Authorising Officer].']
  ],
  closing: 'Signed by the authorising officer and accepted by the authorised person.'
});
add('finance', 'Expense Approval', {
  kind: 'form',
  description: 'Employee expense claim with business purpose and manager approval',
  intro: 'Employee: [Employee Name]\nDepartment: [Department]\nClaim period: [Start Date] to [End Date]',
  fields: [
    ['EXPENSES', ['Expense 1 - date, category, description, amount', 'Expense 2 - date, category, description, amount', 'Expense 3 - date, category, description, amount', 'Total amount claimed']],
    ['BUSINESS PURPOSE', ['Purpose of the expenses', 'Project or client', 'Receipts attached (yes or no)']]
  ],
  extra: [['APPROVAL', 'The employee confirms these expenses were incurred for business purposes in line with the expense policy. The manager approves reimbursement of the total amount claimed.']],
  closing: 'Signed by the employee and approving manager.'
});
add('finance', 'Payment Authorization', {
  kind: 'authorization',
  description: 'Internal authorisation to release a specific payment',
  intro: 'Payee: [Payee Name]\nAmount: [Amount and Currency]\nPayment date: [Date]\nReference: [Invoice or Contract Reference]',
  sections: [
    ['PAYMENT DETAILS', 'Payee account ending in: [Last 4 Digits]\nPayment method: [Bank Transfer, Cheque or other]\nPurpose: [Purpose of Payment]'],
    ['VERIFICATION', 'The payee\'s bank details were verified on [Date] by [Name] through [Verification Method], protecting against payment fraud.'],
    ['AUTHORIZATION', 'I authorise [Organization Name] to make the payment described above.']
  ],
  closing: 'Authorised by the signatory with payment authority.'
});
add('finance', 'Direct Debit Authorization', {
  kind: 'authorization',
  description: 'Account holder authorises recurring debits from their bank account',
  intro: 'Account holder: [Full Name]\nBilling reference: [Customer or Mandate Reference]\nCreditor: [Company Name]',
  sections: [
    ['BANK ACCOUNT', 'Bank name: [Bank Name]\nAccount ending in: [Last 4 Digits]\nThe full account details are provided securely to [Company Name]\'s payment provider and are not written in this document.'],
    ['DEBIT DETAILS', 'Amount: [Fixed Amount or "as invoiced"]\nFrequency: [Monthly or other]\nFirst debit date: [Date]'],
    ['AUTHORIZATION', 'I authorise [Company Name] to debit my account for the amounts described, in line with the rules of the direct debit scheme.'],
    ['NOTICE AND CANCELLATION', 'I will receive at least [10] days\' notice of any change in amount or date. I may cancel this authorisation at any time by contacting my bank and [Company Name].']
  ],
  closing: 'I confirm that I am the account holder and am authorised to approve debits from this account.'
});
add('finance', 'Banking Authorization', {
  kind: 'authorization',
  description: 'Authorised signatories and powers for a company bank account',
  intro: 'Organisation: [Organization Name]\nBank: [Bank Name]\nAccount ending in: [Last 4 Digits]',
  sections: [
    ['AUTHORIZED SIGNATORIES', 'Signatory 1: [Name, Title]\nSignatory 2: [Name, Title]\nSignatory 3: [Name, Title]'],
    ['POWERS', 'The authorised signatories may [operate the account, sign cheques, approve transfers, access online banking].'],
    ['SIGNING RULES', 'Transactions up to [Amount] need one signatory; transactions above that need [two] signatories.'],
    ['VALIDITY', 'This authorisation replaces all earlier authorisations and remains valid until revoked in writing by [Board or Authorised Officer].']
  ],
  closing: 'Signed by the authorised officers of the organisation.'
});
add('finance', 'Financial Disclosure Form', {
  kind: 'form',
  description: 'Statement of income, assets and liabilities with declaration',
  intro: 'Name: [Full Name]\nPurpose of disclosure: [Purpose]\nAs of: [Date]',
  fields: [
    ['INCOME', ['Employment income (per year)', 'Business income', 'Other income (source and amount)']],
    ['ASSETS', ['Cash and bank balances', 'Investments', 'Property (description and value)', 'Vehicles', 'Other assets']],
    ['LIABILITIES', ['Mortgages', 'Loans', 'Credit cards', 'Other liabilities']],
    ['CONFLICTS OF INTEREST', ['Outside business interests', 'Gifts or payments received above [Amount]']]
  ]
});

// G. Healthcare
add('healthcare', 'Patient Consent Form', {
  kind: 'consent',
  description: 'General consent to examination and care',
  intro: 'Patient: [Patient Name]\nDate of birth: [Date of Birth]\nProvider: [Practice Name]',
  sections: [
    ['CONSENT TO CARE', 'I consent to routine examination, diagnostic procedures and treatment by the clinicians of [Practice Name] that they consider necessary for my care.'],
    ['QUESTIONS AND RIGHT TO REFUSE', 'I understand that I may ask questions about my care at any time and may refuse or stop any treatment.'],
    HEALTH_PRIVACY,
    ['FINANCIAL RESPONSIBILITY', 'I understand that I am responsible for charges not covered by my insurance.']
  ],
  closing: 'By signing, I confirm the information above and give my consent. A parent or legal guardian signs for a minor.'
});
add('healthcare', 'Treatment Consent', {
  kind: 'consent',
  description: 'Informed consent to a specific treatment or procedure',
  intro: 'Patient: [Patient Name]\nTreatment or procedure: [Treatment Name]\nClinician: [Clinician Name]',
  sections: [
    ['EXPLANATION', 'The clinician has explained the nature and purpose of the treatment, the expected benefits, the material risks ([Key Risks]) and the reasonable alternatives, including no treatment.'],
    ['QUESTIONS', 'I have had the opportunity to ask questions and my questions have been answered.'],
    ['CONSENT', 'I consent to the treatment described above and to any additional procedure the clinician considers necessary in an emergency during it.'],
    HEALTH_PRIVACY
  ],
  closing: 'Signed by the patient, or by a parent or authorised representative.'
});
add('healthcare', 'Patient Registration Form', {
  kind: 'form',
  description: 'New patient demographics, contact, insurance and emergency details',
  intro: 'Welcome to [Practice Name]. Please complete this form. Your information is kept confidential.',
  fields: [
    ['PATIENT DETAILS', ['Full name', 'Date of birth', 'Sex', 'Preferred language']],
    ['CONTACT', ['Address', 'Phone', 'Email', 'Preferred contact method']],
    ['INSURANCE', ['Insurance provider', 'Policy number (last 4 digits)', 'Policy holder name']],
    ['EMERGENCY CONTACT', ['Name', 'Relationship', 'Phone']],
    ['MEDICAL', ['Primary physician', 'Allergies', 'Current medications']]
  ],
  extra: [HEALTH_PRIVACY]
});
add('healthcare', 'Medical Information Authorization', {
  kind: 'authorization',
  description: 'Patient authorises disclosure of medical information to a named recipient',
  intro: 'Patient: [Patient Name]\nDate of birth: [Date of Birth]',
  sections: [
    ['INFORMATION TO BE DISCLOSED', '[Records, date ranges and types of information, for example lab results from Date to Date.]'],
    ['DISCLOSED BY AND TO', 'From: [Provider Name]\nTo: [Recipient Name, Address]'],
    ['PURPOSE', '[Continuity of care, insurance, legal or personal use.]'],
    ['EXPIRY AND REVOCATION', 'This authorisation expires on [Date or Event]. I may revoke it in writing at any time, except for information already disclosed.'],
    ['RE-DISCLOSURE', 'I understand that information disclosed may no longer be protected by privacy law once received by the recipient, and that my treatment does not depend on signing this authorisation.']
  ],
  closing: 'Signed by the patient or legal representative.'
});
add('healthcare', 'Privacy Acknowledgment', {
  kind: 'acknowledgment',
  description: 'Patient acknowledges receipt of the Notice of Privacy Practices',
  intro: 'Patient: [Patient Name]\nPractice: [Practice Name]',
  sections: [
    ['RECEIPT OF NOTICE', 'I acknowledge that I have received the [Practice Name] Notice of Privacy Practices, which describes how my health information may be used and disclosed and how I can access it.'],
    ['MY RIGHTS', 'I understand that I may ask to inspect or receive a copy of my records, request corrections, request restrictions and receive an accounting of certain disclosures.'],
    ['QUESTIONS AND COMPLAINTS', 'Questions or complaints may be directed to the Privacy Officer at [Contact Details].']
  ],
  closing: 'By signing, I acknowledge receipt of the Notice of Privacy Practices.'
});
add('healthcare', 'Release of Information', {
  kind: 'authorization',
  description: 'Release of health records to the patient or a third party',
  intro: 'Patient: [Patient Name]\nDate of birth: [Date of Birth]\nRequested by: [Requester Name]',
  sections: [
    ['RECORDS TO RELEASE', '[Specify records and date ranges.]'],
    ['RELEASE TO', '[Name, Organisation, Address]\nDelivery method: [Secure Email, Mail or Patient Portal]'],
    ['PURPOSE', '[Purpose of release.]'],
    ['EXPIRY AND REVOCATION', 'This release expires on [Date]. It may be revoked in writing at any time, except for information already released.'],
    HEALTH_PRIVACY
  ],
  closing: 'Signed by the patient or legal representative.'
});
add('healthcare', 'Telehealth Consent', {
  kind: 'consent',
  description: 'Consent to receive care through video or phone consultations',
  intro: 'Patient: [Patient Name]\nProvider: [Practice Name]',
  sections: [
    ['NATURE OF TELEHEALTH', 'Telehealth uses secure video, phone or messaging to provide consultations and follow-up care without an in-person visit.'],
    ['BENEFITS AND LIMITATIONS', 'Telehealth improves access but has limits, including the absence of a physical examination and possible technical failures. My clinician may recommend an in-person visit when needed.'],
    ['PRIVACY AND SECURITY', 'Sessions use a secure platform and are not recorded without my consent. I will join from a private location.'],
    ['EMERGENCIES', 'Telehealth is not for emergencies. In an emergency I will call [Emergency Number].'],
    HEALTH_PRIVACY
  ],
  closing: 'I consent to receive care by telehealth and understand I may withdraw this consent at any time.'
});
add('healthcare', 'Treatment Authorization', {
  kind: 'authorization',
  description: 'Parent or guardian authorises treatment for a minor or dependant',
  intro: 'Patient: [Patient Name]\nDate of birth: [Date of Birth]\nAuthorised by: [Parent or Guardian Name], relationship: [Relationship]',
  sections: [
    ['AUTHORIZATION', 'I authorise [Practice or Clinician Name] to provide [Treatment or routine and emergency care] to the patient named above.'],
    ['PERIOD', 'This authorisation is valid from [Start Date] to [End Date].'],
    ['ADDITIONAL CAREGIVERS', 'The following adults may accompany the patient and give consent on my behalf: [Names].'],
    ['MEDICAL INFORMATION', 'Allergies: [Allergies]\nCurrent medications: [Medications]\nInsurance: [Provider, Policy Last 4 Digits]'],
    HEALTH_PRIVACY
  ],
  closing: 'Signed by the parent, guardian or authorised representative.'
});

// H. Education
add('education', 'Student Enrollment Form', {
  kind: 'form',
  description: 'New student details, program, guardian and emergency contacts',
  intro: 'Institution: [Institution Name]\nAcademic year: [Year]',
  fields: [
    ['STUDENT DETAILS', ['Full name', 'Date of birth', 'Gender (optional)', 'Previous school']],
    ['PROGRAM', ['Program or grade', 'Start date', 'Mode (full-time or part-time)']],
    ['CONTACT', ['Address', 'Phone', 'Email']],
    ['PARENT OR GUARDIAN', ['Name', 'Relationship', 'Phone', 'Email']],
    ['EMERGENCY AND HEALTH', ['Emergency contact name and phone', 'Allergies or medical conditions the school should know about']]
  ]
});
add('education', 'Student Agreement', {
  kind: 'agreement',
  description: 'Student commitments on conduct, attendance and fees',
  parties: ['Institution', 'Student'],
  sections: [
    ['PROGRAM', 'The Student is enrolled in [Program Name] from [Start Date] to [End Date].'],
    ['ATTENDANCE AND PARTICIPATION', 'The Student will attend at least [Percentage] of scheduled classes and complete assessments on time.'],
    ['CONDUCT', 'The Student will follow the code of conduct and academic integrity policy of the Institution.'],
    ['FEES', 'Tuition of [Amount] is payable [per term or year] by [Due Dates]. Refunds follow the Institution\'s refund policy.'],
    ['USE OF FACILITIES', 'The Student will use campus facilities, equipment and IT systems responsibly.'],
    ['WITHDRAWAL', 'The Student may withdraw by written notice to [Office]. The Institution may suspend or withdraw a student for serious misconduct after due process.']
  ]
});
add('education', 'Parent Consent Form', {
  kind: 'consent',
  description: 'Parent or guardian consent for a school activity or program',
  intro: 'Student: [Student Name]\nClass or grade: [Class]\nActivity or program: [Activity Name]\nDate: [Date]',
  sections: [
    ['ACTIVITY DETAILS', '[Description, location, dates, transport and supervision.]'],
    ['CONSENT', 'I give permission for my child to take part in the activity described above.'],
    ['MEDICAL', 'Relevant medical information: [Medical Information]. In an emergency, I authorise staff to obtain medical treatment for my child.'],
    ['PHOTOGRAPHS', '[ ] I agree that photographs of my child taken during the activity may be used in school publications.']
  ],
  closing: 'Signed by the parent or legal guardian.'
});
add('education', 'Course Enrollment Agreement', {
  kind: 'agreement',
  description: 'Enrollment in a course with fees, schedule and refund policy',
  parties: ['Provider', 'Student'],
  sections: [
    ['COURSE', 'The Student enrolls in [Course Name], delivered [Online or In Person] from [Start Date] to [End Date].'],
    ['FEES AND PAYMENT', 'The course fee is [Amount], payable [in full or in instalments] by [Due Date].'],
    ['COURSE MATERIALS', 'Course materials are provided for the Student\'s personal use and may not be shared or resold.'],
    ['COMPLETION REQUIREMENTS', 'A certificate is issued on [Completion Requirements].'],
    ['CANCELLATION AND REFUNDS', 'The Student may cancel within [14] days for a full refund. After that, refunds are [Refund Policy].'],
    ['CHANGES', 'The Provider may change the schedule or instructor with notice. If the course is cancelled, fees are refunded in full.']
  ]
});
add('education', 'Training Agreement', {
  kind: 'agreement',
  description: 'Employer-funded training with repayment if the employee leaves early',
  parties: ['Employer', 'Employee'],
  sections: [
    ['TRAINING', 'The Employer will fund the Employee\'s participation in [Training Program] provided by [Provider], from [Start Date] to [End Date].'],
    ['COSTS', 'The Employer pays the training costs of [Amount], including [Fees, Travel and Materials].'],
    ['EMPLOYEE COMMITMENTS', 'The Employee will attend all sessions, complete the assessments and share key learnings with the team.'],
    ['REPAYMENT', 'If the Employee resigns within [12] months of completing the training, they will repay a proportion of the costs: [100%] within [6] months and [50%] within [12] months, as permitted by law.'],
    ['TIME OFF', 'Training during working hours is paid time.']
  ]
});
add('education', 'Internship Agreement', {
  id: 'education-internship',
  kind: 'agreement',
  description: 'Three-way internship agreement between institution, host and student',
  parties: ['Institution', 'Host Organization'],
  intro: 'This Internship Agreement is made on [Date] between [Institution Name] (the "Institution"), [Host Organization Name] (the "Host Organization") and [Student Name] (the "Student").',
  sections: [
    ['INTERNSHIP DETAILS', 'The Student will complete an internship in [Field or Department] at the Host Organization from [Start Date] to [End Date], for [Hours] hours per week.'],
    ['LEARNING OUTCOMES', 'The internship aims to develop the following skills: [Learning Outcomes], which count towards [Course or Credits].'],
    ['SUPERVISION AND ASSESSMENT', 'The Host Organization appoints [Supervisor Name] to supervise the Student and complete an evaluation. The Institution appoints [Academic Supervisor Name] as academic contact.'],
    ['STUDENT RESPONSIBILITIES', 'The Student will follow the Host Organization\'s rules, keep its information confidential and report any concerns to both supervisors.'],
    ['INSURANCE AND SAFETY', 'The Host Organization provides a safe workplace and appropriate induction. Insurance is covered by [Institution or Host Organization].']
  ]
});
add('education', 'Student Information Form', {
  kind: 'form',
  description: 'Student record update with contacts and academic details',
  intro: 'Institution: [Institution Name]\nStudent ID: [Student ID]',
  fields: [
    ['STUDENT', ['Full name', 'Date of birth', 'Program or grade', 'Year of study']],
    ['CONTACT', ['Address', 'Phone', 'Email']],
    ['PARENT OR GUARDIAN', ['Name', 'Phone', 'Email']],
    ['EMERGENCY CONTACT', ['Name', 'Relationship', 'Phone']],
    ['SUPPORT NEEDS (OPTIONAL)', ['Learning support needs', 'Accessibility requirements']]
  ]
});
add('education', 'School Policy Acknowledgment', {
  kind: 'acknowledgment',
  description: 'Student and parent acknowledge school policies',
  intro: 'Student: [Student Name]\nClass or grade: [Class]\nSchool year: [Year]',
  sections: [
    ['POLICIES RECEIVED', 'We have received and read the following policies of [School Name]: [Code of Conduct, Attendance, Acceptable Use of Technology, Anti-Bullying and others].'],
    ['COMMITMENT', 'The student agrees to follow these policies, and the parent or guardian agrees to support the school in applying them.'],
    ['CONSEQUENCES', 'We understand that breaches of school policies may lead to the consequences described in the policies.']
  ],
  closing: 'Signed by the student and parent or guardian.'
});
add('education', 'Permission Form', {
  kind: 'consent',
  description: 'Permission slip for a trip, event or activity',
  intro: 'Student: [Student Name]\nEvent: [Event Name]\nDate and time: [Date, Time]\nLocation: [Location]',
  sections: [
    ['DETAILS', 'Transport: [Transport]\nCost: [Amount or free]\nSupervising staff: [Names]\nWhat to bring: [Items]'],
    ['PERMISSION', 'I give permission for my child to attend the event above and to travel with the school staff.'],
    ['EMERGENCY CONTACT', 'Name and phone on the day: [Name, Phone]']
  ],
  closing: 'Signed by the parent or legal guardian.'
});
add('education', 'Educational Service Agreement', {
  kind: 'agreement',
  description: 'Tutoring or educational services with schedule, fees and cancellation',
  parties: ['Provider', 'Client'],
  sections: [
    ['SERVICES', 'The Provider will deliver [Tutoring, Coaching or Educational Services] in [Subjects] for [Student Name].'],
    ['SCHEDULE', 'Sessions take place [Frequency] on [Days and Times], [Online or at Location], starting [Start Date].'],
    ['FEES', 'Fees are [Amount] per session or [Package Price] per package, payable [in advance].'],
    ['CANCELLATION', 'Sessions cancelled with less than [24] hours\' notice are charged in full. The Provider will reschedule sessions it cancels.'],
    ['PROGRESS REPORTS', 'The Provider will share progress updates [monthly].'],
    ['SAFEGUARDING', 'The Provider follows safeguarding practices appropriate for working with [minors or students].']
  ]
});

// I. Procurement & Vendors
add('procurement', 'Vendor Onboarding Form', {
  kind: 'form',
  description: 'New vendor registration: company, contacts, tax, banking and compliance',
  intro: 'Please complete this form to be set up as a vendor of [Company Name].',
  fields: [
    ['COMPANY INFORMATION', ['Legal name', 'Trading name', 'Registered address', 'Registration number', 'Tax ID', 'Website']],
    ['CONTACTS', ['Sales contact - name, email, phone', 'Accounts receivable contact - name, email, phone']],
    ['PRODUCTS AND SERVICES', ['Categories supplied', 'Lead times', 'Minimum order value']],
    ['BANKING', ['Bank name', 'Account ending in (last 4 digits; full details are collected via secure bank verification)']],
    ['COMPLIANCE', ['Insurance coverage and expiry', 'Certifications (ISO or other)', 'Sanctions or debarment (yes or no)']]
  ]
});
add('procurement', 'Vendor Agreement', { shared: 'vendor-agreement', description: 'Goods or services from a vendor with pricing, delivery and quality terms' });
add('procurement', 'Supplier Agreement', { shared: 'supplier-agreement', description: 'Ongoing supply of products with forecasts, delivery, inspection and warranties' });
add('procurement', 'Purchase Order Approval', {
  kind: 'approval',
  description: 'Approval of a purchase order before it is issued to a supplier',
  intro: 'PO number: [PO Number]\nSupplier: [Supplier Name]\nRequested by: [Requester Name, Department]\nTotal value: [Amount and Currency]',
  sections: [
    ['ITEMS', 'Item 1: [Description, Quantity, Unit Price]\nItem 2: [Description, Quantity, Unit Price]'],
    ['JUSTIFICATION', '[Business need and why this supplier was selected.]'],
    ['BUDGET', 'Cost centre: [Cost Centre]\nBudget available: [Yes or No]'],
    ['APPROVAL', 'I approve this purchase order and confirm it complies with the procurement policy and my approval limit.']
  ],
  closing: 'Approved by the budget holder and procurement.'
});
add('procurement', 'Supplier NDA', {
  kind: 'agreement',
  description: 'Supplier keeps the buyer\'s specifications, pricing and plans confidential',
  parties: ['Company', 'Supplier'],
  sections: [
    ['CONFIDENTIAL INFORMATION', 'Confidential information includes the Company\'s specifications, drawings, forecasts, pricing, volumes, product plans and any information shared during tenders or supply.'],
    ['USE AND PROTECTION', 'The Supplier will use confidential information only to quote for or supply the Company, limit access to staff who need it, and protect it with reasonable security measures.'],
    ['SUBCONTRACTORS', 'The Supplier may share confidential information with subcontractors only with the Company\'s written consent and under equivalent confidentiality obligations.'],
    ['PUBLICITY', 'The Supplier will not name the Company as a customer or publicise the relationship without prior written consent.'],
    ['DURATION AND RETURN', 'Obligations last [5] years from the last disclosure. On request, the Supplier will return or destroy all confidential information.']
  ]
});
add('procurement', 'Vendor Information Form', {
  kind: 'form',
  description: 'Vendor master-data update: addresses, contacts and payment terms',
  intro: 'Vendor number (if known): [Vendor Number]',
  fields: [
    ['VENDOR', ['Legal name', 'Address', 'Tax ID']],
    ['ORDERING', ['Order email', 'Order phone', 'Remit-to address']],
    ['PAYMENT', ['Payment terms', 'Currency', 'Account ending in (last 4 digits)']],
    ['CLASSIFICATION', ['Business size', 'Diversity certifications (optional)']]
  ]
});
add('procurement', 'Procurement Approval', {
  kind: 'approval',
  description: 'Approval of a sourcing decision or supplier selection',
  intro: 'Request: [Request Title]\nEstimated value: [Amount]\nRequesting department: [Department]',
  sections: [
    ['REQUIREMENT', '[Description of goods or services needed and why.]'],
    ['SOURCING METHOD', '[Quotes, tender or single source], with [Number] suppliers evaluated.'],
    ['RECOMMENDED SUPPLIER', '[Supplier Name], selected because [Reasons, for example price, quality and delivery].'],
    ['APPROVAL', 'The signers approve the procurement described above and confirm that no conflicts of interest exist.']
  ],
  closing: 'Approved by the authorised signers.'
});
add('procurement', 'Contractor Agreement', {
  kind: 'agreement',
  description: 'On-site or project contractor work with safety and insurance terms',
  parties: ['Company', 'Contractor'],
  sections: [
    ['WORK', 'The Contractor will perform [Description of Work] at [Site] (the "Work") in accordance with [Specifications or Drawings].'],
    ['SCHEDULE', 'The Work starts on [Start Date] and is completed by [Completion Date].'],
    ['PRICE AND PAYMENT', 'The contract price is [Amount], paid in stages: [Payment Stages]. Variations must be approved in writing before work begins.'],
    ['HEALTH AND SAFETY', 'The Contractor complies with all health and safety laws and site rules and is responsible for the safety of its workers.'],
    ['INSURANCE', 'The Contractor maintains public liability insurance of at least [Amount] and workers\' compensation insurance as required by law.'],
    ['DEFECTS', 'The Contractor repairs defects reported within [12] months of completion at its own cost.']
  ]
});
add('procurement', 'Service Provider Agreement', {
  kind: 'agreement',
  description: 'Outsourced services with service levels and reporting',
  parties: ['Company', 'Service Provider'],
  sections: [
    ['SERVICES', 'The Service Provider will provide [Services] as described in [Service Description].'],
    ['SERVICE LEVELS', 'The Service Provider will meet the service levels in [Service Level Schedule]. If a service level is missed, service credits of [Percentage] of the monthly fee apply.'],
    ['FEES', 'The Company pays [Monthly Fee], invoiced monthly in arrears and payable within [30] days.'],
    ['REPORTING AND REVIEWS', 'The Service Provider reports performance [monthly] and attends quarterly review meetings.'],
    ['DATA PROTECTION', 'The Service Provider processes Company data only on the Company\'s instructions and applies appropriate security measures.'],
    ['TERM AND EXIT', 'The Agreement lasts [Term]. On exit, the Service Provider will cooperate in transferring the services and return all Company data.']
  ]
});
add('procurement', 'Vendor Compliance Acknowledgment', {
  kind: 'acknowledgment',
  description: 'Vendor confirms compliance with the supplier code of conduct',
  intro: 'Vendor: [Vendor Name]\nSigned by: [Name, Title]',
  sections: [
    ['CODE OF CONDUCT', 'The Vendor has received and read the [Company Name] Supplier Code of Conduct.'],
    ['COMPLIANCE COMMITMENTS', 'The Vendor will comply with applicable laws on anti-bribery and corruption, fair labour, health and safety, environment, data protection and sanctions.'],
    ['AUDITS', 'The Vendor will cooperate with reasonable compliance audits and provide information on request.'],
    ['REPORTING', 'The Vendor will report any suspected breach to [Contact Email] promptly.']
  ],
  closing: 'Signed by an authorised representative of the Vendor.'
});

// ---- Content builder ----
const slugify = (value) => String(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function numbered(sections, start = 1) {
  return sections.map(([heading, body], i) => `${start + i}. ${heading}\n${body}`);
}

function buildContent(t) {
  if (t.kind === 'letter') return t.text;
  const title = t.name.toUpperCase().replace(/\s*\/\s*/g, ' AND ');
  const blocks = [title];

  if (t.kind === 'agreement') {
    const [a, b] = t.parties || ['First Party', 'Second Party'];
    blocks.push(t.intro || `This ${t.name} (the "Agreement") is made on [Effective Date] (the "Effective Date") between [${a} Name], of [${a} Address] (the "${a}"), and [${b} Name], of [${b} Address] (the "${b}").`);
    if (t.purpose) blocks.push(t.purpose);
    const sections = t.noGeneral ? t.sections : [...t.sections, ...GENERAL_TERMS];
    blocks.push(...numbered(sections));
    blocks.push(`SIGNATURES\n${t.closing || `By signing below, the ${a} and the ${b} agree to the terms of this Agreement.`}`);
    return blocks.join('\n\n');
  }

  if (t.intro) blocks.push(t.intro);
  if (t.kind === 'form' || t.kind === 'checklist') {
    const fieldSections = t.fields.map(([heading, labels]) => [heading, labels.map(blank).join('\n')]);
    const sections = [...fieldSections, ...(t.extra || [])];
    blocks.push(...numbered(sections));
    blocks.push(`${t.kind === 'checklist' ? 'CONFIRMATION' : 'DECLARATION'}\n${t.closing || DECLARATION}`);
    return blocks.join('\n\n');
  }

  blocks.push(...numbered(t.sections));
  blocks.push(`CONFIRMATION\n${t.closing || ACKNOWLEDGE}`);
  return blocks.join('\n\n');
}

// Ids: a template listed again under a second category ("shared") gets a category-prefixed id and the content of
// the template it points to
T.forEach((t) => {
  const slug = t.id || slugify(t.name);
  t.id = t.shared ? `${t.category}-${slug}` : slug;
});
const byId = new Map(T.filter((t) => !t.shared).map((t) => [t.id, t]));

export const TEMPLATE_LIBRARY = T.map((t) => {
  const category = TEMPLATE_CATEGORIES.find((c) => c.id === t.category);
  const source = t.shared ? byId.get(t.shared) : t;
  return {
    id: `lib-${t.id}`,
    source: 'library',
    name: t.name,
    category: t.category,
    categoryLabel: category.label,
    kind: source.kind,
    kindLabel: TEMPLATE_KINDS[source.kind],
    description: t.description,
    parties: source.parties || [],
    notice: category.notice || '',
    content: buildContent(source)
  };
});

export const getCategory = (id) => TEMPLATE_CATEGORIES.find((c) => c.id === id) || null;

/** Library template whose name matches a document name ("Service Agreement.pdf" -> Service Agreement). */
export function findLibraryTemplateByName(docName) {
  const name = String(docName || '').replace(/\.pdf$/i, '').trim().toLowerCase();
  return TEMPLATE_LIBRARY.find((t) => t.name.toLowerCase() === name) || null;
}

const wordsOf = (value) => String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Search relevance of a template: every query word must start a word of the name, description, category or type
 * ("lease" finds "Lease Agreement", not "Release"). Name matches rank first. 0 = no match.
 */
export function templateScore(template, query) {
  const queryWords = wordsOf(query);
  if (queryWords.length === 0) return 1;
  const nameWords = wordsOf(template.name);
  const otherWords = [...wordsOf(template.description), ...wordsOf(template.categoryLabel), ...wordsOf(template.kindLabel)];
  let score = 0;
  for (const word of queryWords) {
    if (nameWords.some((w) => w.startsWith(word))) score += 3;
    else if (otherWords.some((w) => w.startsWith(word))) score += 1;
    else return 0;
  }
  if (String(template.name).toLowerCase().startsWith(String(query).trim().toLowerCase())) score += 2;
  return score;
}

/** Search across name, description, category and type. */
export const templateMatches = (template, query) => templateScore(template, query) > 0;

/** Templates matching a query, best matches first (the given order is kept for equal matches and no query). */
export function searchTemplates(templates, query) {
  if (!String(query || '').trim()) return templates;
  return templates
    .map((t, i) => ({ t, i, score: templateScore(t, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.t);
}

/** Plain-text preview line count helper for cards. */
export const templateWordCount = (content) => String(content || '').split(/\s+/).filter(Boolean).length;
