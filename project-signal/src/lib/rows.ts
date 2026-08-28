/**
 * Serializable row shapes passed from server components to client components.
 * Prisma models carry Dates and Decimals that cannot cross the boundary, so
 * everything is flattened to primitives here, in one place.
 */
import type { CampaignContactFull } from '@/server/repo/types';
import { primaryTrigger } from '@/domain/recommendations';

export interface ContactRow {
  id: string;
  contactId: string;
  accountId: string;
  priority: string;
  totalScore: number;
  fitScore: number;
  roleRelevanceScore: number;
  triggerScore: number;
  engagementScore: number;
  dataQualityScore: number;
  attendanceLikelihoodScore: number;
  engagementBonusScore: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
  normalizedJobTitle: string;
  department: string | null;
  roleCategory: string;
  seniority: string;
  decisionRole: string;
  company: string;
  domain: string | null;
  industry: string;
  country: string;
  city: string | null;
  timeZone: string | null;
  employeeBand: string;
  email: string | null;
  emailStatus: string;
  phone: string | null;
  phoneStatus: string;
  whatsappStatus: string;
  consentStatus: string;
  lastVerifiedAt: string | null;
  assignedTo: string | null;
  assignedName: string | null;
  currentStatus: string;
  nextFollowUpAt: string | null;
  humanReviewRequired: boolean;
  humanReviewStatus: string;
  whyThisContact: string | null;
  trigger: string | null;
  gateFailureReasons: string[];
  gateWarnings: string[];
  recommendedChannel: string | null;
  recommendedNextAction: string | null;
  relevanceGatePassed: boolean;
  complianceGatePassed: boolean;
}

export function toContactRow(link: CampaignContactFull): ContactRow {
  const contact = link.contact;
  const account = contact.account;
  return {
    id: link.id,
    contactId: link.contactId,
    accountId: account.id,
    priority: link.priority,
    totalScore: link.totalScore,
    fitScore: link.fitScore,
    roleRelevanceScore: link.roleRelevanceScore,
    triggerScore: link.triggerScore,
    engagementScore: link.engagementScore,
    dataQualityScore: link.dataQualityScore,
    attendanceLikelihoodScore: link.attendanceLikelihoodScore,
    engagementBonusScore: link.engagementBonusScore,
    firstName: contact.firstName,
    lastName: contact.lastName,
    jobTitle: contact.jobTitle,
    normalizedJobTitle: contact.normalizedJobTitle,
    department: contact.department,
    roleCategory: contact.roleCategory,
    seniority: contact.seniority,
    decisionRole: contact.decisionRole,
    company: account.companyName,
    domain: account.domain,
    industry: account.industry,
    country: account.country,
    city: account.city,
    timeZone: contact.timeZone,
    employeeBand: account.employeeBand,
    email: contact.workEmail,
    emailStatus: contact.emailStatus,
    phone: contact.phoneNumber,
    phoneStatus: contact.phoneStatus,
    whatsappStatus: contact.whatsappStatus,
    consentStatus: contact.consentStatus,
    lastVerifiedAt: contact.lastVerifiedAt?.toISOString() ?? null,
    assignedTo: link.assignedTo,
    assignedName: link.assignedUser?.name ?? null,
    currentStatus: link.currentStatus,
    nextFollowUpAt: link.nextFollowUpAt?.toISOString() ?? null,
    humanReviewRequired: link.humanReviewRequired,
    humanReviewStatus: link.humanReviewStatus,
    whyThisContact: link.whyThisContact,
    trigger: primaryTrigger(account),
    gateFailureReasons: link.gateFailureReasons,
    gateWarnings: link.gateWarnings,
    recommendedChannel: link.recommendedChannel,
    recommendedNextAction: link.recommendedNextAction,
    relevanceGatePassed: link.relevanceGatePassed,
    complianceGatePassed: link.complianceGatePassed,
  };
}
