/**
 * Outreach recommendations.
 *
 * Produces the "why this contact" draft, the call opening, the email angle and
 * the next action. Each priority band gets a materially different action:
 * P1 is worked by phone with a named trigger, P2 is email-first with a call
 * follow-up, P3 is nurture only.
 */
import { BUSINESS_FUNCTION_LABELS, ROLE_CATEGORY_LABELS } from './taxonomy';
import type { CampaignRelevanceResult } from './taxonomy';
import type { ScoreResult } from './scoring';
import type { Account, Campaign, Channel, ComplianceResult, Contact, Priority } from './types';

export interface RecommendationInput {
  account: Account;
  contact: Contact;
  campaign: Campaign;
  priority: Priority;
  score: ScoreResult;
  relevance: CampaignRelevanceResult;
  compliance: ComplianceResult;
  accountSignalMessage?: string | null;
}

export interface Recommendations {
  whyThisContact: string;
  recommendedChannel: Channel | null;
  recommendedNextAction: string;
  callerOpening: string;
  emailAngle: string;
  whatsappRecommendation: string;
}

/** The single strongest trigger on the account, phrased for a human. */
export function primaryTrigger(account: Account): string | null {
  if (account.recentBusinessTrigger) return account.recentBusinessTrigger;
  if (account.transformationActivity) return 'an active transformation programme';
  if (account.relevantOpenJobPostings > 0) {
    return `${account.relevantOpenJobPostings} open role${account.relevantOpenJobPostings === 1 ? '' : 's'} in the relevant function`;
  }
  if (account.mergerOrAcquisitionActivity) return 'recent merger or acquisition activity';
  if (account.expansionActivity) return 'current expansion or restructuring';
  if (account.regulatoryPressure) return 'regulatory pressure in this market';
  if (account.leadershipChange) return 'a recent leadership change in the relevant function';
  if (account.publiclyStatedPriority) return `a publicly stated priority: ${account.publiclyStatedPriority}`;
  return null;
}

function ownershipPhrase(relevance: CampaignRelevanceResult, contact: Contact): string {
  if (relevance.directOwnership) return `owns ${functionPhrase(relevance)} directly`;
  if (relevance.operationalOwnership) return `runs ${functionPhrase(relevance)} day to day`;
  if (contact.influencesDecision) return 'influences the decision without owning it';
  return 'has a partial connection to the problem';
}

function functionPhrase(relevance: CampaignRelevanceResult): string {
  if (relevance.matchedFunctions.length === 0) return 'the relevant function';
  return relevance.matchedFunctions.map((fn) => BUSINESS_FUNCTION_LABELS[fn].toLowerCase()).join(' and ');
}

