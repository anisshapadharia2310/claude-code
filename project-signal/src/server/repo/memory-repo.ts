/**
 * In-process implementation of the repository contract.
 *
 * Holds the same seed dataset the Prisma seed script writes, so the whole
 * application runs with DATA_SOURCE=memory and no database at all. Useful for
 * evaluating the product, for CI, and as the proof that nothing above this
 * folder depends on Prisma at runtime.
 *
 * Writes are in-process only and are lost when the process restarts.
 */
import type {
  Account, CallActivity, Campaign, CampaignContact, ComplianceRecord, Contact,
  CountryComplianceRule, EmailActivity, EngagementEvent, Prisma, ScoreAudit,
  ScoringConfig, User, WhatsAppActivity,
} from '@prisma/client';
import { buildDataset } from '../seed/dataset';
import type {
  AccountWithContacts, CampaignContactFull, ContactWithAccount, EventFilter,
  ImportWriteInput, ImportWriteResult, SignalRepository,
} from './types';

let counter = 0;
const nextId = (prefix: string): string => {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${(counter * 2654435761 % 1679616).toString(36)}`;
};

/** Unwraps Prisma's `{ set: value }` update wrappers into plain values. */
function unwrap(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    const record = value as Record<string, unknown>;
    if ('set' in record) return record.set;
    if ('increment' in record) return record.increment;
    if ('connect' in record) {
      const connect = record.connect as { id?: string } | undefined;
      return connect?.id;
    }
  }
  return value;
}

/** Field names that are relations in Prisma but plain foreign keys in memory. */
const RELATION_TO_FK: Record<string, string> = {
  assignedUser: 'assignedTo',
  reviewedBy: 'reviewedById',
  changedBy: 'changedById',
  caller: 'callerId',
  campaign: 'campaignId',
  contact: 'contactId',
  account: 'accountId',
  campaignContact: 'campaignContactId',
};

function applyUpdate<T extends object>(target: T, data: Record<string, unknown>): T {
  for (const [key, raw] of Object.entries(data)) {
    if (raw === undefined) continue;
    const value = unwrap(raw);
    const field = RELATION_TO_FK[key] ?? key;
    (target as Record<string, unknown>)[field] = value;
  }
  (target as Record<string, unknown>).updatedAt = new Date();
  return target;
}

function withDefaults<T extends object>(data: T, extra: Record<string, unknown>): T & Record<string, unknown> {
  return { ...extra, ...data } as T & Record<string, unknown>;
}

export class MemoryRepository implements SignalRepository {
  private users: User[] = [];
  private accounts: Account[] = [];
  private contacts: Contact[] = [];
  private campaigns: Campaign[] = [];
  private campaignContacts: CampaignContact[] = [];
  private events: EngagementEvent[] = [];
  private complianceRecords: ComplianceRecord[] = [];
  private countryRules: CountryComplianceRule[] = [];
  private scoringConfigs: ScoringConfig[] = [];
  private scoreAudits: ScoreAudit[] = [];
  private callActivities: CallActivity[] = [];
  private emailActivities: EmailActivity[] = [];
  private whatsappActivities: WhatsAppActivity[] = [];

  constructor(passwordHash: string) {
    const dataset = buildDataset(passwordHash);
    const now = new Date();

    this.users = dataset.users.map((user) => withDefaults(user, {
      isActive: true, createdAt: now, updatedAt: now,
    }) as unknown as User);

    this.countryRules = dataset.countryRules.map((rule) => withDefaults(rule, {
      createdAt: now, updatedAt: now, policyNotes: null,
    }) as unknown as CountryComplianceRule);

    this.accounts = dataset.accounts.map((account) => withDefaults(account, {
      createdAt: now, updatedAt: now,
    }) as unknown as Account);

    this.campaigns = dataset.campaigns.map((campaign) => withDefaults(campaign, {
      createdAt: now, updatedAt: now,
    }) as unknown as Campaign);

    this.contacts = dataset.contacts.map((contact) => withDefaults(contact, {
      createdAt: now, updatedAt: now,
    }) as unknown as Contact);

    this.complianceRecords = dataset.complianceRecords.map((record) => withDefaults(record, {
      createdAt: now, updatedAt: now,
    }) as unknown as ComplianceRecord);

    this.events = dataset.events.map((event) => withDefaults(event, {
      createdAt: now, metadata: null,
    }) as unknown as EngagementEvent);

    this.campaignContacts = dataset.memberships.map((membership) => ({
      id: `cc-${membership.campaignId.slice(5, 12)}-${membership.contactId}`,
      campaignId: membership.campaignId,
      contactId: membership.contactId,
      fitScore: 0, roleRelevanceScore: 0, triggerScore: 0, engagementScore: 0,
      dataQualityScore: 0, attendanceLikelihoodScore: 0, engagementBonusScore: 0, totalScore: 0,
      priority: 'UNSCORED', relevanceGatePassed: false, complianceGatePassed: false,
      gateFailureReasons: [], gateWarnings: [], humanReviewRequired: false,
      humanReviewStatus: 'NOT_REQUIRED', humanReviewReasons: [], reviewedById: null,
      reviewedAt: null, reviewNotes: null, whyThisContact: null, whyThisContactDraft: null, recommendedChannel: null,
      recommendedNextAction: null, callerOpening: null, emailAngle: null,
      whatsappRecommendation: null, scoreBreakdown: null, assignedTo: null,
      currentStatus: 'NEW', nextFollowUpAt: null, lastScoredAt: null,
      createdAt: now, updatedAt: now,
    })) as unknown as CampaignContact[];
  }

  // ---- helpers -----------------------------------------------------------
  private hydrateContact(contact: Contact): ContactWithAccount {
    return {
      ...contact,
      account: this.accounts.find((account) => account.id === contact.accountId)!,
      complianceRecords: this.complianceRecords.filter((record) => record.contactId === contact.id),
    };
  }

  private hydrateCampaignContact(link: CampaignContact): CampaignContactFull {
    const contact = this.contacts.find((item) => item.id === link.contactId)!;
    return {
      ...link,
      contact: this.hydrateContact(contact),
      campaign: this.campaigns.find((item) => item.id === link.campaignId)!,
      assignedUser: link.assignedTo ? this.users.find((user) => user.id === link.assignedTo) ?? null : null,
    };
  }

  // ---- users -------------------------------------------------------------
  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async listUsers(): Promise<User[]> {
    return [...this.users].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  }

  async createUser(data: Prisma.UserCreateManyInput): Promise<User> {
    const now = new Date();
    const user = withDefaults(data, { id: nextId('user'), isActive: true, createdAt: now, updatedAt: now }) as unknown as User;
    this.users.push(user);
    return user;
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const user = this.users.find((item) => item.id === id);
    if (!user) throw new Error(`User ${id} not found`);
    return applyUpdate(user, data as Record<string, unknown>);
  }

  // ---- campaigns ---------------------------------------------------------
  async listCampaigns(): Promise<Campaign[]> {
    return [...this.campaigns];
  }

  async getCampaign(id: string): Promise<Campaign | null> {
    return this.campaigns.find((campaign) => campaign.id === id) ?? null;
  }

  async updateCampaign(id: string, data: Prisma.CampaignUpdateInput): Promise<Campaign> {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error(`Campaign ${id} not found`);
    return applyUpdate(campaign, data as Record<string, unknown>);
  }

  async createCampaign(data: Prisma.CampaignCreateInput): Promise<Campaign> {
    const now = new Date();
    const campaign = withDefaults(data, { id: nextId('camp'), createdAt: now, updatedAt: now }) as unknown as Campaign;
    this.campaigns.push(campaign);
    return campaign;
  }

  // ---- scoring configuration --------------------------------------------
  async getScoringConfig(campaignId: string): Promise<ScoringConfig | null> {
    return this.scoringConfigs.find((config) => config.campaignId === campaignId) ?? null;
  }

  async upsertScoringConfig(
    campaignId: string,
    data: Omit<Prisma.ScoringConfigCreateManyInput, 'campaignId' | 'id'>,
  ): Promise<ScoringConfig> {
    const existing = this.scoringConfigs.find((config) => config.campaignId === campaignId);
    if (existing) return applyUpdate(existing, data as Record<string, unknown>);
    const now = new Date();
    const config = withDefaults({ campaignId, ...data }, {
      id: nextId('cfg'), createdAt: now, updatedAt: now,
    }) as unknown as ScoringConfig;
    this.scoringConfigs.push(config);
    return config;
  }

  // ---- accounts and contacts --------------------------------------------
  async listAccounts(): Promise<Account[]> {
    return [...this.accounts].sort((a, b) => a.companyName.localeCompare(b.companyName));
  }

  async getAccount(id: string): Promise<AccountWithContacts | null> {
    const account = this.accounts.find((item) => item.id === id);
    if (!account) return null;
    return { ...account, contacts: this.contacts.filter((contact) => contact.accountId === id) };
  }

  async updateAccount(id: string, data: Prisma.AccountUpdateInput): Promise<Account> {
    const account = this.accounts.find((item) => item.id === id);
    if (!account) throw new Error(`Account ${id} not found`);
    return applyUpdate(account, data as Record<string, unknown>);
  }

  async listContacts(): Promise<ContactWithAccount[]> {
    return this.contacts
      .map((contact) => this.hydrateContact(contact))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }

  async getContact(id: string): Promise<ContactWithAccount | null> {
    const contact = this.contacts.find((item) => item.id === id);
    return contact ? this.hydrateContact(contact) : null;
  }

  async updateContact(id: string, data: Prisma.ContactUpdateInput): Promise<Contact> {
    const contact = this.contacts.find((item) => item.id === id);
    if (!contact) throw new Error(`Contact ${id} not found`);
    return applyUpdate(contact, data as Record<string, unknown>);
  }

  // ---- campaign contacts -------------------------------------------------
  async listCampaignContacts(campaignId?: string): Promise<CampaignContactFull[]> {
    return this.campaignContacts
      .filter((link) => !campaignId || link.campaignId === campaignId)
      .map((link) => this.hydrateCampaignContact(link))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  async getCampaignContact(id: string): Promise<CampaignContactFull | null> {
    const link = this.campaignContacts.find((item) => item.id === id);
    return link ? this.hydrateCampaignContact(link) : null;
  }

  async updateCampaignContact(id: string, data: Prisma.CampaignContactUpdateInput): Promise<CampaignContact> {
    const link = this.campaignContacts.find((item) => item.id === id);
    if (!link) throw new Error(`CampaignContact ${id} not found`);
    return applyUpdate(link, data as Record<string, unknown>);
  }

  async updateManyCampaignContacts(ids: string[], data: Prisma.CampaignContactUpdateInput): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const link = this.campaignContacts.find((item) => item.id === id);
      if (!link) continue;
      applyUpdate(link, data as Record<string, unknown>);
      count += 1;
    }
    return count;
  }

  // ---- engagement --------------------------------------------------------
  async listEvents(filter: EventFilter): Promise<EngagementEvent[]> {
    return this.events
      .filter((event) => {
        if (filter.campaignId && event.campaignId !== filter.campaignId) return false;
        if (filter.contactId && event.contactId !== filter.contactId) return false;
        if (filter.contactIds && !filter.contactIds.includes(event.contactId)) return false;
        return true;
      })
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }

  async createEngagementEvent(data: Prisma.EngagementEventCreateManyInput): Promise<EngagementEvent> {
    const event = withDefaults(data, {
      id: nextId('ev'), createdAt: new Date(), eventDate: new Date(), metadata: null, pointsAwarded: 0,
    }) as unknown as EngagementEvent;
    this.events.push(event);
    return event;
  }

  // ---- channel activity --------------------------------------------------
  async listCallActivities(campaignContactId: string): Promise<CallActivity[]> {
    return this.callActivities
      .filter((item) => item.campaignContactId === campaignContactId)
      .sort((a, b) => b.callDate.getTime() - a.callDate.getTime());
  }

  async listEmailActivities(campaignContactId: string): Promise<EmailActivity[]> {
    return this.emailActivities
      .filter((item) => item.campaignContactId === campaignContactId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listWhatsAppActivities(campaignContactId: string): Promise<WhatsAppActivity[]> {
    return this.whatsappActivities
      .filter((item) => item.campaignContactId === campaignContactId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createCallActivity(data: Prisma.CallActivityCreateManyInput): Promise<CallActivity> {
    const activity = withDefaults(data, {
      id: nextId('call'), callDate: new Date(), createdAt: new Date(),
    }) as unknown as CallActivity;
    this.callActivities.push(activity);
    return activity;
  }

  async createEmailActivity(data: Prisma.EmailActivityCreateManyInput): Promise<EmailActivity> {
    const activity = withDefaults(data, {
      id: nextId('mail'), createdAt: new Date(), deliveryStatus: 'LOGGED_ONLY', provider: 'log',
    }) as unknown as EmailActivity;
    this.emailActivities.push(activity);
    return activity;
  }

  async createWhatsAppActivity(data: Prisma.WhatsAppActivityCreateManyInput): Promise<WhatsAppActivity> {
    const activity = withDefaults(data, {
      id: nextId('wa'), createdAt: new Date(), deliveryStatus: 'LOGGED_ONLY', provider: 'log',
    }) as unknown as WhatsAppActivity;
    this.whatsappActivities.push(activity);
    return activity;
  }

  // ---- compliance --------------------------------------------------------
  async listCountryRules(): Promise<CountryComplianceRule[]> {
    return [...this.countryRules].sort((a, b) => a.country.localeCompare(b.country));
  }

  async upsertCountryRule(
    country: string,
    data: Omit<Prisma.CountryComplianceRuleCreateManyInput, 'id' | 'country'>,
  ): Promise<CountryComplianceRule> {
    const existing = this.countryRules.find((rule) => rule.country === country);
    if (existing) return applyUpdate(existing, data as Record<string, unknown>);
    const now = new Date();
    const rule = withDefaults({ country, ...data }, {
      id: nextId('rule'), createdAt: now, updatedAt: now,
    }) as unknown as CountryComplianceRule;
    this.countryRules.push(rule);
    return rule;
  }

  async upsertComplianceRecord(
    contactId: string,
    data: Omit<Prisma.ComplianceRecordCreateManyInput, 'id' | 'contactId'>,
  ): Promise<ComplianceRecord> {
    const existing = this.complianceRecords.find((record) => record.contactId === contactId);
    if (existing) return applyUpdate(existing, data as Record<string, unknown>);
    const now = new Date();
    const record = withDefaults({ contactId, ...data }, {
      id: nextId('cmp'), createdAt: now, updatedAt: now,
    }) as unknown as ComplianceRecord;
    this.complianceRecords.push(record);
    return record;
  }

  // ---- audit -------------------------------------------------------------
  async createScoreAudit(data: Prisma.ScoreAuditCreateManyInput): Promise<ScoreAudit> {
    const audit = withDefaults(data, { id: nextId('aud'), createdAt: new Date() }) as unknown as ScoreAudit;
    this.scoreAudits.push(audit);
    return audit;
  }

  async listScoreAudits(campaignContactId: string): Promise<ScoreAudit[]> {
    return this.scoreAudits
      .filter((audit) => audit.campaignContactId === campaignContactId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ---- import ------------------------------------------------------------
  async importRecords(input: ImportWriteInput): Promise<ImportWriteResult> {
    const now = new Date();
    let accountsCreated = 0;
    let contactsCreated = 0;
    let membershipsCreated = 0;

    for (const account of input.accounts) {
      if (this.accounts.some((item) => item.id === account.id)) continue;
      this.accounts.push(withDefaults(account, { createdAt: now, updatedAt: now }) as unknown as Account);
      accountsCreated += 1;
    }
    for (const contact of input.contacts) {
      if (this.contacts.some((item) => item.id === contact.id)) continue;
      this.contacts.push(withDefaults(contact, { createdAt: now, updatedAt: now }) as unknown as Contact);
      contactsCreated += 1;
    }
    for (const record of input.complianceRecords) {
      if (this.complianceRecords.some((item) => item.contactId === record.contactId)) continue;
      this.complianceRecords.push(withDefaults(record, { createdAt: now, updatedAt: now }) as unknown as ComplianceRecord);
    }
    for (const membership of input.memberships) {
      const exists = this.campaignContacts.some(
        (item) => item.campaignId === membership.campaignId && item.contactId === membership.contactId,
      );
      if (exists) continue;
      this.campaignContacts.push({
        id: `cc-${membership.campaignId.slice(5, 12)}-${membership.contactId}`,
        campaignId: membership.campaignId,
        contactId: membership.contactId,
        fitScore: 0, roleRelevanceScore: 0, triggerScore: 0, engagementScore: 0,
        dataQualityScore: 0, attendanceLikelihoodScore: 0, engagementBonusScore: 0, totalScore: 0,
        priority: 'UNSCORED', relevanceGatePassed: false, complianceGatePassed: false,
        gateFailureReasons: [], gateWarnings: [], humanReviewRequired: false,
        humanReviewStatus: 'NOT_REQUIRED', humanReviewReasons: [], reviewedById: null,
        reviewedAt: null, reviewNotes: null, whyThisContact: null, whyThisContactDraft: null, recommendedChannel: null,
        recommendedNextAction: null, callerOpening: null, emailAngle: null,
        whatsappRecommendation: null, scoreBreakdown: null, assignedTo: null,
        currentStatus: 'NEW', nextFollowUpAt: null, lastScoredAt: null,
        createdAt: now, updatedAt: now,
      } as unknown as CampaignContact);
      membershipsCreated += 1;
    }

    return { accountsCreated, contactsCreated, membershipsCreated };
  }
}
