/**
 * Seed campaigns.
 *
 * Three live campaigns covering the briefs the agency runs: customer
 * experience transformation, customer service automation, and energy or
 * infrastructure digital transformation.
 *
 * Note the excludedTitleTerms on the two customer campaigns. Those are the
 * revenue-side titles that pass a naive "contains customer" filter and waste
 * caller time; the relevance gate uses them to reject on evidence rather than
 * on a hunch.
 */
import type { Prisma } from '@prisma/client';

export type SeedCampaign = Prisma.CampaignCreateManyInput & { id: string };

const inDays = (days: number, hourUtc: number): Date => {
  const date = new Date(Date.now() + days * 86_400_000);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
};

export const CAMPAIGN_CX = 'camp-cx-transformation';
export const CAMPAIGN_SERVICE = 'camp-service-automation';
export const CAMPAIGN_ENERGY = 'camp-energy-digital';

export const SEED_CAMPAIGNS: SeedCampaign[] = [
  {
    id: CAMPAIGN_CX,
    name: 'Customer Experience Transformation 2026',
    clientBrand: 'Northwind Experience Cloud',
    campaignType: 'WEBINAR',
    topic: 'Rebuilding the customer journey after a core systems migration',
    targetBusinessProblem:
      'Fragmented customer journeys and rising customer effort after core platform migrations',
    description:
      'Sixty-minute webinar with two practitioner speakers on sequencing customer experience work around a core migration. The audience we want is the person accountable for customer experience outcomes, not the person who sells to customers.',
    targetIndustries: ['Banking', 'Insurance', 'Telecommunications', 'Retail', 'Airlines'],
    targetSubIndustries: ['Retail Banking', 'Property and Casualty', 'Life and Health', 'Passenger Aviation'],
    targetCountries: ['Canada', 'Mexico', 'France', 'Colombia', 'United Arab Emirates'],
    targetCities: ['Toronto', 'Montreal', 'Monterrey', 'Mexico City', 'Paris', 'Lyon', 'Bogota', 'Dubai'],
    targetEmployeeBands: ['BAND_1001_5000', 'BAND_5001_10000', 'BAND_10000_PLUS'],
    targetRevenueBands: ['USD_250M_1B', 'USD_1B_5B', 'OVER_5B'],
    targetTechnologies: ['Salesforce Service Cloud', 'Genesys', 'Zendesk', 'NICE CXone', 'Avaya'],
    targetJobFunctions: ['CUSTOMER_EXPERIENCE', 'CUSTOMER_SERVICE', 'CONTACT_CENTRE', 'DIGITAL_TRANSFORMATION'],
    targetRoleCategories: ['DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'BUSINESS_INFLUENCER'],
    targetSeniorities: ['C_LEVEL', 'EVP', 'SVP', 'VP', 'HEAD', 'DIRECTOR', 'SENIOR_MANAGER'],
    preferredLanguages: ['English', 'French', 'Spanish'],
    relevantTitleTerms: [
      'customer experience', 'client experience', 'customer journey', 'voice of the customer',
      'customer transformation', 'customer operations', 'service design', 'customer advocacy',
    ],
    excludedTitleTerms: [
      'account executive', 'account manager', 'customer acquisition', 'customer marketing',
      'key accounts', 'sales', 'business development', 'customer insights', 'market research',
    ],
    relevantDepartments: ['Customer Experience', 'Customer Operations', 'Service Delivery', 'Transformation'],
    eventDate: inDays(24, 14),
    eventTime: '14:00',
    eventTimeZone: 'UTC',
    speakerInformation:
      'Dr Amara Osei, former Group Customer Experience Director at a tier-one bank; Luc Fontaine, Head of Service Design, Northwind.',
    registrationUrl: 'https://example.com/webinars/cx-transformation-2026',
    whitePaperUrl: 'https://example.com/papers/cx-after-migration',
    campaignCost: '18500.00' as unknown as Prisma.Decimal,
    campaignCurrency: 'USD',
    allowedChannels: ['EMAIL', 'PHONE', 'WHATSAPP'],
    status: 'ACTIVE',
  },
  {
    id: CAMPAIGN_SERVICE,
    name: 'Customer Service Automation Briefing',
    clientBrand: 'Helio Service AI',
    campaignType: 'WEBINAR',
    topic: 'Automating the top twenty service journeys without losing the customer',
    targetBusinessProblem:
      'High contact volume, long handling times and rising cost to serve in customer service operations',
    description:
      'Forty-five minute practitioner session on which service journeys to automate first and how to measure containment honestly. Aimed at the people who run service operations and contact centres.',
    targetIndustries: ['Banking', 'Telecommunications', 'Insurance', 'Airlines', 'Retail', 'Healthcare'],
    targetSubIndustries: [],
    targetCountries: ['Canada', 'Mexico', 'Colombia', 'United Arab Emirates', 'Saudi Arabia', 'Oman', 'Egypt'],
    targetCities: [],
    targetEmployeeBands: ['BAND_1001_5000', 'BAND_5001_10000', 'BAND_10000_PLUS'],
    targetRevenueBands: ['USD_250M_1B', 'USD_1B_5B', 'OVER_5B'],
    targetTechnologies: ['Genesys', 'Avaya', 'Amazon Connect', 'NICE CXone', 'Zendesk', 'Salesforce Service Cloud'],
    targetJobFunctions: ['CUSTOMER_SERVICE', 'CONTACT_CENTRE', 'CUSTOMER_EXPERIENCE', 'OPERATIONS', 'DIGITAL_TRANSFORMATION'],
    targetRoleCategories: ['DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'TECHNICAL_EVALUATOR'],
    targetSeniorities: ['C_LEVEL', 'SVP', 'VP', 'HEAD', 'DIRECTOR', 'SENIOR_MANAGER', 'MANAGER'],
    preferredLanguages: ['English', 'Spanish', 'Arabic'],
    relevantTitleTerms: [
      'customer service', 'customer care', 'customer support', 'contact centre', 'contact center',
      'call centre', 'call center', 'service operations', 'service delivery', 'service desk',
    ],
    excludedTitleTerms: [
      'account executive', 'sales', 'business development', 'customer acquisition',
      'financial services', 'customer marketing', 'key accounts',
    ],
    relevantDepartments: ['Customer Service', 'Contact Centre', 'Service Operations', 'Customer Operations'],
    eventDate: inDays(11, 12),
    eventTime: '12:00',
    eventTimeZone: 'UTC',
    speakerInformation: 'Priya Raman, Head of Service Operations, Helio; Omar Al Balushi, contact centre practitioner.',
    registrationUrl: 'https://example.com/webinars/service-automation',
    whitePaperUrl: null,
    campaignCost: '12400.00' as unknown as Prisma.Decimal,
    campaignCurrency: 'USD',
    allowedChannels: ['EMAIL', 'PHONE', 'WHATSAPP'],
    status: 'ACTIVE',
  },
  {
    id: CAMPAIGN_ENERGY,
    name: 'Energy and Infrastructure Digital Transformation',
    clientBrand: 'Meridian Grid Systems',
    campaignType: 'WHITE_PAPER',
    topic: 'Asset data foundations for predictive maintenance in energy and infrastructure',
    targetBusinessProblem:
      'Ageing asset data and manual field operations blocking predictive maintenance programmes',
    description:
      'Thirty-two page technical white paper on building the asset data foundation predictive maintenance depends on. Written for the people accountable for field operations, asset management and reliability.',
    targetIndustries: [
      'Energy and Utilities', 'Oil and Gas', 'Water Utilities', 'Transport Infrastructure',
      'Manufacturing', 'Transport and Logistics',
    ],
    targetSubIndustries: [],
    targetCountries: [
      'Saudi Arabia', 'United Arab Emirates', 'Oman', 'Egypt', 'Colombia', 'Mexico', 'Canada', 'France',
    ],
    targetCities: [],
    targetEmployeeBands: ['BAND_1001_5000', 'BAND_5001_10000', 'BAND_10000_PLUS'],
    targetRevenueBands: ['USD_250M_1B', 'USD_1B_5B', 'OVER_5B'],
    targetTechnologies: ['SAP EAM', 'IBM Maximo', 'GE Digital APM', 'OSIsoft PI'],
    targetJobFunctions: [
      'FIELD_OPERATIONS', 'ASSET_MAINTENANCE', 'OPERATIONS', 'DIGITAL_TRANSFORMATION', 'ENGINEERING',
    ],
    targetRoleCategories: ['DIRECT_OWNER', 'OPERATIONAL_OWNER', 'EXECUTIVE_SPONSOR', 'TECHNICAL_EVALUATOR'],
    targetSeniorities: ['C_LEVEL', 'SVP', 'VP', 'HEAD', 'DIRECTOR', 'SENIOR_MANAGER', 'MANAGER'],
    preferredLanguages: ['English', 'Arabic', 'Spanish', 'French'],
    relevantTitleTerms: [
      'asset management', 'maintenance', 'reliability', 'field operations', 'network operations',
      'operations and maintenance', 'plant', 'grid', 'distribution', 'transmission', 'integrity',
      'digital transformation', 'asset performance',
    ],
    excludedTitleTerms: [
      'wealth', 'investment', 'portfolio management', 'fund', 'sales', 'account executive',
      'facilities management', 'human resources',
    ],
    relevantDepartments: ['Operations', 'Asset Management', 'Maintenance', 'Engineering', 'Transformation'],
    eventDate: null,
    eventTime: null,
    eventTimeZone: null,
    speakerInformation: null,
    registrationUrl: null,
    whitePaperUrl: 'https://example.com/papers/asset-data-foundations',
    campaignCost: '9800.00' as unknown as Prisma.Decimal,
    campaignCurrency: 'USD',
    allowedChannels: ['EMAIL', 'PHONE'],
    status: 'ACTIVE',
  },
];
