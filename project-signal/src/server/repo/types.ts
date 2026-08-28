/**
 * Repository contract.
 *
 * The application never imports Prisma outside this folder. Two
 * implementations exist: PrismaRepository (PostgreSQL) and MemoryRepository
 * (the same seed dataset held in process, for running without a database).
 * Swapping between them is one environment variable.
 *
 * Read operations are deliberately coarse - "load the campaign's contacts",
 * not "load page 3 filtered by nine predicates". Filtering, sorting and
 * aggregation are pure functions in the service layer, which keeps the two
 * implementations behaviourally identical and keeps the query semantics in one
 * testable place.
 */
import type {
  Account,
  CallActivity,
  Campaign,
  CampaignContact,
  ComplianceRecord,
  Contact,
  CountryComplianceRule,
  EmailActivity,
  EngagementEvent,
  Prisma,
  ScoreAudit,
  ScoringConfig,
  User,
  WhatsAppActivity,
} from '@prisma/client';

export type ContactWithAccount = Contact & {
  account: Account;
  complianceRecords: ComplianceRecord[];
};

export type CampaignContactFull = CampaignContact & {
  contact: ContactWithAccount;
  campaign: Campaign;
  assignedUser: User | null;
};

export type AccountWithContacts = Account & { contacts: Contact[] };

export interface EventFilter {
  campaignId?: string;
  contactId?: string;
  contactIds?: string[];
}

export interface SignalRepository {
  // ---- users -------------------------------------------------------------
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  listUsers(): Promise<User[]>;
  createUser(data: Prisma.UserCreateManyInput): Promise<User>;
  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User>;

  // ---- campaigns ---------------------------------------------------------
  listCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  updateCampaign(id: string, data: Prisma.CampaignUpdateInput): Promise<Campaign>;
  createCampaign(data: Prisma.CampaignCreateInput): Promise<Campaign>;

  // ---- scoring configuration --------------------------------------------
  getScoringConfig(campaignId: string): Promise<ScoringConfig | null>;
  upsertScoringConfig(
    campaignId: string,
    data: Omit<Prisma.ScoringConfigCreateManyInput, 'campaignId' | 'id'>,
  ): Promise<ScoringConfig>;

  // ---- accounts and contacts --------------------------------------------
  listAccounts(): Promise<Account[]>;
  getAccount(id: string): Promise<AccountWithContacts | null>;
  updateAccount(id: string, data: Prisma.AccountUpdateInput): Promise<Account>;
  listContacts(): Promise<ContactWithAccount[]>;
  getContact(id: string): Promise<ContactWithAccount | null>;
  updateContact(id: string, data: Prisma.ContactUpdateInput): Promise<Contact>;

  // ---- campaign contacts -------------------------------------------------
  listCampaignContacts(campaignId?: string): Promise<CampaignContactFull[]>;
  getCampaignContact(id: string): Promise<CampaignContactFull | null>;
  updateCampaignContact(id: string, data: Prisma.CampaignContactUpdateInput): Promise<CampaignContact>;
  updateManyCampaignContacts(ids: string[], data: Prisma.CampaignContactUpdateInput): Promise<number>;

  // ---- engagement --------------------------------------------------------
  listEvents(filter: EventFilter): Promise<EngagementEvent[]>;
  createEngagementEvent(data: Prisma.EngagementEventCreateManyInput): Promise<EngagementEvent>;

  // ---- channel activity --------------------------------------------------
  listCallActivities(campaignContactId: string): Promise<CallActivity[]>;
  listEmailActivities(campaignContactId: string): Promise<EmailActivity[]>;
  listWhatsAppActivities(campaignContactId: string): Promise<WhatsAppActivity[]>;
  createCallActivity(data: Prisma.CallActivityCreateManyInput): Promise<CallActivity>;
  createEmailActivity(data: Prisma.EmailActivityCreateManyInput): Promise<EmailActivity>;
  createWhatsAppActivity(data: Prisma.WhatsAppActivityCreateManyInput): Promise<WhatsAppActivity>;

  // ---- compliance --------------------------------------------------------
  listCountryRules(): Promise<CountryComplianceRule[]>;
  upsertCountryRule(
    country: string,
    data: Omit<Prisma.CountryComplianceRuleCreateManyInput, 'id' | 'country'>,
  ): Promise<CountryComplianceRule>;
  upsertComplianceRecord(
    contactId: string,
    data: Omit<Prisma.ComplianceRecordCreateManyInput, 'id' | 'contactId'>,
  ): Promise<ComplianceRecord>;

  // ---- audit -------------------------------------------------------------
  createScoreAudit(data: Prisma.ScoreAuditCreateManyInput): Promise<ScoreAudit>;
  listScoreAudits(campaignContactId: string): Promise<ScoreAudit[]>;

  // ---- import ------------------------------------------------------------
  /** Creates accounts, contacts, compliance records and memberships atomically. */
  importRecords(input: ImportWriteInput): Promise<ImportWriteResult>;
}

export interface ImportWriteInput {
  accounts: Prisma.AccountCreateManyInput[];
  contacts: Prisma.ContactCreateManyInput[];
  complianceRecords: Prisma.ComplianceRecordCreateManyInput[];
  memberships: Array<{ campaignId: string; contactId: string }>;
}

export interface ImportWriteResult {
  accountsCreated: number;
  contactsCreated: number;
  membershipsCreated: number;
}
