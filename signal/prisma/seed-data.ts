/**
 * Static reference data for the seed: companies, people and campaign
 * definitions. Kept separate from the seeding logic so the data is easy to read
 * and extend.
 */
import {
  ClientRelationship,
  ConsentRequirement,
  DataConfidence,
  EmployeeBand,
  RevenueBand,
  RoleCategory,
  Seniority,
} from '@prisma/client';

export interface SeedCompany {
  companyName: string;
  domain: string;
  industry: string;
  subIndustry: string;
  country: string;
  city: string;
  employeeBand: EmployeeBand;
  revenueBand: RevenueBand;
  existingTechnology: string[];
  competitorTechnology: string[];
  namedAccountStatus: boolean;
  existingClientRelationship: ClientRelationship;
  /** Strength of the trigger profile: rich accounts drive P1 candidates. */
  triggerProfile: 'rich' | 'moderate' | 'thin' | 'none';
  recentBusinessTrigger: string | null;
  dataConfidence: DataConfidence;
}

export const COMPANIES: SeedCompany[] = [
  // --- Canada --------------------------------------------------------------
  { companyName: 'Northwind Utilities', domain: 'northwind-utilities.example', industry: 'Utilities', subIndustry: 'Electricity Distribution', country: 'Canada', city: 'Toronto', employeeBand: EmployeeBand.BAND_5001_10000, revenueBand: RevenueBand.FROM_1B_5B, existingTechnology: ['Salesforce Service Cloud', 'SAP'], competitorTechnology: [], namedAccountStatus: true, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'rich', recentBusinessTrigger: 'a publicly announced three-year customer-service modernisation programme', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Maple Ridge Financial', domain: 'mapleridge.example', industry: 'Banking', subIndustry: 'Retail Banking', country: 'Canada', city: 'Montreal', employeeBand: EmployeeBand.BAND_1001_5000, revenueBand: RevenueBand.FROM_1B_5B, existingTechnology: ['Genesys'], competitorTechnology: ['Avaya'], namedAccountStatus: true, existingClientRelationship: ClientRelationship.PAST_CLIENT, triggerProfile: 'rich', recentBusinessTrigger: 'a new Chief Customer Officer appointed in January', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Cascadia Telecom', domain: 'cascadiatelecom.example', industry: 'Telecommunications', subIndustry: 'Mobile Network Operator', country: 'Canada', city: 'Vancouver', employeeBand: EmployeeBand.BAND_5001_10000, revenueBand: RevenueBand.FROM_1B_5B, existingTechnology: ['Genesys', 'Zendesk'], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'moderate', recentBusinessTrigger: 'regulatory pressure on complaint-handling times', dataConfidence: DataConfidence.MEDIUM },

  // --- Mexico --------------------------------------------------------------
  { companyName: 'Grupo Solaris Energia', domain: 'gruposolaris.example', industry: 'Energy', subIndustry: 'Renewable Generation', country: 'Mexico', city: 'Mexico City', employeeBand: EmployeeBand.BAND_1001_5000, revenueBand: RevenueBand.FROM_250M_1B, existingTechnology: ['SAP', 'OSIsoft PI'], competitorTechnology: [], namedAccountStatus: true, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'rich', recentBusinessTrigger: 'a grid digitalisation programme announced with the regulator', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Banco Azteca Norte', domain: 'bancoaztecanorte.example', industry: 'Banking', subIndustry: 'Retail Banking', country: 'Mexico', city: 'Monterrey', employeeBand: EmployeeBand.BAND_5001_10000, revenueBand: RevenueBand.FROM_1B_5B, existingTechnology: ['Salesforce Service Cloud'], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'moderate', recentBusinessTrigger: 'branch network restructuring', dataConfidence: DataConfidence.MEDIUM },
  { companyName: 'Retail Vista Mexico', domain: 'retailvista.example', industry: 'Retail', subIndustry: 'Grocery', country: 'Mexico', city: 'Guadalajara', employeeBand: EmployeeBand.BAND_10001_PLUS, revenueBand: RevenueBand.FROM_1B_5B, existingTechnology: ['Zendesk'], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'thin', recentBusinessTrigger: null, dataConfidence: DataConfidence.LOW },

  // --- France --------------------------------------------------------------
  { companyName: 'Lumiere Energie', domain: 'lumiere-energie.example', industry: 'Utilities', subIndustry: 'Electricity Distribution', country: 'France', city: 'Paris', employeeBand: EmployeeBand.BAND_10001_PLUS, revenueBand: RevenueBand.GT_5B, existingTechnology: ['SAP', 'Salesforce Service Cloud'], competitorTechnology: [], namedAccountStatus: true, existingClientRelationship: ClientRelationship.CURRENT_CLIENT, triggerProfile: 'rich', recentBusinessTrigger: 'a national smart-metering rollout entering its second phase', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Banque Rivage', domain: 'banquerivage.example', industry: 'Banking', subIndustry: 'Commercial Banking', country: 'France', city: 'Lyon', employeeBand: EmployeeBand.BAND_1001_5000, revenueBand: RevenueBand.FROM_250M_1B, existingTechnology: ['Genesys'], competitorTechnology: ['Avaya'], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'moderate', recentBusinessTrigger: 'new EU accessibility requirements for customer channels', dataConfidence: DataConfidence.MEDIUM },
  { companyName: 'Assurance Provence', domain: 'assuranceprovence.example', industry: 'Insurance', subIndustry: 'General Insurance', country: 'France', city: 'Marseille', employeeBand: EmployeeBand.BAND_501_1000, revenueBand: RevenueBand.FROM_250M_1B, existingTechnology: [], competitorTechnology: ['Zendesk'], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'thin', recentBusinessTrigger: null, dataConfidence: DataConfidence.MEDIUM },

  // --- Colombia ------------------------------------------------------------
  { companyName: 'Andes Servicios Publicos', domain: 'andesservicios.example', industry: 'Utilities', subIndustry: 'Water and Waste', country: 'Colombia', city: 'Bogota', employeeBand: EmployeeBand.BAND_1001_5000, revenueBand: RevenueBand.FROM_250M_1B, existingTechnology: ['SAP'], competitorTechnology: [], namedAccountStatus: true, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'rich', recentBusinessTrigger: 'a regulator-mandated service-quality improvement plan', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Caribe Telecom', domain: 'caribetelecom.example', industry: 'Telecommunications', subIndustry: 'Fixed Line', country: 'Colombia', city: 'Medellin', employeeBand: EmployeeBand.BAND_501_1000, revenueBand: RevenueBand.FROM_50M_250M, existingTechnology: ['Zendesk'], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'moderate', recentBusinessTrigger: 'a merger with a regional fibre operator', dataConfidence: DataConfidence.MEDIUM },

  // --- United Arab Emirates ------------------------------------------------
  { companyName: 'Gulf Power Holdings', domain: 'gulfpower.example', industry: 'Energy', subIndustry: 'Power Generation', country: 'United Arab Emirates', city: 'Abu Dhabi', employeeBand: EmployeeBand.BAND_5001_10000, revenueBand: RevenueBand.FROM_1B_5B, existingTechnology: ['OSIsoft PI', 'SAP'], competitorTechnology: [], namedAccountStatus: true, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'rich', recentBusinessTrigger: 'a digital operations centre programme announced at ADIPEC', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Emirates Retail Group', domain: 'emiratesretail.example', industry: 'Retail', subIndustry: 'Department Stores', country: 'United Arab Emirates', city: 'Dubai', employeeBand: EmployeeBand.BAND_1001_5000, revenueBand: RevenueBand.FROM_250M_1B, existingTechnology: ['Salesforce Service Cloud'], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.PROSPECT_IN_PIPELINE, triggerProfile: 'moderate', recentBusinessTrigger: 'expansion into two new markets', dataConfidence: DataConfidence.MEDIUM },
  { companyName: 'Dubai Logistics Authority', domain: 'dubailogistics.example', industry: 'Transportation and Logistics', subIndustry: 'Ports', country: 'United Arab Emirates', city: 'Dubai', employeeBand: EmployeeBand.BAND_5001_10000, revenueBand: RevenueBand.FROM_1B_5B, existingTechnology: [], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'thin', recentBusinessTrigger: null, dataConfidence: DataConfidence.LOW },

  // --- Saudi Arabia --------------------------------------------------------
  { companyName: 'Riyadh National Energy', domain: 'riyadhenergy.example', industry: 'Energy', subIndustry: 'Oil and Gas', country: 'Saudi Arabia', city: 'Riyadh', employeeBand: EmployeeBand.BAND_10001_PLUS, revenueBand: RevenueBand.GT_5B, existingTechnology: ['OSIsoft PI', 'SAP'], competitorTechnology: [], namedAccountStatus: true, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'rich', recentBusinessTrigger: 'a Vision 2030 asset-digitalisation mandate', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Al Faisal Bank', domain: 'alfaisalbank.example', industry: 'Banking', subIndustry: 'Islamic Banking', country: 'Saudi Arabia', city: 'Jeddah', employeeBand: EmployeeBand.BAND_1001_5000, revenueBand: RevenueBand.FROM_1B_5B, existingTechnology: ['Genesys'], competitorTechnology: [], namedAccountStatus: true, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'rich', recentBusinessTrigger: 'a customer-service automation pilot reported in the trade press', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Kingdom Health Services', domain: 'kingdomhealth.example', industry: 'Healthcare', subIndustry: 'Hospital Group', country: 'Saudi Arabia', city: 'Riyadh', employeeBand: EmployeeBand.BAND_5001_10000, revenueBand: RevenueBand.FROM_250M_1B, existingTechnology: [], competitorTechnology: ['Zendesk'], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'moderate', recentBusinessTrigger: 'patient-experience targets set by the health authority', dataConfidence: DataConfidence.MEDIUM },

  // --- Oman ----------------------------------------------------------------
  { companyName: 'Muscat Water Authority', domain: 'muscatwater.example', industry: 'Utilities', subIndustry: 'Water and Waste', country: 'Oman', city: 'Muscat', employeeBand: EmployeeBand.BAND_1001_5000, revenueBand: RevenueBand.FROM_250M_1B, existingTechnology: ['SAP'], competitorTechnology: [], namedAccountStatus: true, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'rich', recentBusinessTrigger: 'a national water-network monitoring upgrade', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Oman Trade Bank', domain: 'omantradebank.example', industry: 'Banking', subIndustry: 'Commercial Banking', country: 'Oman', city: 'Muscat', employeeBand: EmployeeBand.BAND_501_1000, revenueBand: RevenueBand.FROM_50M_250M, existingTechnology: [], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'thin', recentBusinessTrigger: null, dataConfidence: DataConfidence.LOW },

  // --- Egypt ---------------------------------------------------------------
  { companyName: 'Nile Delta Power', domain: 'niledeltapower.example', industry: 'Energy', subIndustry: 'Power Generation', country: 'Egypt', city: 'Cairo', employeeBand: EmployeeBand.BAND_5001_10000, revenueBand: RevenueBand.FROM_1B_5B, existingTechnology: ['OSIsoft PI'], competitorTechnology: [], namedAccountStatus: true, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'rich', recentBusinessTrigger: 'a grid-resilience investment programme', dataConfidence: DataConfidence.HIGH },
  { companyName: 'Cairo Communications', domain: 'cairocomms.example', industry: 'Telecommunications', subIndustry: 'Mobile Network Operator', country: 'Egypt', city: 'Cairo', employeeBand: EmployeeBand.BAND_5001_10000, revenueBand: RevenueBand.FROM_250M_1B, existingTechnology: ['Genesys'], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'moderate', recentBusinessTrigger: 'a customer-care restructuring announced to staff', dataConfidence: DataConfidence.MEDIUM },
  { companyName: 'Alexandria Shipping', domain: 'alexshipping.example', industry: 'Transportation and Logistics', subIndustry: 'Shipping', country: 'Egypt', city: 'Alexandria', employeeBand: EmployeeBand.BAND_501_1000, revenueBand: RevenueBand.FROM_50M_250M, existingTechnology: [], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'none', recentBusinessTrigger: null, dataConfidence: DataConfidence.LOW },

  // --- Out-of-scope accounts, used to prove the relevance gate rejects them --
  { companyName: 'Sunset Hospitality Group', domain: 'sunsethospitality.example', industry: 'Hospitality', subIndustry: 'Hotels', country: 'Mexico', city: 'Cancun', employeeBand: EmployeeBand.BAND_201_500, revenueBand: RevenueBand.FROM_50M_250M, existingTechnology: [], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'thin', recentBusinessTrigger: null, dataConfidence: DataConfidence.LOW },
  { companyName: 'Osaka Precision Works', domain: 'osakaprecision.example', industry: 'Manufacturing', subIndustry: 'Industrial Equipment', country: 'Japan', city: 'Osaka', employeeBand: EmployeeBand.BAND_1001_5000, revenueBand: RevenueBand.FROM_250M_1B, existingTechnology: [], competitorTechnology: [], namedAccountStatus: false, existingClientRelationship: ClientRelationship.NONE, triggerProfile: 'moderate', recentBusinessTrigger: null, dataConfidence: DataConfidence.MEDIUM },
];

export interface SeedPerson {
  firstName: string;
  lastName: string;
}

/** Names chosen to match the seeded geographies. */
export const NAMES_BY_COUNTRY: Record<string, SeedPerson[]> = {
  Canada: [
    { firstName: 'Amara', lastName: 'Osei' }, { firstName: 'Liam', lastName: 'Fortin' },
    { firstName: 'Priya', lastName: 'Raman' }, { firstName: 'Ethan', lastName: 'Beaulieu' },
    { firstName: 'Chloe', lastName: 'Tremblay' }, { firstName: 'Marcus', lastName: 'Nkemdirim' },
    { firstName: 'Sofia', lastName: 'Kowalski' }, { firstName: 'Daniel', lastName: 'Wong' },
  ],
  Mexico: [
    { firstName: 'Valeria', lastName: 'Ortega' }, { firstName: 'Diego', lastName: 'Hernandez' },
    { firstName: 'Camila', lastName: 'Reyes' }, { firstName: 'Alejandro', lastName: 'Vargas' },
    { firstName: 'Renata', lastName: 'Castillo' }, { firstName: 'Mateo', lastName: 'Guzman' },
    { firstName: 'Lucia', lastName: 'Mendoza' }, { firstName: 'Emilio', lastName: 'Navarro' },
  ],
  France: [
    { firstName: 'Luc', lastName: 'Bernard' }, { firstName: 'Camille', lastName: 'Moreau' },
    { firstName: 'Julien', lastName: 'Lefevre' }, { firstName: 'Sylvie', lastName: 'Dubois' },
    { firstName: 'Antoine', lastName: 'Girard' }, { firstName: 'Manon', lastName: 'Rousseau' },
    { firstName: 'Thibault', lastName: 'Marchand' }, { firstName: 'Elise', lastName: 'Perrin' },
  ],
  Colombia: [
    { firstName: 'Andres', lastName: 'Restrepo' }, { firstName: 'Daniela', lastName: 'Gomez' },
    { firstName: 'Santiago', lastName: 'Ospina' }, { firstName: 'Paula', lastName: 'Arango' },
    { firstName: 'Juan', lastName: 'Cardenas' }, { firstName: 'Mariana', lastName: 'Rincon' },
  ],
  'United Arab Emirates': [
    { firstName: 'Khalid', lastName: 'Al Mansoori' }, { firstName: 'Noura', lastName: 'Al Suwaidi' },
    { firstName: 'Rashid', lastName: 'Al Habtoor' }, { firstName: 'Aisha', lastName: 'Al Nuaimi' },
    { firstName: 'Omar', lastName: 'Al Shamsi' }, { firstName: 'Layla', lastName: 'Haddad' },
    { firstName: 'Imran', lastName: 'Sheikh' }, { firstName: 'Hana', lastName: 'Farouk' },
  ],
  'Saudi Arabia': [
    { firstName: 'Faisal', lastName: 'Al Otaibi' }, { firstName: 'Reem', lastName: 'Al Qahtani' },
    { firstName: 'Abdullah', lastName: 'Al Harbi' }, { firstName: 'Sara', lastName: 'Al Dossari' },
    { firstName: 'Turki', lastName: 'Al Ghamdi' }, { firstName: 'Maha', lastName: 'Al Zahrani' },
    { firstName: 'Nasser', lastName: 'Al Subaie' }, { firstName: 'Lina', lastName: 'Al Rashid' },
  ],
  Oman: [
    { firstName: 'Fatima', lastName: 'Al Balushi' }, { firstName: 'Salim', lastName: 'Al Hinai' },
    { firstName: 'Muna', lastName: 'Al Riyami' }, { firstName: 'Yusuf', lastName: 'Al Kindi' },
    { firstName: 'Amal', lastName: 'Al Zadjali' }, { firstName: 'Hamed', lastName: 'Al Mahrouqi' },
  ],
  Egypt: [
    { firstName: 'Mostafa', lastName: 'Ibrahim' }, { firstName: 'Yasmin', lastName: 'El Sayed' },
    { firstName: 'Karim', lastName: 'Abdel Rahman' }, { firstName: 'Dina', lastName: 'Mahmoud' },
    { firstName: 'Tarek', lastName: 'Fahmy' }, { firstName: 'Nour', lastName: 'Hassan' },
    { firstName: 'Sherif', lastName: 'Aziz' }, { firstName: 'Heba', lastName: 'Salem' },
  ],
  Japan: [
    { firstName: 'Kenji', lastName: 'Tanaka' }, { firstName: 'Yuki', lastName: 'Sato' },
  ],
};

/**
 * Contact archetypes. Each one is a realistic person profile that exercises a
 * different path through the relevance gate and scoring engine.
 */
export interface Archetype {
  key: string;
  jobTitles: string[];
  department: string;
  jobFunction: string;
  roleCategory: RoleCategory;
  seniority: Seniority;
  ownsBudget: boolean;
  influencesDecision: boolean;
  directProblemResponsibility: boolean;
  roleConfidence: DataConfidence;
  /** Whether a researcher has written the P1 justification. */
  researched: boolean;
  verified: 'full' | 'partial' | 'none';
  note: string;
}

export const ARCHETYPES: Record<string, Archetype> = {
  directOwner: {
    key: 'directOwner',
    jobTitles: [
      'Head of Customer Experience Transformation',
      'Director of Customer Experience',
      'VP Customer Operations',
      'Head of Customer Service Transformation',
    ],
    department: 'Customer Experience',
    jobFunction: 'Customer Experience',
    roleCategory: RoleCategory.DIRECT_OWNER,
    seniority: Seniority.HEAD,
    ownsBudget: true,
    influencesDecision: true,
    directProblemResponsibility: true,
    roleConfidence: DataConfidence.HIGH,
    researched: true,
    verified: 'full',
    note: 'Owns the customer experience programme and its budget.',
  },
  assetOwner: {
    key: 'assetOwner',
    jobTitles: [
      'Head of Asset Management',
      'Director of Network Operations',
      'Head of Field Operations',
      'VP Operations',
    ],
    department: 'Operations',
    jobFunction: 'Operations',
    roleCategory: RoleCategory.DIRECT_OWNER,
    seniority: Seniority.HEAD,
    ownsBudget: true,
    influencesDecision: true,
    directProblemResponsibility: true,
    roleConfidence: DataConfidence.HIGH,
    researched: true,
    verified: 'full',
    note: 'Owns network and asset operations, including the improvement budget.',
  },
  directOwnerUnbudgeted: {
    key: 'directOwnerUnbudgeted',
    jobTitles: ['Director of Customer Operations', 'Head of Service Delivery'],
    department: 'Customer Operations',
    jobFunction: 'Customer Operations',
    roleCategory: RoleCategory.DIRECT_OWNER,
    seniority: Seniority.DIRECTOR,
    ownsBudget: false,
    influencesDecision: true,
    directProblemResponsibility: true,
    roleConfidence: DataConfidence.MEDIUM,
    researched: false,
    verified: 'partial',
    note: 'Runs the function but the budget sits with the COO.',
  },
  operationalOwner: {
    key: 'operationalOwner',
    jobTitles: [
      'Contact Centre Operations Manager',
      'Customer Service Manager',
      'Service Delivery Manager',
    ],
    department: 'Customer Operations',
    jobFunction: 'Customer Service',
    roleCategory: RoleCategory.OPERATIONAL_OWNER,
    seniority: Seniority.MANAGER,
    ownsBudget: false,
    influencesDecision: true,
    directProblemResponsibility: false,
    roleConfidence: DataConfidence.MEDIUM,
    researched: false,
    verified: 'partial',
    note: 'Day-to-day operational owner without budget authority.',
  },
  businessInfluencer: {
    key: 'businessInfluencer',
    jobTitles: [
      'Head of Business Transformation',
      'Director of Strategy and Change',
      'Programme Director, Operations',
    ],
    department: 'Business Transformation',
    jobFunction: 'Transformation',
    roleCategory: RoleCategory.BUSINESS_INFLUENCER,
    seniority: Seniority.DIRECTOR,
    ownsBudget: false,
    influencesDecision: true,
    directProblemResponsibility: false,
    roleConfidence: DataConfidence.MEDIUM,
    researched: false,
    verified: 'partial',
    note: 'Adjacent transformation leader who influences the decision without owning the function.',
  },
  executiveSponsor: {
    key: 'executiveSponsor',
    jobTitles: ['Chief Operating Officer', 'Chief Customer Officer'],
    department: 'Executive',
    jobFunction: 'Executive',
    roleCategory: RoleCategory.EXECUTIVE_SPONSOR,
    seniority: Seniority.C_LEVEL,
    ownsBudget: true,
    influencesDecision: true,
    directProblemResponsibility: false,
    roleConfidence: DataConfidence.MEDIUM,
    researched: false,
    verified: 'partial',
    note: 'Sponsors the initiative but does not run it day to day.',
  },
  technicalEvaluator: {
    key: 'technicalEvaluator',
    jobTitles: ['IT Director', 'Head of Enterprise Architecture', 'Digital Platform Manager'],
    department: 'Information Technology',
    jobFunction: 'Information Technology',
    roleCategory: RoleCategory.TECHNICAL_EVALUATOR,
    seniority: Seniority.DIRECTOR,
    ownsBudget: false,
    influencesDecision: true,
    directProblemResponsibility: false,
    roleConfidence: DataConfidence.MEDIUM,
    researched: false,
    verified: 'partial',
    note: 'Evaluates the technology but does not own the business problem.',
  },
  keywordTrap: {
    key: 'keywordTrap',
    // The exact false positive the agency's old filter produced: "customer" in
    // the title, but the person sells - they do not own customer experience.
    jobTitles: [
      'Customer Account Executive',
      'Customer Success Sales Manager',
      'Key Customer Account Manager',
    ],
    department: 'Sales',
    jobFunction: 'Sales',
    roleCategory: RoleCategory.PERIPHERAL,
    seniority: Seniority.INDIVIDUAL_CONTRIBUTOR,
    ownsBudget: false,
    influencesDecision: false,
    directProblemResponsibility: false,
    roleConfidence: DataConfidence.MEDIUM,
    researched: false,
    verified: 'partial',
    note: 'Has "customer" in the title but works in sales - no ownership of the problem.',
  },
  peripheral: {
    key: 'peripheral',
    jobTitles: ['Payroll Manager', 'Talent Acquisition Partner', 'Facilities Coordinator'],
    department: 'Human Resources',
    jobFunction: 'Human Resources',
    roleCategory: RoleCategory.PERIPHERAL,
    seniority: Seniority.MANAGER,
    ownsBudget: false,
    influencesDecision: false,
    directProblemResponsibility: false,
    roleConfidence: DataConfidence.MEDIUM,
    researched: false,
    verified: 'partial',
    note: 'Unrelated function.',
  },
  unknownRole: {
    key: 'unknownRole',
    jobTitles: ['Regional Lead', 'Business Partner', 'Programme Lead'],
    department: '',
    jobFunction: '',
    roleCategory: RoleCategory.UNKNOWN,
    seniority: Seniority.UNKNOWN,
    ownsBudget: false,
    influencesDecision: false,
    directProblemResponsibility: false,
    roleConfidence: DataConfidence.UNVERIFIED,
    researched: false,
    verified: 'none',
    note: 'Ambiguous title with no department - needs research before any outreach.',
  },
  endUser: {
    key: 'endUser',
    jobTitles: ['Customer Service Advisor', 'Contact Centre Team Leader'],
    department: 'Customer Service',
    jobFunction: 'Customer Service',
    roleCategory: RoleCategory.END_USER,
    seniority: Seniority.TEAM_LEAD,
    ownsBudget: false,
    influencesDecision: false,
    directProblemResponsibility: false,
    roleConfidence: DataConfidence.MEDIUM,
    researched: false,
    verified: 'partial',
    note: 'Works in the area but at execution level.',
  },
  procurement: {
    key: 'procurement',
    jobTitles: ['Procurement Manager', 'Head of Sourcing'],
    department: 'Procurement',
    jobFunction: 'Procurement',
    roleCategory: RoleCategory.PROCUREMENT,
    seniority: Seniority.MANAGER,
    ownsBudget: false,
    influencesDecision: true,
    directProblemResponsibility: false,
    roleConfidence: DataConfidence.MEDIUM,
    researched: false,
    verified: 'partial',
    note: 'Involved in purchasing, not in the business problem.',
  },
};

export const COUNTRY_RULES = [
  { country: 'Canada', emailRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, phoneRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT, whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, requiredFields: ['consentStatus', 'lawfulBasis', 'consentSource'], noticeRequired: true, notes: 'Anti-spam legislation in Canada is strict on commercial electronic messages. Confirm the applicable exemption with counsel.' },
  { country: 'Mexico', emailRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT, phoneRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT, whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, requiredFields: ['consentStatus', 'lawfulBasis'], noticeRequired: true, notes: 'A privacy notice is generally expected before processing. Verify with counsel.' },
  { country: 'France', emailRequirement: ConsentRequirement.SOFT_OPT_IN_SUFFICIENT, phoneRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT, whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, requiredFields: ['consentStatus', 'lawfulBasis', 'consentSource', 'consentDate'], noticeRequired: true, notes: 'B2B email in France is commonly handled under a soft opt-in with an objection right. Confirm the current position with counsel.' },
  { country: 'Colombia', emailRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT, phoneRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT, whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, requiredFields: ['consentStatus', 'lawfulBasis'], noticeRequired: false, notes: 'Registry-based data protection duties may apply. Confirm with counsel.' },
  { country: 'United Arab Emirates', emailRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, phoneRequirement: ConsentRequirement.SOFT_OPT_IN_SUFFICIENT, whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, requiredFields: ['consentStatus', 'lawfulBasis', 'consentSource'], noticeRequired: true, notes: 'Confirm the applicable federal and free-zone rules with counsel.' },
  { country: 'Saudi Arabia', emailRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, phoneRequirement: ConsentRequirement.SOFT_OPT_IN_SUFFICIENT, whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, requiredFields: ['consentStatus', 'lawfulBasis', 'consentSource'], noticeRequired: true, notes: 'Confirm the current personal data protection position with counsel.' },
  { country: 'Oman', emailRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, phoneRequirement: ConsentRequirement.SOFT_OPT_IN_SUFFICIENT, whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, requiredFields: ['consentStatus', 'lawfulBasis'], noticeRequired: true, notes: 'Confirm with counsel before launch.' },
  { country: 'Egypt', emailRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, phoneRequirement: ConsentRequirement.LEGITIMATE_INTEREST_SUFFICIENT, whatsappRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, requiredFields: ['consentStatus', 'lawfulBasis'], noticeRequired: true, notes: 'Confirm the data protection law implementation status with counsel.' },
  { country: 'Japan', emailRequirement: ConsentRequirement.EXPLICIT_OPT_IN_REQUIRED, phoneRequirement: ConsentRequirement.SOFT_OPT_IN_SUFFICIENT, whatsappRequirement: ConsentRequirement.CHANNEL_PROHIBITED, requiredFields: ['consentStatus', 'lawfulBasis'], noticeRequired: true, notes: 'Out of the current target geography; rule present for completeness.' },
];
