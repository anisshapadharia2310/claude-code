import { z } from 'zod';

/**
 * The default 100-point model. Administrators may override these per campaign,
 * but the total must always come to exactly 100 so that scores stay comparable
 * across campaigns.
 */
export const DEFAULT_WEIGHTS = {
  companyFit: {
    industryMatch: 8,
    geographyMatch: 5,
    sizeBand: 5,
    technologyOrModel: 4,
    namedOrExistingClient: 3,
  },
  roleRelevance: {
    directOwner: 12,
    operationalOwnerOrInfluencer: 8,
    seniority: 3,
    budgetOrDecisionInfluence: 2,
  },
  trigger: {
    hiring: 5,
    transformation: 5,
    expansionOrMerger: 3,
    leadershipChange: 2,
    regulatoryPressure: 3,
    statedPriority: 2,
  },
  engagement: {
    positiveEmailReply: 5,
    whitepaperDownload: 3,
    webinarRegistration: 4,
    resourceClick: 2,
    previousAttendanceOrMeeting: 1,
  },
  dataQuality: {
    verifiedTitle: 2,
    verifiedEmail: 2,
    validPhone: 2,
    countryAndTimeZone: 1,
    contactSource: 1,
    lastVerified: 1,
    consentRecorded: 1,
  },
  attendance: {
    previousAttendance: 2,
    earlyRegistration: 1,
    convenientLocalTime: 1,
    explicitLinkRequest: 1,
  },
} as const;

const criterion = z.number().int().min(0).max(100);

export const scoringWeightsSchema = z
  .object({
    companyFit: z.object({
      industryMatch: criterion,
      geographyMatch: criterion,
      sizeBand: criterion,
      technologyOrModel: criterion,
      namedOrExistingClient: criterion,
    }),
    roleRelevance: z.object({
      directOwner: criterion,
      operationalOwnerOrInfluencer: criterion,
      seniority: criterion,
      budgetOrDecisionInfluence: criterion,
    }),
    trigger: z.object({
      hiring: criterion,
      transformation: criterion,
      expansionOrMerger: criterion,
      leadershipChange: criterion,
      regulatoryPressure: criterion,
      statedPriority: criterion,
    }),
    engagement: z.object({
      positiveEmailReply: criterion,
      whitepaperDownload: criterion,
      webinarRegistration: criterion,
      resourceClick: criterion,
      previousAttendanceOrMeeting: criterion,
    }),
    dataQuality: z.object({
      verifiedTitle: criterion,
      verifiedEmail: criterion,
      validPhone: criterion,
      countryAndTimeZone: criterion,
      contactSource: criterion,
      lastVerified: criterion,
      consentRecorded: criterion,
    }),
    attendance: z.object({
      previousAttendance: criterion,
      earlyRegistration: criterion,
      convenientLocalTime: criterion,
      explicitLinkRequest: criterion,
    }),
  })
  .superRefine((weights, ctx) => {
    const total = totalWeight(weights);
    if (total !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Scoring weights must total exactly 100 points. This configuration totals ${total}.`,
      });
    }
  });

export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;

/** Sum of every criterion across every component. */
export function totalWeight(weights: ScoringWeights): number {
  return Object.values(weights).reduce<number>(
    (sum, component) =>
      sum + Object.values(component as Record<string, number>).reduce((a, b) => a + b, 0),
    0,
  );
}

/** Maximum attainable points per component, derived from the weights. */
export function componentMaxima(weights: ScoringWeights) {
  const sum = (component: Record<string, number>) =>
    Object.values(component).reduce((a, b) => a + b, 0);
  return {
    fit: sum(weights.companyFit),
    roleRelevance: sum(weights.roleRelevance),
    trigger: sum(weights.trigger),
    engagement: sum(weights.engagement),
    dataQuality: sum(weights.dataQuality),
    attendance: sum(weights.attendance),
  };
}

export interface WeightValidation {
  valid: boolean;
  total: number;
  errors: string[];
}

export function validateWeights(input: unknown): WeightValidation {
  const parsed = scoringWeightsSchema.safeParse(input);
  if (parsed.success) {
    return { valid: true, total: totalWeight(parsed.data), errors: [] };
  }
  const shallow = z
    .record(z.record(z.number()))
    .safeParse(input);
  const total = shallow.success
    ? Object.values(shallow.data).reduce(
        (sum, component) => sum + Object.values(component).reduce((a, b) => a + b, 0),
        0,
      )
    : 0;
  return {
    valid: false,
    total,
    errors: parsed.error.issues.map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    ),
  };
}

/** Falls back to the default model when a campaign has no custom weights. */
export function resolveWeights(input: unknown): ScoringWeights {
  if (!input) return DEFAULT_WEIGHTS as unknown as ScoringWeights;
  const parsed = scoringWeightsSchema.safeParse(input);
  return parsed.success ? parsed.data : (DEFAULT_WEIGHTS as unknown as ScoringWeights);
}

export const COMPONENT_LABELS = {
  A_FIT: 'Company fit',
  B_ROLE: 'Contact-role relevance',
  C_TRIGGER: 'Current business trigger',
  D_ENGAGEMENT: 'Engagement and intent',
  E_DATA_QUALITY: 'Data quality and reachability',
  F_ATTENDANCE: 'Attendance likelihood',
} as const;
