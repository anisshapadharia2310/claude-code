'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { PriorityBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Checkbox, Select } from '@/components/ui/form';
import { InfoTip } from '@/components/ui/misc';
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import type { ContactRow } from '@/lib/rows';
import { cn, formatDate, humanize } from '@/lib/utils';
import { bulkAssignAction, bulkStatusAction } from '@/server/actions/contacts';
import type { Priority } from '@prisma/client';

const STATUSES = [
  'NEW', 'ASSIGNED', 'ATTEMPTED', 'CONTACTED', 'ENGAGED', 'REGISTERED',
  'ATTENDED', 'MEETING_SET', 'NURTURE', 'CLOSED_LOST', 'DO_NOT_CONTACT',
];

/** One-line summary of why the row scored what it did. */
function scoreTooltip(row: ContactRow): string {
  return [
    `Company fit ${row.fitScore}/25`,
    `Role relevance ${row.roleRelevanceScore}/25`,
    `Trigger ${row.triggerScore}/20`,
    `Engagement ${row.engagementScore}/15`,
    `Data quality ${row.dataQualityScore}/10`,
    `Attendance likelihood ${row.attendanceLikelihoodScore}/5`,
    row.engagementBonusScore > 0 ? `Post-event bonus +${row.engagementBonusScore}` : null,
  ].filter(Boolean).join(' · ');
}

