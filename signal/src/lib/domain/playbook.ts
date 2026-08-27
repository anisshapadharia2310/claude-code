import { Channel, Priority, RoleCategory, WhatsAppStatus } from '@prisma/client';
import type {
  AccountInput,
  CampaignInput,
  ComplianceGateResult,
  ContactInput,
  Playbook,
} from './types';
import { ROLE_CATEGORY_LABELS } from './role-taxonomy';

export interface PlaybookInput {
  account: AccountInput;
  contact: ContactInput;
  campaign: CampaignInput;
  compliance: ComplianceGateResult;
  priority: Priority;
  /** The strongest verified trigger found for this account, if any. */
  topTrigger: string | null;
}

function eventDescriptor(campaign: CampaignInput): string {
  return campaign.campaignType === 'WEBINAR'
    ? `the ${campaign.topic} webinar`
    : `our ${campaign.topic} white paper`;
}

/**
 * Produces the channel, next action and talk tracks for a contact. P1, P2 and P3
 * deliberately get materially different actions - priority is an instruction,
 * not a label.
 */
export function buildPlaybook({
  account,
  contact,
  campaign,
  compliance,
  priority,
  topTrigger,
}: PlaybookInput): Playbook {
  const phoneAllowed = compliance.permissions.find((p) => p.channel === Channel.PHONE)?.allowed ?? false;
  const emailAllowed = compliance.permissions.find((p) => p.channel === Channel.EMAIL)?.allowed ?? false;
  const whatsappPermission = compliance.permissions.find((p) => p.channel === Channel.WHATSAPP);
  const whatsappAllowed = whatsappPermission?.allowed ?? false;

  const blocked = priority === Priority.REJECT || priority === Priority.COMPLIANCE_HOLD;

  // WhatsApp is only ever recommended for a warm, explicitly opted-in contact on
  // a high-priority campaign - never as a cold-outreach channel.
  const whatsappRecommended =
    !blocked &&
    whatsappAllowed &&
    contact.whatsappStatus === WhatsAppStatus.AVAILABLE_OPTED_IN &&
    (priority === Priority.P1 || priority === Priority.P2);

  const whatsappReason = whatsappRecommended
    ? 'Contact has explicitly opted in to WhatsApp and the country rule permits it.'
    : (whatsappPermission?.reason ??
      'WhatsApp is not recommended for this contact.');

  let recommendedChannel: Channel | null = null;
  if (!blocked) {
    if (priority === Priority.P1 && phoneAllowed) recommendedChannel = Channel.PHONE;
    else if (emailAllowed) recommendedChannel = Channel.EMAIL;
    else if (phoneAllowed) recommendedChannel = Channel.PHONE;
    else if (whatsappAllowed) recommendedChannel = Channel.WHATSAPP;
  }

  const roleLabel = ROLE_CATEGORY_LABELS[contact.roleCategory] ?? 'Contact';
  const triggerPhrase = topTrigger ?? account.recentBusinessTrigger ?? null;

  let recommendedNextAction: string;
  switch (priority) {
    case Priority.P1:
      recommendedNextAction = phoneAllowed
        ? `Call within 24 hours, then send a personalised invitation to ${eventDescriptor(campaign)} the same day. Offer a calendar hold.`
        : `No callable number - send a personalised one-to-one email today referencing ${triggerPhrase ? `"${triggerPhrase}"` : 'their current initiative'}, then follow up in 48 hours to qualify by email.`;
      break;
    case Priority.P2:
      recommendedNextAction = phoneAllowed
        ? `Send the tailored invitation email now and add to the call list for the second dialling window. Re-score after any engagement event.`
        : `No callable number - qualify by email. Send the tailored invitation now, then a value-add follow-up in 5 days, and promote on any engagement event.`;
      break;
    case Priority.P3:
      recommendedNextAction = phoneAllowed
        ? `Add to the nurture sequence only. Send the white paper, watch for an engagement event, and re-qualify before any call.`
        : `Email nurture only - no callable number. Send the white paper and re-qualify if an engagement event arrives.`;
      break;
    case Priority.COMPLIANCE_HOLD:
      recommendedNextAction = `Do not contact. Complete the compliance record (${compliance.missingFields.join(', ') || 'missing fields'}) and re-run the gate.`;
      break;
    default:
      recommendedNextAction = 'Do not contact. Rejected by the relevance or compliance gate.';
  }

  const callerOpening = blocked
    ? 'Outreach is blocked for this contact.'
    : `"Hi ${contact.firstName}, I'm calling about ${campaign.targetBusinessProblem.toLowerCase()} at ${account.companyName}.` +
      (triggerPhrase ? ` I saw ${triggerPhrase.toLowerCase()}.` : '') +
      ` As ${indefinite(roleLabel)} for this area, are you looking at ${campaign.topic.toLowerCase()} this year?"`;

  const emailAngle = blocked
    ? 'No email angle - outreach is blocked.'
    : `Lead with ${triggerPhrase ? `their "${triggerPhrase}"` : `${account.industry} peers facing ${campaign.targetBusinessProblem.toLowerCase()}`}, ` +
      `connect it to ${campaign.targetBusinessProblem.toLowerCase()}, and offer ${eventDescriptor(campaign)} as the practical next step. ` +
      `Frame it for ${roleLabel.toLowerCase()} outcomes, not features.`;

  return {
    recommendedChannel,
    recommendedNextAction,
    callerOpening,
    emailAngle,
    whatsappRecommended,
    whatsappReason,
  };
}

function indefinite(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word.toLowerCase()}` : `a ${word.toLowerCase()}`;
}
