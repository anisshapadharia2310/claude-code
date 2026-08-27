/**
 * Reading the stored score breakdown.
 *
 * The engine writes a JSON blob on every scoring run. This module gives it a
 * type and a safe reader, so the UI can render an explanation without ever
 * recomputing a score.
 */
import type {
  AccountSignal, BandResult, ComplianceStatus, EngagementBonusEntry, GateCheck, Channel,
} from '@/domain/types';

export interface StoredBreakdown {
  bands: BandResult[];
  baseScore: number;
  engagementBonus: number;
  engagementBonusDetail: EngagementBonusEntry[];
  totalScore: number;
  cappedAt100: boolean;
  scoredAt: string;
  priorityReasons: string[];
  gateChecks: GateCheck[];
  compliance: {
    status: ComplianceStatus;
    allowedChannels: Channel[];
    blockedChannels: Array<{ channel: Channel; reason: string }>;
    missingFields: string[];
    summary: string;
  };
  accountSignal: AccountSignal | null;
}

export function readBreakdown(value: unknown): StoredBreakdown | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StoredBreakdown>;
  if (!Array.isArray(candidate.bands)) return null;
  return {
    bands: candidate.bands,
    baseScore: candidate.baseScore ?? 0,
    engagementBonus: candidate.engagementBonus ?? 0,
    engagementBonusDetail: candidate.engagementBonusDetail ?? [],
    totalScore: candidate.totalScore ?? 0,
    cappedAt100: candidate.cappedAt100 ?? false,
    scoredAt: candidate.scoredAt ?? '',
    priorityReasons: candidate.priorityReasons ?? [],
    gateChecks: candidate.gateChecks ?? [],
    compliance: candidate.compliance ?? {
      status: 'HOLD', allowedChannels: [], blockedChannels: [], missingFields: [], summary: '',
    },
    accountSignal: candidate.accountSignal ?? null,
  };
}
