'use client';
import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { OutreachStatus } from '@prisma/client';
import { bulkAssignAction, bulkStatusAction } from '@/lib/actions/outreach-actions';
import type { ActionState } from '@/lib/actions/campaign-actions';
import { PriorityBadge } from '@/components/priority-badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InfoTip } from '@/components/ui/tooltip';
import { FormMessage } from '@/components/form-message';
import { formatDate, humanize, localTime } from '@/lib/utils';

export interface ContactRow {
  id: string;
  contactId: string;
  name: string;
  jobTitle: string;
  roleCategory: string;
  company: string;
  country: string;
  timeZone: string | null;
  priority: string;
  totalScore: number;
  roleRelevanceScore: number;
  triggerScore: number;
  dataQualityScore: number;
  attendanceLikelihoodScore: number;
  emailStatus: string;
  phoneStatus: string;
  consentStatus: string;
  currentStatus: string;
  assignedTo: string | null;
  lastVerifiedAt: string | null;
  nextFollowUpAt: string | null;
  campaignName: string;
  whyThisContact: string | null;
  humanReviewRequired: boolean;
}

const initialState: ActionState = {};

export function ContactTable({
  rows,
  callers,
  exportHref,
  canEdit,
}: {
  rows: ContactRow[];
  callers: Array<{ id: string; name: string }>;
  exportHref: string;
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [assignState, assignAction, assigning] = useActionState(bulkAssignAction, initialState);
  const [statusState, statusAction, updatingStatus] = useActionState(bulkStatusAction, initialState);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {/* --- Bulk actions ------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-navy-200 bg-card p-3">
        <span className="text-sm text-muted-foreground">
          {selected.size > 0 ? `${selected.size} selected` : `${rows.length} shown`}
        </span>

        {canEdit ? (
          <>
            <form action={assignAction} className="flex items-center gap-2">
              {selectedIds.map((id) => (
                <input key={id} type="hidden" name="ids" value={id} />
              ))}
              <Select name="assignedToId" className="w-44" aria-label="Assign to caller">
                <option value="">Unassign</option>
                {callers.map((caller) => (
                  <option key={caller.id} value={caller.id}>
                    {caller.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="sm" variant="outline" disabled={selected.size === 0 || assigning}>
                Bulk assign
              </Button>
            </form>

            <form action={statusAction} className="flex items-center gap-2">
              {selectedIds.map((id) => (
                <input key={id} type="hidden" name="ids" value={id} />
              ))}
              <Select name="currentStatus" className="w-44" aria-label="New status">
                {Object.values(OutreachStatus).map((status) => (
                  <option key={status} value={status}>
                    {humanize(status)}
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  name="confirm"
                  value="yes"
                  checked={confirmBulk}
                  onChange={(event) => setConfirmBulk(event.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Confirm
              </label>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={selected.size === 0 || !confirmBulk || updatingStatus}
              >
                Bulk status update
              </Button>
            </form>
          </>
        ) : null}

        <Button asChild size="sm" variant="secondary" className="ml-auto">
          <a href={exportHref}>Export CSV</a>
        </Button>
      </div>

      <FormMessage state={assignState} />
      <FormMessage state={statusState} />

      {/* --- Table --------------------------------------------------------- */}
      <div className="rounded-lg border border-navy-200 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))
                  }
                  className="h-3.5 w-3.5"
                />
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role category</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Role</TableHead>
              <TableHead className="text-right">Trigger</TableHead>
              <TableHead className="text-right">Data</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Reachability</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Follow-up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={selected.has(row.id) ? 'bg-accent/60' : undefined}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.name}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="h-3.5 w-3.5"
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/contacts/${row.contactId}`} className="font-medium text-navy-900 hover:underline">
                    {row.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{row.jobTitle}</span>
                  {row.humanReviewRequired ? (
                    <Badge variant="warning" className="mt-0.5">
                      Review needed
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{row.company}</span>
                  <span className="block text-xs text-muted-foreground">
                    {row.country} &middot; {localTime(row.timeZone)} local
                  </span>
                </TableCell>
                <TableCell className="text-xs">{humanize(row.roleCategory)}</TableCell>
                <TableCell className="numeric text-right font-semibold">
                  {row.whyThisContact ? (
                    <InfoTip label={row.whyThisContact}>{row.totalScore}</InfoTip>
                  ) : (
                    row.totalScore
                  )}
                </TableCell>
                <TableCell className="numeric text-right text-xs">{row.roleRelevanceScore}/25</TableCell>
                <TableCell className="numeric text-right text-xs">{row.triggerScore}/20</TableCell>
                <TableCell className="numeric text-right text-xs">{row.dataQualityScore}/10</TableCell>
                <TableCell>
                  <PriorityBadge priority={row.priority as never} />
                </TableCell>
                <TableCell className="space-x-1 text-[11px]">
                  <Badge variant={['VERIFIED', 'VALID'].includes(row.emailStatus) ? 'success' : 'muted'}>
                    Email
                  </Badge>
                  <Badge variant={['VERIFIED', 'VALID'].includes(row.phoneStatus) ? 'success' : 'muted'}>
                    Phone
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{humanize(row.currentStatus)}</TableCell>
                <TableCell className="text-xs">{row.assignedTo ?? '-'}</TableCell>
                <TableCell className="text-xs">{formatDate(row.nextFollowUpAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
