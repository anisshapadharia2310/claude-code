/** PostgreSQL implementation of the repository contract. */
import type {
  Account, CallActivity, Campaign, CampaignContact, ComplianceRecord, Contact,
  CountryComplianceRule, EmailActivity, EngagementEvent, Prisma, ScoreAudit,
  ScoringConfig, User, WhatsAppActivity,
} from '@prisma/client';
import { prisma } from '../db';
import type {
  AccountWithContacts, CampaignContactFull, ContactWithAccount, EventFilter,
  ImportWriteInput, ImportWriteResult, SignalRepository,
} from './types';

const contactInclude = { account: true, complianceRecords: true } as const;
const campaignContactInclude = {
  contact: { include: contactInclude },
  campaign: true,
  assignedUser: true,
} as const;

export class PrismaRepository implements SignalRepository {
  // ---- users -------------------------------------------------------------
  getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  listUsers(): Promise<User[]> {
    return prisma.user.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] });
  }

  createUser(data: Prisma.UserCreateManyInput): Promise<User> {
    return prisma.user.create({ data });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  // ---- campaigns ---------------------------------------------------------
  listCampaigns(): Promise<Campaign[]> {
    return prisma.campaign.findMany({ orderBy: { createdAt: 'asc' } });
  }

  getCampaign(id: string): Promise<Campaign | null> {
    return prisma.campaign.findUnique({ where: { id } });
  }

  updateCampaign(id: string, data: Prisma.CampaignUpdateInput): Promise<Campaign> {
    return prisma.campaign.update({ where: { id }, data });
  }

  createCampaign(data: Prisma.CampaignCreateInput): Promise<Campaign> {
    return prisma.campaign.create({ data });
  }

  // ---- scoring configuration --------------------------------------------
  getScoringConfig(campaignId: string): Promise<ScoringConfig | null> {
    return prisma.scoringConfig.findUnique({ where: { campaignId } });
  }

  upsertScoringConfig(
    campaignId: string,
    data: Omit<Prisma.ScoringConfigCreateManyInput, 'campaignId' | 'id'>,
  ): Promise<ScoringConfig> {
    return prisma.scoringConfig.upsert({
      where: { campaignId },
      create: { campaignId, ...data },
      update: data,
    });
  }

  // ---- accounts and contacts --------------------------------------------
  listAccounts(): Promise<Account[]> {
    return prisma.account.findMany({ orderBy: { companyName: 'asc' } });
  }

  getAccount(id: string): Promise<AccountWithContacts | null> {
    return prisma.account.findUnique({ where: { id }, include: { contacts: true } });
  }

  updateAccount(id: string, data: Prisma.AccountUpdateInput): Promise<Account> {
    return prisma.account.update({ where: { id }, data });
  }

  listContacts(): Promise<ContactWithAccount[]> {
    return prisma.contact.findMany({ include: contactInclude, orderBy: { lastName: 'asc' } });
  }

  getContact(id: string): Promise<ContactWithAccount | null> {
    return prisma.contact.findUnique({ where: { id }, include: contactInclude });
  }

  updateContact(id: string, data: Prisma.ContactUpdateInput): Promise<Contact> {
    return prisma.contact.update({ where: { id }, data });
  }

  // ---- campaign contacts -------------------------------------------------
  listCampaignContacts(campaignId?: string): Promise<CampaignContactFull[]> {
    return prisma.campaignContact.findMany({
      where: campaignId ? { campaignId } : undefined,
      include: campaignContactInclude,
      orderBy: { totalScore: 'desc' },
    });
  }

  getCampaignContact(id: string): Promise<CampaignContactFull | null> {
    return prisma.campaignContact.findUnique({ where: { id }, include: campaignContactInclude });
  }

  updateCampaignContact(id: string, data: Prisma.CampaignContactUpdateInput): Promise<CampaignContact> {
    return prisma.campaignContact.update({ where: { id }, data });
  }

  async updateManyCampaignContacts(ids: string[], data: Prisma.CampaignContactUpdateInput): Promise<number> {
    const result = await prisma.campaignContact.updateMany({
      where: { id: { in: ids } },
      data: data as Prisma.CampaignContactUpdateManyMutationInput,
    });
    return result.count;
  }

  // ---- engagement --------------------------------------------------------
  listEvents(filter: EventFilter): Promise<EngagementEvent[]> {
    return prisma.engagementEvent.findMany({
      where: {
        campaignId: filter.campaignId,
        contactId: filter.contactIds ? { in: filter.contactIds } : filter.contactId,
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  createEngagementEvent(data: Prisma.EngagementEventCreateManyInput): Promise<EngagementEvent> {
    return prisma.engagementEvent.create({ data });
  }

  // ---- channel activity --------------------------------------------------
  listCallActivities(campaignContactId: string): Promise<CallActivity[]> {
    return prisma.callActivity.findMany({ where: { campaignContactId }, orderBy: { callDate: 'desc' } });
  }

  listEmailActivities(campaignContactId: string): Promise<EmailActivity[]> {
    return prisma.emailActivity.findMany({ where: { campaignContactId }, orderBy: { createdAt: 'desc' } });
  }

  listWhatsAppActivities(campaignContactId: string): Promise<WhatsAppActivity[]> {
    return prisma.whatsAppActivity.findMany({ where: { campaignContactId }, orderBy: { createdAt: 'desc' } });
  }

  createCallActivity(data: Prisma.CallActivityCreateManyInput): Promise<CallActivity> {
    return prisma.callActivity.create({ data });
  }

  createEmailActivity(data: Prisma.EmailActivityCreateManyInput): Promise<EmailActivity> {
    return prisma.emailActivity.create({ data });
  }

  createWhatsAppActivity(data: Prisma.WhatsAppActivityCreateManyInput): Promise<WhatsAppActivity> {
    return prisma.whatsAppActivity.create({ data });
  }

  // ---- compliance --------------------------------------------------------
  listCountryRules(): Promise<CountryComplianceRule[]> {
    return prisma.countryComplianceRule.findMany({ orderBy: { country: 'asc' } });
  }

  upsertCountryRule(
    country: string,
    data: Omit<Prisma.CountryComplianceRuleCreateManyInput, 'id' | 'country'>,
  ): Promise<CountryComplianceRule> {
    return prisma.countryComplianceRule.upsert({
      where: { country },
      create: { country, ...data },
      update: data,
    });
  }

  upsertComplianceRecord(
    contactId: string,
    data: Omit<Prisma.ComplianceRecordCreateManyInput, 'id' | 'contactId'>,
  ): Promise<ComplianceRecord> {
    return prisma.complianceRecord.upsert({
      where: { contactId },
      create: { contactId, ...data },
      update: data,
    });
  }

  // ---- audit -------------------------------------------------------------
  createScoreAudit(data: Prisma.ScoreAuditCreateManyInput): Promise<ScoreAudit> {
    return prisma.scoreAudit.create({ data });
  }

  listScoreAudits(campaignContactId: string): Promise<ScoreAudit[]> {
    return prisma.scoreAudit.findMany({ where: { campaignContactId }, orderBy: { createdAt: 'desc' } });
  }

  // ---- import ------------------------------------------------------------
  async importRecords(input: ImportWriteInput): Promise<ImportWriteResult> {
    return prisma.$transaction(async (tx) => {
      const accounts = await tx.account.createMany({ data: input.accounts, skipDuplicates: true });
      const contacts = await tx.contact.createMany({ data: input.contacts, skipDuplicates: true });
      if (input.complianceRecords.length > 0) {
        await tx.complianceRecord.createMany({ data: input.complianceRecords, skipDuplicates: true });
      }
      const memberships = await tx.campaignContact.createMany({
        data: input.memberships,
        skipDuplicates: true,
      });
      return {
        accountsCreated: accounts.count,
        contactsCreated: contacts.count,
        membershipsCreated: memberships.count,
      };
    });
  }
}
