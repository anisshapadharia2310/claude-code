'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Priority } from '@prisma/client';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { PriorityBadge, StatusDot } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Checkbox, Select } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { InfoTip } from '@/components/ui/misc';
import { EmptyRow, Table, TableCaption, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import type { ContactRow } from '@/lib/rows';
import { cn, formatDate, humanize } from '@/lib/utils';
import { bulkAssignAction, bulkStatusAction } from '@/server/actions/contacts';

const STATUSES = [
  'NEW', 'ASSIGNED', 'ATTEMPTED', 'CONTACTED', 'ENGAGED', 'REGISTERED',
  'ATTENDED', 'MEETING_SET', 'NURTURE', 'CLOSED_LOST', 'DO_NOT_CONTACT',
];

/** The full derivation of a row's score, shown on hover over the figure. */
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

function scoreTone(score: number): string {
  if (score >= 80) return 'text-brand-700';
  if (score >= 60) return 'text-warn-700';
  if (score >= 40) return 'text-navy-600';
  return 'text-navy-400';
}

function reachTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (['VERIFIED', 'VALID', 'AVAILABLE_OPTED_IN'].includes(status)) return 'success';
  if (['UNVERIFIED', 'CATCH_ALL', 'RISKY', 'AVAILABLE_NO_CONSENT'].includes(status)) return 'warning';
  if (['INVALID', 'BOUNCED', 'WRONG_NUMBER', 'DO_NOT_CALL', 'OPTED_OUT', 'BLOCKED_BY_POLICY'].includes(status)) return 'danger';
  return 'neutral';
}

