/**
 * CSV export.
 *
 * The export carries the score breakdown and the reasons, not just the score,
 * so a list handed to a client can be defended line by line.
 */
import { toCsv } from '@/lib/csv';
import { formatDate } from '@/lib/utils';
import type { CampaignContactFull } from '../repo/types';

const HEADERS = [
  'Priority', 'Total score', 'Company', 'Domain', 'Industry', 'Country', 'City',
  'Employee band', 'Revenue band', 'First name', 'Last name', 'Job title',
  'Normalized job title', 'Department', 'Role category', 'Seniority', 'Decision role',
  'Owns budget', 'Influences decision', 'Direct problem responsibility',
  'Work email', 'Email status', 'Phone', 'Phone status', 'WhatsApp status',
  'Consent status', 'Last verified', 'Contact source',
  'Company fit (25)', 'Role relevance (25)', 'Trigger (20)', 'Engagement (15)',
  'Data quality (10)', 'Attendance likelihood (5)', 'Post-event bonus',
  'Relevance gate', 'Compliance gate', 'Gate failures', 'Review required',
  'Review status', 'Why this contact', 'Business trigger', 'Recommended channel',
  'Recommended next action', 'Assigned to', 'Current status', 'Next follow-up',
];

export function exportContactsCsv(rows: CampaignContactFull[]): string {
  const body = rows.map((row) => {
    const contact = row.contact;
    const account = contact.account;
    return [
      row.priority, row.totalScore, account.companyName, account.domain, account.industry,
      account.country, account.city, account.employeeBand, account.revenueBand,
      contact.firstName, contact.lastName, contact.jobTitle, contact.normalizedJobTitle,
      contact.department, contact.roleCategory, contact.seniority, contact.decisionRole,
      contact.ownsBudget ? 'yes' : 'no',
      contact.influencesDecision ? 'yes' : 'no',
      contact.directProblemResponsibility ? 'yes' : 'no',
      contact.workEmail, contact.emailStatus, contact.phoneNumber, contact.phoneStatus,
      contact.whatsappStatus, contact.consentStatus, formatDate(contact.lastVerifiedAt),
      contact.contactSource,
      row.fitScore, row.roleRelevanceScore, row.triggerScore, row.engagementScore,
      row.dataQualityScore, row.attendanceLikelihoodScore, row.engagementBonusScore,
      row.relevanceGatePassed ? 'pass' : 'fail',
      row.complianceGatePassed ? 'pass' : 'fail',
      row.gateFailureReasons.join(' | '),
      row.humanReviewRequired ? 'yes' : 'no',
      row.humanReviewStatus,
      row.whyThisContact ?? '',
      account.recentBusinessTrigger ?? '',
      row.recommendedChannel ?? '',
      row.recommendedNextAction ?? '',
      row.assignedUser?.name ?? '',
      row.currentStatus,
      formatDate(row.nextFollowUpAt),
    ];
  });
  return toCsv(HEADERS, body);
}

export function exportFileName(campaignName: string, suffix = 'contacts'): string {
  const slug = campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `signal-${slug}-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
}
