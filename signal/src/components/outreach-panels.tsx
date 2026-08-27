'use client';
import { useActionState, useState } from 'react';
import { CallOutcome, EmailType, WhatsAppMessageType } from '@prisma/client';
import {
  logCallAction,
  logEmailAction,
  logWhatsAppAction,
  setFollowUpAction,
} from '@/lib/actions/outreach-actions';
import type { ActionState } from '@/lib/actions/campaign-actions';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FormMessage } from '@/components/form-message';
import { humanize } from '@/lib/utils';

const initialState: ActionState = {};

/** The twelve call outcomes, grouped so the common ones are easy to hit fast. */
const OUTCOME_GROUPS: Array<{ label: string; outcomes: CallOutcome[] }> = [
  {
    label: 'Reached',
    outcomes: [
      CallOutcome.CONNECTED,
      CallOutcome.INTERESTED,
      CallOutcome.CALLBACK_REQUESTED,
      CallOutcome.REGISTERED,
    ],
  },
  {
    label: 'Sent something',
    outcomes: [CallOutcome.SENT_WHITEPAPER, CallOutcome.SENT_WEBINAR_LINK],
  },
  {
    label: 'Not reached',
    outcomes: [CallOutcome.NO_ANSWER, CallOutcome.BUSY, CallOutcome.WRONG_NUMBER],
  },
  {
    label: 'Negative',
    outcomes: [CallOutcome.NOT_RELEVANT, CallOutcome.NOT_INTERESTED, CallOutcome.DO_NOT_CONTACT],
  },
];