export function buildRecommendations(input: RecommendationInput): Recommendations {
  const { account, contact, campaign, priority, score, relevance, compliance } = input;
  const trigger = primaryTrigger(account);
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const canCall = compliance.allowedChannels.includes('PHONE');
  const canEmail = compliance.allowedChannels.includes('EMAIL');
  const canWhatsApp = compliance.allowedChannels.includes('WHATSAPP');

  // --- why this contact ----------------------------------------------------
  const whyParts: string[] = [
    `${fullName} is ${ROLE_CATEGORY_LABELS[contact.roleCategory].toLowerCase()} at ${account.companyName} and ${ownershipPhrase(relevance, contact)}.`,
  ];
  whyParts.push(
    `${account.companyName} is a ${account.industry} business in ${account.country}, which the ${campaign.name} campaign targets.`,
  );
  if (trigger) whyParts.push(`Current trigger: ${trigger}.`);
  else whyParts.push('No verified business trigger has been found yet, so the case rests on fit and role.');
  if (score.engagementScore > 0) {
    whyParts.push(`They have already engaged: ${score.engagementScore} of ${15} engagement points.`);
  }
  if (input.accountSignalMessage) whyParts.push(input.accountSignalMessage);

  // --- channel -------------------------------------------------------------
  let recommendedChannel: Channel | null = null;
  if (priority === 'P1' && canCall) recommendedChannel = 'PHONE';
  else if (canEmail) recommendedChannel = 'EMAIL';
  else if (canCall) recommendedChannel = 'PHONE';
  else if (canWhatsApp) recommendedChannel = 'WHATSAPP';

  // --- next action, differentiated by priority -----------------------------
  let recommendedNextAction: string;
  switch (priority) {
    case 'P1':
      recommendedNextAction = canCall
        ? `Call within 24 hours, lead with the trigger, and offer the ${campaign.campaignType === 'WEBINAR' ? 'webinar seat' : 'white paper'} as the reason to talk. Follow the call with a same-day email.`
        : `No phone channel is available, so qualify by email: send a personalised ${campaign.campaignType === 'WEBINAR' ? 'invitation' : 'white-paper offer'} within 24 hours and ask one qualifying question in the body.`;
      break;
    case 'P2':
      recommendedNextAction = canEmail
        ? 'Send the personalised email first. Call only after an open or a click, and keep the call to a single qualifying question.'
        : 'Call once to establish whether the role owns the problem, then decide whether to promote or drop.';
      break;
    case 'P3':
      recommendedNextAction = 'Nurture only. Add to the campaign newsletter and the replay send. Do not spend call time until an engagement signal appears.';
      break;
    case 'COMPLIANCE_HOLD':
      recommendedNextAction = `Do not contact. Complete the compliance record first: ${compliance.missingFields.join(', ') || 'missing fields'}.`;
      break;
    default:
      recommendedNextAction = 'Do not contact. This record failed qualification and should stay out of the working list.';
  }

  // --- call opening --------------------------------------------------------
  const openingTrigger = trigger
    ? `I saw ${account.companyName} has ${trigger}`
    : `I work with ${account.industry.toLowerCase()} teams on ${campaign.targetBusinessProblem.toLowerCase()}`;

  const callerOpening = priority === 'REJECT' || priority === 'COMPLIANCE_HOLD'
    ? 'No call script: this contact is not cleared for outreach.'
    : `"Hello ${contact.firstName}, this is [caller] from ${campaign.clientBrand}'s research team. ${openingTrigger}, and you ${ownershipPhrase(relevance, contact)} — so I wanted to ask you directly rather than guess. We are running a ${campaign.campaignType === 'WEBINAR' ? 'session' : 'briefing'} on ${campaign.topic}. Is ${campaign.targetBusinessProblem.toLowerCase()} something your team is actively working on this quarter?"`;

  // --- email angle ---------------------------------------------------------
  const emailAngle = priority === 'REJECT' || priority === 'COMPLIANCE_HOLD'
    ? 'No email angle: this contact is not cleared for outreach.'
    : [
        `Angle: ${trigger ? `their ${trigger}` : `${account.industry} pressure on ${campaign.targetBusinessProblem.toLowerCase()}`} against ${campaign.topic}.`,
        `Open on the trigger, not the offer. Name the specific outcome they own (${functionPhrase(relevance)}).`,
        `Ask one question they can answer in a single line. Offer the ${campaign.campaignType === 'WEBINAR' ? 'seat and the replay' : 'white paper'} as the second sentence, not the first.`,
        priority === 'P3' ? 'Keep it to three sentences: this is a nurture touch, not a pitch.' : '',
      ].filter(Boolean).join(' ');

  // --- WhatsApp ------------------------------------------------------------
  const whatsappRecommendation = canWhatsApp
    ? priority === 'P1' || priority === 'P2'
      ? `WhatsApp is permitted and opted in. Use it only for the ${campaign.campaignType === 'WEBINAR' ? 'joining link and a day-before reminder' : 'document link'}, after the contact has agreed on a call or by email. Never open the relationship on WhatsApp.`
      : 'WhatsApp is permitted but not recommended at this priority. Reserve it for contacts who have already engaged.'
    : `WhatsApp is not recommended: ${compliance.blockedChannels.find((entry) => entry.channel === 'WHATSAPP')?.reason ?? 'no documented permission for this contact.'}`;

  return {
    whyThisContact: whyParts.join(' '),
    recommendedChannel,
    recommendedNextAction,
    callerOpening,
    emailAngle,
    whatsappRecommendation,
  };
}
