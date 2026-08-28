/**
 * Compliance evaluation for a single campaign contact, used by every screen
 * that renders a Send or Contact action. The check is re-run server-side at
 * render time and again at action time; the page never decides on its own.
 */
import { evaluateCompliance, ADMIN_LEGAL_WARNING } from '@/domain/compliance';
import type { ComplianceResult } from '@/domain/types';
import type { CampaignContactFull, SignalRepository } from '../repo/types';

export { ADMIN_LEGAL_WARNING };

export async function complianceFor(
  repo: SignalRepository,
  link: CampaignContactFull,
): Promise<ComplianceResult> {
  const rules = await repo.listCountryRules();
  return evaluateCompliance({
    contact: link.contact,
    record: link.contact.complianceRecords[0] ?? null,
    rule: rules.find((rule) => rule.country === link.contact.country) ?? null,
    campaignChannels: link.campaign.allowedChannels,
  });
}