export function ContactTable({
  rows, campaignId, callers, canBulk, canExport,
}: {
  rows: ContactRow[];
  campaignId: string;
  callers: Array<{ id: string; name: string }>;
  canBulk: boolean;
  canExport: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const ids = useMemo(() => [...selected].join(','), [selected]);
  const allSelected = rows.length > 0 && selected.size === rows.length;

  const toggle = (id: string): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = (): void => {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  };

  return (
    <div>
      {canBulk && selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-end gap-4 rounded-md border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-sm font-medium text-brand-900">
            {selected.size} selected
            <button type="button" onClick={() => setSelected(new Set())} className="ml-2 text-xs font-normal underline">
              clear
            </button>
          </p>

          <ActionForm action={bulkAssignAction} feedbackPosition="none" className="flex items-end gap-2">
            <input type="hidden" name="ids" value={ids} />
            <input type="hidden" name="campaignId" value={campaignId} />
            <div>
              <label htmlFor="bulk-assign" className="mb-1 block text-xs font-medium text-brand-900">Assign to</label>
              <Select id="bulk-assign" name="assignedTo" className="h-8 w-44 text-xs" required>
                <option value="">Choose a caller</option>
                {callers.map((caller) => <option key={caller.id} value={caller.id}>{caller.name}</option>)}
              </Select>
            </div>
            <SubmitButton size="sm" pendingLabel="Assigning...">Assign</SubmitButton>
          </ActionForm>

          <ActionForm action={bulkStatusAction} feedbackPosition="none" className="flex items-end gap-2">
            <input type="hidden" name="ids" value={ids} />
            <input type="hidden" name="campaignId" value={campaignId} />
            <div>
              <label htmlFor="bulk-status" className="mb-1 block text-xs font-medium text-brand-900">Set status</label>
              <Select id="bulk-status" name="currentStatus" className="h-8 w-44 text-xs" required>
                {STATUSES.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
              </Select>
            </div>
            <label className="flex items-center gap-1.5 pb-2 text-xs text-brand-900">
              <Checkbox name="confirm" value="yes" required />
              Confirm
            </label>
            <SubmitButton size="sm" variant="secondary" pendingLabel="Updating...">Update</SubmitButton>
          </ActionForm>

          {canExport ? (
            <ButtonLink
              href={`/api/export/contacts?campaignId=${campaignId}&ids=${encodeURIComponent(ids)}`}
              variant="outline"
              size="sm"
            >
              Export selected
            </ButtonLink>
          ) : null}
        </div>
      ) : null}

      <TableWrap className="rounded-lg border border-line bg-white">
        <Table>
          <thead>
            <tr>
              {canBulk ? (
                <Th className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label={allSelected ? 'Clear selection' : 'Select every visible contact'}
                  />
                </Th>
              ) : null}
              <Th className="w-28">Priority</Th>
              <Th className="w-16 text-right">Score</Th>
              <Th>Contact</Th>
              <Th>Company</Th>
              <Th>Role classification</Th>
              <Th>Trigger</Th>
              <Th>Reachability</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <EmptyRow colSpan={canBulk ? 9 : 8} /> : null}
            {rows.map((row) => (
              <Tr key={row.id} className={cn(selected.has(row.id) && 'bg-brand-50')}>
                {canBulk ? (
                  <Td>
                    <Checkbox
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Select ${row.firstName} ${row.lastName}`}
                    />
                  </Td>
                ) : null}

                <Td>
                  <PriorityBadge
                    priority={row.priority as Priority}
                    pending={row.priority === 'P1' && row.humanReviewStatus !== 'APPROVED'}
                  />
                  {row.humanReviewRequired ? (
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                      Review needed
                    </p>
                  ) : null}
                </Td>

                <Td className="text-right">
                  <InfoTip text={scoreTooltip(row)}>
                    <span className="tabular text-base font-semibold text-navy-900">{row.totalScore}</span>
                  </InfoTip>
                </Td>

                <Td>
                  <Link href={`/contacts/${row.id}`} className="font-medium text-brand-700 hover:underline">
                    {row.firstName} {row.lastName}
                  </Link>
                  <p className="text-xs text-navy-600">{row.jobTitle}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-navy-400" title="Normalized title used for classification">
                    {row.normalizedJobTitle}
                  </p>
                </Td>

                <Td>
                  <Link href={`/accounts/${row.accountId}`} className="text-navy-800 hover:underline">
                    {row.company}
                  </Link>
                  <p className="text-xs text-navy-500">{row.industry}</p>
                  <p className="text-xs text-navy-500">{row.city ? `${row.city}, ` : ''}{row.country}</p>
                </Td>

                <Td>
                  <p className="text-xs font-medium text-navy-800">{humanize(row.roleCategory)}</p>
                  <p className="text-xs text-navy-500">{humanize(row.seniority)}</p>
                  <InfoTip text={`Role relevance ${row.roleRelevanceScore} of 25. A P1 needs at least 18, which requires confirmed direct ownership.`}>
                    <span className="tabular text-[11px] text-navy-500">role {row.roleRelevanceScore}/25</span>
                  </InfoTip>
                </Td>

                <Td className="max-w-56">
                  {row.trigger
                    ? <p className="text-xs leading-snug text-navy-700">{row.trigger}</p>
                    : <span className="text-xs text-navy-400">No trigger found</span>}
                  <p className="tabular mt-1 text-[11px] text-navy-500">trigger {row.triggerScore}/20</p>
                </Td>

                <Td>
                  <ul className="space-y-0.5 text-[11px]">
                    <li className={cn(['VERIFIED', 'VALID'].includes(row.emailStatus) ? 'text-emerald-700' : 'text-navy-400')}>
                      Email: {humanize(row.emailStatus)}
                    </li>
                    <li className={cn(['VERIFIED', 'VALID'].includes(row.phoneStatus) ? 'text-emerald-700' : 'text-navy-400')}>
                      Phone: {humanize(row.phoneStatus)}
                    </li>
                    <li className={cn(row.whatsappStatus === 'AVAILABLE_OPTED_IN' ? 'text-emerald-700' : 'text-navy-400')}>
                      WhatsApp: {humanize(row.whatsappStatus)}
                    </li>
                    <li className="text-navy-500">Verified {formatDate(row.lastVerifiedAt)}</li>
                  </ul>
                </Td>

                <Td>
                  <p className="text-xs text-navy-700">{humanize(row.currentStatus)}</p>
                  {row.assignedName ? <p className="text-[11px] text-navy-500">{row.assignedName}</p> : null}
                  {row.nextFollowUpAt ? (
                    <p className="text-[11px] text-navy-500">Follow up {formatDate(row.nextFollowUpAt)}</p>
                  ) : null}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
