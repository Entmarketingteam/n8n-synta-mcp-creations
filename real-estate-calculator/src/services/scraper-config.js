/**
 * Scraper Configuration — county-specific selectors and URLs
 * for the Kentucky Trio's public record portals.
 *
 * This module provides the "Site Class" definitions that a Playwright
 * scraper would use to navigate each county's portal.
 *
 * Note: Actual browser automation requires Playwright to be installed
 * and is triggered via the /api/distressed/scrape endpoint or an n8n cron.
 */

const COUNTY_CONFIGS = {
  scott: {
    name: 'Scott County',
    system: 'ecclix',
    portalUrl: 'https://scottcountyclerk.com',
    instrumentTypes: {
      lis_pendens: 'LIS',
      probate: 'PROB',
      tax_lien: 'TAXL',
    },
    selectors: {
      loginUser: 'input[name*="txtUsername"]',
      loginPass: 'input[name*="txtPassword"]',
      loginSubmit: 'input[type="submit"]',
      instrumentSearch: 'text="Search by Instrument Type"',
      instrumentDropdown: 'select#ddlInstrumentType',
      startDate: 'input#txtStartDate',
      endDate: 'input#txtEndDate',
      searchButton: 'button#btnSearch',
      resultsTable: 'table#gvResults',
      resultRows: 'tr.grid-row',
      columns: {
        date: 'td:nth-child(1)',
        instrumentNumber: 'td:nth-child(2)',
        grantor: 'td:nth-child(3)',
        grantee: 'td:nth-child(4)',
        description: 'td:nth-child(5)',
        parcel: 'td:nth-child(6)',
      },
    },
    rateLimit: { maxPerDay: 50, delayMs: 2000 },
    requiresLogin: true,
    loginType: 'subscriber', // guest or subscriber
  },

  oldham: {
    name: 'Oldham County',
    system: 'ecclix',
    portalUrl: 'https://oldhamcountyclerk.com',
    instrumentTypes: {
      lis_pendens: 'LIS',
      probate: 'PROB',
      tax_lien: 'TAXL',
    },
    selectors: {
      loginUser: 'input[name*="txtUsername"]',
      loginPass: 'input[name*="txtPassword"]',
      loginSubmit: 'input[type="submit"]',
      instrumentSearch: 'text="Search by Instrument Type"',
      instrumentDropdown: 'select#ddlInstrumentType',
      startDate: 'input#txtStartDate',
      endDate: 'input#txtEndDate',
      searchButton: 'button#btnSearch',
      resultsTable: 'table#gvResults',
      resultRows: 'tr.grid-row',
      columns: {
        date: 'td:nth-child(1)',
        instrumentNumber: 'td:nth-child(2)',
        grantor: 'td:nth-child(3)',
        grantee: 'td:nth-child(4)',
        description: 'td:nth-child(5)',
        parcel: 'td:nth-child(6)',
      },
    },
    rateLimit: { maxPerDay: 50, delayMs: 2000 },
    requiresLogin: true,
    loginType: 'subscriber',
  },

  fayette: {
    name: 'Fayette County',
    system: 'custom',
    courtPortalUrl: 'https://courts.ky.gov',
    pvaUrl: 'https://qpublic.net/ky/fayette/',
    codeEnforcementUrl: 'https://data.lexingtonky.gov',
    instrumentTypes: {
      lis_pendens: 'FORECLOSURE',
      probate: 'PROBATE',
      code_violation: 'CODE_VIOLATION',
    },
    selectors: {
      // Court portal
      courtSearch: 'input#searchBox',
      courtCountyDropdown: 'select#county',
      courtCaseType: 'select#caseType',
      courtResults: 'table.case-results',
      courtRows: 'tr.case-row',
      // PVA (QPublic)
      pvaAcceptTerms: 'button#acceptTerms',
      pvaSearchInput: 'input#searchInput',
      pvaSearchButton: 'button#searchButton',
      pvaResultsTable: 'table.results',
      // Code Enforcement (Socrata/Open Data)
      codeApiEndpoint: '/resource/code-violations.json',
    },
    rateLimit: { maxPerDay: 100, delayMs: 1500 },
    requiresLogin: false,
    // Fayette Open Data API (Socrata) is often JSON-accessible
    openDataApi: {
      baseUrl: 'https://data.lexingtonky.gov/resource/',
      codeViolations: 'code-violations.json',
      buildingPermits: 'building-permits.json',
    },
  },
};

/**
 * Zoning configurations for recovery/care facility opportunities
 */
const ZONING_RULES = {
  fayette: {
    allowedZones: ['R-3', 'B-1', 'P-1'],
    requiresCup: true,
    requiresRecoveryLicense: true,
    licenseFee: 200,
    maxOccupancyR1: 4,
    fairHousingAccommodation: true,
    notes: 'R-1 requires Reasonable Accommodation under FHA to exceed 4-person occupancy',
    boardOfAdjustment: 'LFUCG Board of Adjustment',
    planningCommission: 'LFUCG Planning Commission',
  },
  scott: {
    allowedZones: ['A-1R', 'R-2'],
    requiresCup: true,
    requiresRecoveryLicense: false,
    largeTractMinAcres: 20,
    fenceRequirement: '6-foot no-climb',
    drivewayWidth: 20, // feet, for fire access
    notes: 'Ordinance 23-10 allows residential care in A-1R with fire/water standards',
    planningCommission: 'Georgetown-Scott County Planning',
  },
  oldham: {
    allowedZones: ['any_residential'],
    requiresCup: false,
    requiresRecoveryLicense: false,
    ordinanceRef: 'Sec. 250-075',
    disabilityProtection: true,
    notes: 'Residential Care Facility permitted in any residential district, same area/height rules. No CUP needed for disability-related.',
    caveat: 'Must follow zone-specific occupancy limits',
  },
};

/**
 * Signal types and their descriptions
 */
const SIGNAL_TYPES = [
  { id: 'lis_pendens', label: 'Lis Pendens (Pre-Foreclosure)', severity: 4, urgency: 40, description: 'Suit pending — earliest legal signal of homeowner distress.' },
  { id: 'probate', label: 'Probate Filing', severity: 3, urgency: 50, description: 'Property owner deceased, heirs may want quick liquidation.' },
  { id: 'tax_lien', label: 'Tax Lien / Certificate of Delinquency', severity: 4, urgency: 35, description: 'Delinquent property taxes recorded as lien.' },
  { id: 'water_shutoff', label: 'Water Shut-off', severity: 5, urgency: 50, description: 'Property likely vacant or in severe distress.' },
  { id: 'nuisance_lien', label: 'Nuisance Lien / Code Abatement', severity: 3, urgency: 30, description: 'City performed abatement and billed owner.' },
  { id: 'code_violation', label: 'Code Violation', severity: 2, urgency: 20, description: 'Tall grass, boarded windows, structural nuisance.' },
  { id: 'expired_permit', label: 'Expired / Abandoned Permit', severity: 3, urgency: 25, description: 'Renovation stopped mid-way, owner likely stuck.' },
  { id: 'sale_cancellation', label: 'Master Commissioner Sale Cancellation', severity: 4, urgency: 45, description: 'Auction cancelled — owner in desperate 11th-hour situation.' },
  { id: 'absentee_owner', label: 'Absentee Owner', severity: 1, urgency: 15, description: 'Mailing address differs from property — possible tired landlord.' },
  { id: 'burnout', label: 'Fire Damage / Burnout', severity: 5, urgency: 55, description: 'Fire-damaged with no reconstruction permit pulled.' },
];

module.exports = { COUNTY_CONFIGS, ZONING_RULES, SIGNAL_TYPES };