export function CallPanel({
  campaignContactId,
  phoneAllowed,
  phoneReason,
  suggestedOpening,
}: {
  campaignContactId: string;
  phoneAllowed: boolean;
  phoneReason: string;
  suggestedOpening: string;
}) {
  const [state, formAction, pending] = useActionState(logCallAction, initialState);
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');

  return (
    <div className="space-y-3">
      {!phoneAllowed ? (
        <Alert variant="danger" title="Calling is blocked for this contact">
          {phoneReason} Use email instead - a contact without a usable phone number can still be
          qualified and nurtured by email.
        </Alert>
      ) : (
        <Alert title="Recommended opening">{suggestedOpening}</Alert>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="campaignContactId" value={campaignContactId} />
        <input type="hidden" name="outcome" value={outcome} />

        <fieldset disabled={!phoneAllowed} className="space-y-3 disabled:opacity-50">
          <div className="space-y-2">
            {OUTCOME_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.outcomes.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={outcome === value ? 'default' : 'outline'}
                      onClick={() => setOutcome(value)}
                    >
                      {humanize(value)}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor="call-notes">Call notes</Label>
            <Textarea id="call-notes" name="notes" rows={3} placeholder="What was discussed, objections, next step." />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="call-next-action">Next action</Label>
              <Input id="call-next-action" name="nextAction" placeholder="Send the agenda and call back" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="call-follow-up">Next follow-up date</Label>
              <Input id="call-follow-up" name="nextFollowUpAt" type="date" />
            </div>
          </div>

          <FormMessage state={state} />

          <Button type="submit" disabled={!outcome || pending}>
            {pending ? 'Recording...' : 'Record call outcome'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Recording an outcome raises the matching engagement event, updates the contact status, and
            re-scores the contact.
          </p>
        </fieldset>
      </form>
    </div>
  );
}

export function EmailPanel({
  campaignContactId,
  emailAllowed,
  emailReason,
  contact,
  campaign,
  emailAngle,
  complianceFooter,
  providerTransmits,
}: {
  campaignContactId: string;
  emailAllowed: boolean;
  emailReason: string;
  contact: { firstName: string; lastName: string; company: string; workEmail: string | null; jobTitle: string };
  campaign: { topic: string; targetBusinessProblem: string; registrationUrl: string | null; whitePaperUrl: string | null };
  emailAngle: string;
  complianceFooter: string;
  providerTransmits: boolean;
}) {
  const [state, formAction, pending] = useActionState(logEmailAction, initialState);
  const [subject, setSubject] = useState(
    `${contact.firstName}, ${campaign.topic.toLowerCase()} at ${contact.company}`,
  );
  const [body, setBody] = useState(
    `Hi ${contact.firstName},\n\n` +
      `You lead ${contact.jobTitle.toLowerCase()} at ${contact.company}, so ${campaign.targetBusinessProblem.toLowerCase()} is probably on your desk.\n\n` +
      `We are running a short session on ${campaign.topic.toLowerCase()}. It is practical rather than promotional, and the material is aimed at teams making this change now.\n\n` +
      (campaign.registrationUrl ? `Details and registration: ${campaign.registrationUrl}\n\n` : '') +
      (campaign.whitePaperUrl ? `The white paper is here: ${campaign.whitePaperUrl}\n\n` : '') +
      `If it is useful I can send a summary afterwards instead.\n\nBest regards,`,
  );
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-3">
      {!emailAllowed ? (
        <Alert variant="danger" title="Email is blocked for this contact">
          {emailReason}
        </Alert>
      ) : (
        <Alert title="Recommended angle">{emailAngle}</Alert>
      )}

      <div className="rounded border border-navy-200 bg-navy-50 p-2 text-xs">
        <span className="font-medium">Personalisation available: </span>
        {contact.firstName} &middot; {contact.lastName} &middot; {contact.company} &middot;{' '}
        {contact.jobTitle} &middot; {campaign.topic} &middot; {campaign.targetBusinessProblem}
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="campaignContactId" value={campaignContactId} />
        <fieldset disabled={!emailAllowed} className="space-y-3 disabled:opacity-50">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="emailType">Email type</Label>
              <Select id="emailType" name="emailType" defaultValue={EmailType.WEBINAR_INVITE}>
                {Object.values(EmailType).map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="subject">Subject line</Label>
              <Input id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="body">Email body</Label>
            <Textarea id="body" name="body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="rounded border border-navy-200 bg-navy-50 p-2 text-[11px] text-muted-foreground">
            <p className="mb-1 font-medium text-navy-800">Compliance footer (appended automatically)</p>
            <pre className="whitespace-pre-wrap font-sans">{complianceFooter}</pre>
          </div>

          <FormMessage state={state} />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? 'Hide preview' : 'Preview'}
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {providerTransmits ? 'Send email' : 'Log email'}
            </Button>
            <Button type="submit" size="sm" variant="secondary" disabled={pending} name="test" value="1">
              Send test to myself
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {providerTransmits
              ? 'A provider is connected; this will transmit.'
              : 'No email provider is connected. The message is recorded in SIGNAL and nothing is transmitted.'}
          </p>
        </fieldset>
      </form>

      {showPreview ? (
        <div className="rounded-lg border border-navy-300 bg-card p-4">
          <p className="text-xs text-muted-foreground">To: {contact.workEmail ?? 'no address'}</p>
          <p className="mt-1 font-semibold text-navy-900">{subject}</p>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">{body}</pre>
          <pre className="mt-4 whitespace-pre-wrap border-t border-navy-200 pt-2 font-sans text-[11px] text-muted-foreground">
            {complianceFooter}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function WhatsAppPanel({
  campaignContactId,
  allowed,
  reason,
  recommended,
  contact,
  campaign,
}: {
  campaignContactId: string;
  allowed: boolean;
  reason: string;
  recommended: boolean;
  contact: { firstName: string; whatsappStatus: string; phoneNumber: string | null };
  campaign: { name: string; topic: string; eventLocal: string | null; registrationUrl: string | null };
}) {
  const [state, formAction, pending] = useActionState(logWhatsAppAction, initialState);
  const [messageText, setMessageText] = useState(
    `Hi ${contact.firstName}, this is a quick note about the ${campaign.topic} session` +
      (campaign.eventLocal ? ` on ${campaign.eventLocal} your local time` : '') +
      `. ${campaign.registrationUrl ? `You can register here: ${campaign.registrationUrl}. ` : ''}` +
      `Reply STOP and I will not message you again.`,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={allowed ? 'success' : 'danger'}>
          Permission: {humanize(contact.whatsappStatus)}
        </Badge>
        <Badge variant={recommended ? 'success' : 'muted'}>
          {recommended ? 'Recommended channel' : 'Not recommended'}
        </Badge>
      </div>

      {!allowed ? (
        <Alert variant="danger" title="WhatsApp is blocked for this contact">
          {reason}
        </Alert>
      ) : !recommended ? (
        <Alert variant="warning" title="Permitted, but not recommended">
          {reason} WhatsApp is only recommended for opted-in P1 and P2 contacts.
        </Alert>
      ) : (
        <Alert variant="success" title="WhatsApp is appropriate here">
          {reason}
        </Alert>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="campaignContactId" value={campaignContactId} />
        <fieldset disabled={!allowed} className="space-y-3 disabled:opacity-50">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="messageType">Message type</Label>
              <Select id="messageType" name="messageType" defaultValue={WhatsAppMessageType.WEBINAR_INVITE}>
                {Object.values(WhatsAppMessageType).map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Destination</Label>
              <Input value={contact.phoneNumber ?? 'No number on record'} readOnly className="bg-navy-50" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="messageText">Template text</Label>
            <Textarea
              id="messageText"
              name="messageText"
              rows={5}
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
            />
          </div>

          <FormMessage state={state} />

          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Logging...' : 'Log WhatsApp message'}
          </Button>
          <p className="text-xs text-muted-foreground">
            No WhatsApp Business API integration is connected. The message is recorded in SIGNAL and
            nothing is transmitted.
          </p>
        </fieldset>
      </form>
    </div>
  );
}

export function FollowUpForm({
  campaignContactId,
  current,
}: {
  campaignContactId: string;
  current: string | null;
}) {
  const [state, formAction, pending] = useActionState(setFollowUpAction, initialState);
  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="campaignContactId" value={campaignContactId} />
      <div className="flex-1 space-y-1">
        <Label htmlFor="nextFollowUpAt">Next follow-up</Label>
        <Input id="nextFollowUpAt" name="nextFollowUpAt" type="date" defaultValue={current ?? ''} />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Save
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
