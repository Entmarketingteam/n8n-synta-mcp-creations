/**
 * FOIA Request Manager — generates, tracks, and schedules
 * Kentucky Open Records Act (KRS 61.872) requests for the Kentucky Trio.
 *
 * Automates the recurring cycle of requesting:
 *   - Water shut-off lists (utility departments)
 *   - Expired/abandoned permits (building inspection)
 *   - Nuisance lien reports (code enforcement)
 *   - Delinquent tax lists (sheriff's office)
 */

const { getDb } = require('../db');
const { v4: uuidv4 } = require('uuid');

// Pre-configured agencies for the Kentucky Trio
const AGENCIES = {
  fayette: {
    water_shutoff: {
      agency: 'Kentucky American Water / LFUCG Utility',
      email: '',
      recipientName: 'Records Custodian',
    },
    nuisance_liens: {
      agency: 'LFUCG Code Enforcement',
      email: '',
      recipientName: 'Records Custodian',
    },
    delinquent_taxes: {
      agency: 'Fayette County Sheriff\'s Office',
      email: '',
      recipientName: 'Records Custodian',
    },
    expired_permits: {
      agency: 'LFUCG Division of Building Inspection',
      email: '',
      recipientName: 'Records Custodian',
    },
  },
  scott: {
    water_shutoff: {
      agency: 'Georgetown Municipal Water & Sewer',
      email: '',
      recipientName: 'Records Custodian',
    },
    expired_permits: {
      agency: 'Scott County Building Inspection',
      email: '',
      recipientName: 'Records Custodian',
    },
    delinquent_taxes: {
      agency: 'Scott County Sheriff\'s Office',
      email: '',
      recipientName: 'Records Custodian',
    },
  },
  oldham: {
    water_shutoff: {
      agency: 'Oldham County Water District',
      email: '',
      recipientName: 'Records Custodian',
    },
    expired_permits: {
      agency: 'Oldham County Inspections Office',
      email: '',
      recipientName: 'Chief Building Inspector',
    },
    delinquent_taxes: {
      agency: 'Oldham County Sheriff\'s Office',
      email: '',
      recipientName: 'Records Custodian',
    },
  },
};

/**
 * FOIA request templates that bypass common privacy objections
 */
const TEMPLATES = {
  water_shutoff: {
    subject: 'Open Records Request - KRS 61.872 - Utility Disconnection Data',
    body: (county, startDate, endDate) => `Dear Records Custodian,

Under the Kentucky Open Records Act (KRS 61.872 et seq.), I am requesting an electronic copy (CSV or Excel preferred) of the following public records:

1. A list of all residential properties within ${county} County that have received a Water Service Disconnection Order for non-payment between ${startDate} and ${endDate}.

2. I am requesting the Physical Property Address and Date of Disconnection only.

I am a resident of the Commonwealth of Kentucky as defined by KRS 61.870(10). This request is for non-commercial research purposes.

Please provide these records in their original electronic format to avoid printing costs. If you deny any part of this request, please cite the specific statutory exemption per KRS 61.880(1).

I understand you have three (3) business days to respond per KRS 61.880.

Thank you for your prompt attention to this matter.

Sincerely,
[YOUR_NAME]
[YOUR_ADDRESS]
[YOUR_PHONE]`,
  },

  expired_permits: {
    subject: 'Open Records Request - KRS 61.872 - Expired Building Permits',
    body: (county, startDate, endDate) => `Dear Records Custodian,

Under the Kentucky Open Records Act (KRS 61.872 et seq.), I am requesting an electronic copy of the following public records:

1. A list of all residential building permits in ${county} County that have expired, been suspended, or abandoned (no inspection activity for 180+ days) between ${startDate} and ${endDate}.

2. For each record, I request: Property Address, Permit Number, Permit Type, Date Issued, and Date of Expiration/Suspension.

This request is for non-commercial research purposes. Please provide records in electronic format (CSV, Excel, or PDF).

If you deny any part of this request, please cite the specific statutory exemption per KRS 61.880(1).

Sincerely,
[YOUR_NAME]
[YOUR_ADDRESS]
[YOUR_PHONE]`,
  },

  nuisance_liens: {
    subject: 'Open Records Request - KRS 61.872 - Code Enforcement Abatements',
    body: (county, startDate, endDate) => `Dear Records Custodian,

Under the Kentucky Open Records Act (KRS 61.872 et seq.), I am requesting an electronic copy of the following public records:

1. A list of all residential properties in ${county} County with active Nuisance Liens or Code Enforcement Abatement actions between ${startDate} and ${endDate}.

2. For each record, I request: Property Address, Violation Type, Abatement Date, and Lien Amount (if applicable).

This request is for non-commercial research purposes. Please provide records in electronic format.

If you deny any part of this request, please cite the specific statutory exemption per KRS 61.880(1).

Sincerely,
[YOUR_NAME]
[YOUR_ADDRESS]
[YOUR_PHONE]`,
  },

  delinquent_taxes: {
    subject: 'Open Records Request - KRS 61.872 - Delinquent Property Tax Records',
    body: (county, startDate, endDate) => `Dear Records Custodian,

Under the Kentucky Open Records Act (KRS 61.872 et seq.), I am requesting an electronic copy of the following public records:

1. A list of all residential properties in ${county} County with delinquent property taxes (Certificates of Delinquency) for the tax year ending ${endDate}.

2. For each record, I request: Property Address, Parcel ID, Tax Amount Due, and Certificate of Delinquency Number (Instrument Number).

These records are public under KRS 134.128 and KRS 134.504. Please provide in electronic format.

If you deny any part of this request, please cite the specific statutory exemption per KRS 61.880(1).

Sincerely,
[YOUR_NAME]
[YOUR_ADDRESS]
[YOUR_PHONE]`,
  },
};