/** Company initials, used as a lightweight account marker in the identity cell. */
function companyMark(name: string): string {
  return name
    .replace(/[^a-zA-Z ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

export function ContactTable({
  rows, campaignId, callers, canBulk, canExport, total,
}: {
  rows: ContactRow[];
  campaignId: string;
  callers: Array<{ id: string; name: string }>;
  canBulk: boolean;
  canExport: boolean;
  total?: number;
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
      {/* ---------------------------------------------------- bulk action bar
          Appears only when a selection exists, and sticks above the table so it
          stays reachable while scrolling a long list. */}
      {canBulk && selected.size > 0 ? (
        <div className="sticky top-[60px] z-20 mb-3 animate-rise rounded-xl border border-brand-200 bg-brand-50/95 px-4 py-3 shadow-md backdrop-blur-sm">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <p className="flex items-center gap-2 pb-1.5 text-sm font-semibold text-brand-900">
              <span className="tabular flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-700 px-1.5 text-xs text-white">
                {selected.size}
              </span>
              selected
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded text-xs font-normal text-brand-700 underline underline-offset-2 hover:text-brand-900"
              >
                clear
              </button>
            </p>

            <ActionForm action={bulkAssignAction} feedbackPosition="none" className="flex items-end gap-2">
              <input type="hidden" name="ids" value={ids} />
              <input type="hidden" name="campaignId" value={campaignId} />
              <div>
                <label htmlFor="bulk-assign" className="mb-1 block text-2xs font-semibold uppercase tracking-[0.05em] text-brand-900">
                  Assign to
                </label>
                <Select id="bulk-assign" name="assignedTo" className="h-8 w-44 text-xs" required>
                  <option value="">Choose a caller</option>
                  {callers.map((caller) => <option key={caller.id} value={caller.id}>{caller.name}</option>)}
                </Select>
              </div>
              <SubmitButton size="sm" icon="user" pendingLabel="Assigning…">Assign</SubmitButton>
            </ActionForm>

            <ActionForm action={bulkStatusAction} feedbackPosition="none" className="flex items-end gap-2">
              <input type="hidden" name="ids" value={ids} />
              <input type="hidden" name="campaignId" value={campaignId} />
              <div>
                <label htmlFor="bulk-status" className="mb-1 block text-2xs font-semibold uppercase tracking-[0.05em] text-brand-900">
                  Set status
                </label>
                <Select id="bulk-status" name="currentStatus" className="h-8 w-44 text-xs" required>
                  {STATUSES.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                </Select>
              </div>
              <label className="flex items-center gap-1.5 pb-2 text-xs text-brand-900">
                <Checkbox name="confirm" value="yes" required />
                Confirm
              </label>
              <SubmitButton size="sm" variant="secondary" pendingLabel="Updating…">Update</SubmitButton>
            </ActionForm>

            {canExport ? (
              <ButtonLink
                href={`/api/export/contacts?campaignId=${campaignId}&ids=${encodeURIComponent(ids)}`}
                variant="outline"
                size="sm"
                icon="download"
                className="mb-0"
              >
                Export selected
              </ButtonLink>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* --------------------------------------------------------- desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-line bg-surface shadow-xs lg:block">
        <TableWrap className="max-h-[calc(100dvh-18rem)]">
          <Table>
            <thead>
              <tr>
                {canBulk ? (
                  <Th className="w-9 px-2.5">
                    <Checkbox
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={allSelected ? 'Clear selection' : 'Select every visible contact'}
                    />
                  </Th>
                ) : null}
                <Th className="w-[96px] px-2.5">Priority</Th>
                <Th className="w-[56px] px-2.5" numeric>Score</Th>
                <Th className="min-w-[175px] px-2.5">Contact</Th>
                <Th className="min-w-[155px] px-2.5">Company</Th>
                <Th className="hidden min-w-[120px] px-2.5 xl:table-cell">Role</Th>
                <Th className="hidden px-2.5 2xl:table-cell">Business trigger</Th>
                <Th className="hidden w-[112px] px-2.5 2xl:table-cell">Reach</Th>
                <Th className="min-w-[116px] px-2.5">Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? <EmptyRow colSpan={canBulk ? 9 : 8} /> : null}
              {rows.map((row) => (
                <Tr key={row.id} selected={selected.has(row.id)}>
                  {canBulk ? (
                    <Td className="px-2.5">
                      <Checkbox
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`Select ${row.firstName} ${row.lastName}`}
                      />
                    </Td>
                  ) : null}

                  <Td className="px-2.5">
                    <PriorityBadge
                      priority={row.priority as Priority}
                      pending={row.priority === 'P1' && row.humanReviewStatus !== 'APPROVED'}
                      size="sm"
                    />
                    {row.humanReviewRequired && row.priority !== 'P1' ? (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-warn-700">
                        <Icon name="review" className="h-3 w-3" strokeWidth={2.25} />
                        Review
                      </p>
                    ) : null}
                  </Td>

                  <Td numeric className="px-2.5">
                    <InfoTip text={scoreTooltip(row)} className="decoration-transparent">
                      <span className={cn('tabular text-lg font-semibold tracking-[-0.02em]', scoreTone(row.totalScore))}>
                        {row.totalScore}
                      </span>
                    </InfoTip>
                  </Td>

                  <Td className="px-2.5">
                    <Link
                      href={`/contacts/${row.id}`}
                      className="rounded text-sm font-semibold text-navy-900 transition-colors hover:text-brand-700 hover:underline"
                    >
                      {row.firstName} {row.lastName}
                    </Link>
                    <p className="mt-0.5 text-xs leading-snug text-navy-600">{row.jobTitle}</p>
                    <p
                      className="mt-1 truncate font-mono text-[10px] text-navy-400"
                      title={`Normalized title used for classification: ${row.normalizedJobTitle}`}
                    >
                      {row.normalizedJobTitle}
                    </p>
                    {/* Below the extra-large breakpoint the role and reach columns
                        are hidden, so their essentials ride along here. */}
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-navy-500 xl:hidden">
                      <span>{humanize(row.roleCategory)}</span>
                      <span aria-hidden="true" className="text-navy-300">·</span>
                      <span className="tabular">role {row.roleRelevanceScore}/25</span>
                    </p>
                    <p className="mt-0.5 hidden flex-wrap items-center gap-x-2 text-[10px] text-navy-500 xl:flex 2xl:hidden">
                      <span className="tabular">trigger {row.triggerScore}/20</span>
                      <span aria-hidden="true" className="text-navy-300">·</span>
                      <span>{humanize(row.emailStatus)}</span>
                    </p>
                  </Td>

                  <Td className="px-2.5">
                    <div className="flex items-start gap-2">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy-100 text-[10px] font-bold text-navy-500"
                      >
                        {companyMark(row.company)}
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={`/accounts/${row.accountId}`}
                          className="block truncate rounded text-sm text-navy-800 transition-colors hover:text-brand-700 hover:underline"
                        >
                          {row.company}
                        </Link>
                        <span className="block truncate text-xs text-navy-500">{row.industry}</span>
                        <span className="block truncate text-xs text-navy-500">
                          {row.city ? `${row.city}, ` : ''}{row.country}
                        </span>
                      </span>
                    </div>
                  </Td>

                  <Td className="hidden px-2.5 xl:table-cell">
                    <p className="text-xs font-medium text-navy-800">{humanize(row.roleCategory)}</p>
                    <p className="text-xs text-navy-500">{humanize(row.seniority)}</p>
                    <InfoTip
                      text={`Role relevance ${row.roleRelevanceScore} of 25. A P1 needs at least 18, which is only reachable with confirmed direct ownership.`}
                    >
                      <span className="tabular mt-1 inline-block text-[11px] text-navy-500">
                        {row.roleRelevanceScore}/25
                      </span>
                    </InfoTip>
                  </Td>

                  <Td className="hidden max-w-[280px] px-2.5 2xl:table-cell">
                    {row.trigger ? (
                      <p className="line-clamp-3 text-xs leading-snug text-navy-700">{row.trigger}</p>
                    ) : (
                      <span className="text-xs italic text-navy-400">No trigger found</span>
                    )}
                    <span className="tabular mt-1 inline-block text-[11px] text-navy-500">
                      trigger {row.triggerScore}/20
                    </span>
                  </Td>

                  <Td className="hidden px-2.5 2xl:table-cell">
                    <ul className="space-y-1">
                      {([
                        ['mail', 'Email', row.emailStatus],
                        ['phone', 'Phone', row.phoneStatus],
                        ['chat', 'WhatsApp', row.whatsappStatus],
                      ] as const).map(([icon, channel, status]) => (
                        <li key={channel} title={`${channel}: ${humanize(status)}`} className="flex items-center gap-1.5 text-[11px]">
                          <Icon name={icon} className="h-3 w-3 shrink-0 text-navy-400" />
                          <span className={cn(
                            'truncate',
                            reachTone(status) === 'success' ? 'text-success-700'
                              : reachTone(status) === 'danger' ? 'text-danger-700'
                              : reachTone(status) === 'warning' ? 'text-warn-700' : 'text-navy-500',
                          )}>
                            <span className="sr-only">{channel}: </span>{humanize(status)}
                          </span>
                        </li>
                      ))}
                      <li className="flex items-center gap-1.5 text-[11px] text-navy-400">
                        <Icon name="clock" className="h-3 w-3 shrink-0" />
                        <span className="truncate">{formatDate(row.lastVerifiedAt)}</span>
                      </li>
                    </ul>
                  </Td>

                  <Td className="px-2.5">
                    <p className="text-xs font-medium text-navy-700">{humanize(row.currentStatus)}</p>
                    {row.assignedName ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-navy-500">
                        <Icon name="user" className="h-3 w-3" />{row.assignedName}
                      </p>
                    ) : null}
                    {row.nextFollowUpAt ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-navy-500">
                        <Icon name="clock" className="h-3 w-3" />{formatDate(row.nextFollowUpAt)}
                      </p>
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
        {rows.length > 0 ? (
          <div className="border-t border-line bg-surface-sunk">
            <TableCaption showing={rows.length} total={total ?? rows.length}>
              <span className="hidden 2xl:hidden xl:inline">
                Business trigger and reachability show on wider screens; open a record for the full detail.
              </span>
            </TableCaption>
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------------------- mobile
          The same records as cards. Every field on the desktop row is present;
          nothing is dropped to make it fit. */}
      <ul className="space-y-2.5 lg:hidden" role="list">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-dashed border-line-strong bg-surface px-4 py-12 text-center text-sm text-navy-500">
            No records match the current filters.
          </li>
        ) : null}
        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(
              'rounded-xl border bg-surface p-4 shadow-xs transition-colors',
              selected.has(row.id) ? 'border-brand-400 bg-brand-50/40' : 'border-line',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                {canBulk ? (
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    aria-label={`Select ${row.firstName} ${row.lastName}`}
                  />
                ) : null}
                <div className="min-w-0">
                  <Link href={`/contacts/${row.id}`} className="block truncate text-sm font-semibold text-navy-900">
                    {row.firstName} {row.lastName}
                  </Link>
                  <p className="truncate text-xs text-navy-600">{row.jobTitle}</p>
                  <Link href={`/accounts/${row.accountId}`} className="mt-0.5 block truncate text-xs text-navy-500">
                    {row.company} · {row.country}
                  </Link>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={cn('tabular text-xl font-semibold leading-none', scoreTone(row.totalScore))}>
                  {row.totalScore}
                </span>
                <PriorityBadge
                  priority={row.priority as Priority}
                  pending={row.priority === 'P1' && row.humanReviewStatus !== 'APPROVED'}
                  size="sm"
                />
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3 text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.05em] text-navy-400">Role</dt>
                <dd className="text-navy-700">{humanize(row.roleCategory)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.05em] text-navy-400">Seniority</dt>
                <dd className="text-navy-700">{humanize(row.seniority)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase tracking-[0.05em] text-navy-400">Trigger</dt>
                <dd className="text-navy-700">{row.trigger ?? 'No trigger found'}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.05em] text-navy-400">Status</dt>
                <dd className="text-navy-700">{humanize(row.currentStatus)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.05em] text-navy-400">Verified</dt>
                <dd className="text-navy-700">{formatDate(row.lastVerifiedAt)}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusDot tone={reachTone(row.emailStatus)} label={humanize(row.emailStatus)} className="text-[11px]" />
              <StatusDot tone={reachTone(row.phoneStatus)} label={humanize(row.phoneStatus)} className="text-[11px]" />
              <StatusDot tone={reachTone(row.whatsappStatus)} label={humanize(row.whatsappStatus)} className="text-[11px]" />
            </div>

            <div className="mt-3 flex gap-2">
              <ButtonLink href={`/contacts/${row.id}`} variant="outline" size="sm" block>
                Open record
              </ButtonLink>
            </div>
          </li>
        ))}
      </ul>

      {canBulk && rows.length > 0 && selected.size === 0 ? (
        <p className="mt-3 hidden items-center gap-1.5 text-xs text-navy-400 lg:flex">
          <Icon name="info" className="h-3.5 w-3.5" />
          Select rows to assign them to a caller, change their status, or export just the selection.
        </p>
      ) : null}

      {selected.size > 0 ? (
        <div aria-live="polite" className="sr-only">{selected.size} contacts selected</div>
      ) : null}

      <noscript>
        <p className="mt-3 text-xs text-navy-500">
          Row selection needs JavaScript. Filtering, sorting and export all work without it.
        </p>
      </noscript>
    </div>
  );
}