/**
 * Generate a FOIA request (creates in DB with status 'draft')
 */
function createFoiaRequest(county, requestType, overrides = {}) {
  const db = getDb();
  const countyLower = county.toLowerCase();

  const agencyInfo = AGENCIES[countyLower]?.[requestType];
  const template = TEMPLATES[requestType];
  if (!template) throw new Error(`Unknown request type: ${requestType}`);

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = d => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

  const countyProper = county.charAt(0).toUpperCase() + county.slice(1);
  const body = template.body(countyProper, formatDate(startDate), formatDate(now));

  const id = uuidv4();
  const nextSend = new Date(now);
  nextSend.setDate(nextSend.getDate() + (overrides.recurrenceDays || 30));

  db.prepare(`
    INSERT INTO foia_requests (id, county, agency, request_type, recipient_email, recipient_name, subject, body, status, next_send_date, recurrence_days, auto_send)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
  `).run(
    id,
    countyLower,
    overrides.agency || agencyInfo?.agency || `${countyProper} County`,
    requestType,
    overrides.recipientEmail || agencyInfo?.email || '',
    overrides.recipientName || agencyInfo?.recipientName || 'Records Custodian',
    overrides.subject || template.subject,
    overrides.body || body,
    nextSend.toISOString().split('T')[0],
    overrides.recurrenceDays || 30,
    overrides.autoSend ? 1 : 0
  );

  return { id, subject: template.subject, agency: agencyInfo?.agency };
}

/**
 * Get all FOIA requests, optionally filtered
 */
function getFoiaRequests(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM foia_requests';
  const conditions = [];
  const params = [];

  if (filters.county) {
    conditions.push('county = ?');
    params.push(filters.county.toLowerCase());
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.requestType) {
    conditions.push('request_type = ?');
    params.push(filters.requestType);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all(...params);
}

/**
 * Get requests that are due to be sent (auto_send = 1 and next_send_date <= today)
 */
function getDueRequests() {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM foia_requests
    WHERE auto_send = 1 AND status IN ('draft', 'received')
      AND next_send_date <= date('now')
    ORDER BY next_send_date ASC
  `).all();
}

/**
 * Mark a request as sent, advance next_send_date
 */
function markSent(id) {
  const db = getDb();
  const req = db.prepare('SELECT * FROM foia_requests WHERE id = ?').get(id);
  if (!req) throw new Error('FOIA request not found');

  const nextSend = new Date();
  nextSend.setDate(nextSend.getDate() + (req.recurrence_days || 30));

  db.prepare(`
    UPDATE foia_requests
    SET status = 'sent', sent_at = datetime('now'), next_send_date = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(nextSend.toISOString().split('T')[0], id);
}

/**
 * Mark response received
 */
function markReceived(id, notes, recordsCount) {
  const db = getDb();
  db.prepare(`
    UPDATE foia_requests
    SET status = 'received', response_received_at = datetime('now'), response_notes = ?, records_count = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(notes || '', recordsCount || 0, id);
}

module.exports = {
  AGENCIES,
  TEMPLATES,
  createFoiaRequest,
  getFoiaRequests,
  getDueRequests,
  markSent,
  markReceived,
};
