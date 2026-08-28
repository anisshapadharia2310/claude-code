'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input, Select, Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/misc';
import { logEmailAction } from '@/server/actions/outreach';

export interface EmailTemplate {
  key: string;
  emailType: string;
  label: string;
  subject: string;
  body: string;
}

/**
 * Email drafting.
 *
 * The preview sits beside the editor rather than behind a tab, because the
 * compliance footer is part of what is being reviewed and must never be out of
 * sight. Nothing is transmitted: the provider is a logging stub.
 */
export function EmailComposer({
  campaignContactId, templates, footer, canSend, blockedReason, personalization,
}: {
  campaignContactId: string;
  templates: EmailTemplate[];
  footer: string;
  canSend: boolean;
  blockedReason?: string;
  personalization: Array<{ token: string; value: string }>;
}) {
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? '');
  const active = templates.find((template) => template.key === templateKey) ?? templates[0];
  const [subject, setSubject] = useState(active?.subject ?? '');
  const [body, setBody] = useState(active?.body ?? '');

  const applyTemplate = (key: string): void => {
    const template = templates.find((entry) => entry.key === key);
    setTemplateKey(key);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ActionForm action={logEmailAction} className="space-y-4">
        {(state) => (
          <>
            <input type="hidden" name="campaignContactId" value={campaignContactId} />
            <input type="hidden" name="emailType" value={active?.emailType ?? 'FOLLOW_UP'} />

            {!canSend ? (
              <Alert tone="warning" title="Email is not permitted for this contact">
                {blockedReason ?? 'Complete the compliance record before sending.'} You can still draft and
                store the message.
              </Alert>
            ) : null}

            <Field label="Template" htmlFor="template">
              <Select id="template" value={templateKey} onChange={(event) => applyTemplate(event.target.value)}>
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>{template.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Subject line" htmlFor="subject" required error={state.fieldErrors?.subject}>
              <Input
                id="subject" name="subject" value={subject} required
                aria-invalid={state.fieldErrors?.subject ? true : undefined}
                onChange={(event) => setSubject(event.target.value)}
              />
            </Field>

            <Field
              label="Body" htmlFor="body" required error={state.fieldErrors?.body}
              hint={`${body.length} characters. The compliance footer is appended automatically.`}
            >
              <Textarea
                id="body" name="body" rows={14} value={body} required
                aria-invalid={state.fieldErrors?.body ? true : undefined}
                onChange={(event) => setBody(event.target.value)}
                className="font-mono text-sm"
              />
            </Field>

            <div>
              <p className="eyebrow mb-2">Insert a personalization field</p>
              <div className="flex flex-wrap gap-1.5">
                {personalization.map((field) => (
                  <button
                    key={field.token}
                    type="button"
                    onClick={() => setBody((current) => `${current}${field.value}`)}
                    title={`Inserts: ${field.value}`}
                    className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-surface px-2 py-1 text-xs text-navy-700 shadow-xs transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800"
                  >
                    <Icon name="plus" className="h-3 w-3" />
                    {field.token}
                  </button>
                ))}
              </div>
            </div>

            <Field
              label="Log a reply (optional)"
              htmlFor="replySentiment"
              hint="A positive reply adds engagement points. An unsubscribe request opts the contact out immediately."
            >
              <Select id="replySentiment" name="replySentiment" defaultValue="">
                <option value="">No reply yet</option>
                <option value="POSITIVE">Positive reply</option>
                <option value="NEUTRAL">Neutral reply</option>
                <option value="NEGATIVE">Negative reply</option>
                <option value="OUT_OF_OFFICE">Out of office</option>
                <option value="REFERRAL">Referred to someone else</option>
                <option value="UNSUBSCRIBE">Unsubscribe request</option>
              </Select>
            </Field>

            <CheckboxField name="markSent" disabled={!canSend} label="Mark as sent" />

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <SubmitButton icon="mail" pendingLabel="Recording…">Log this email</SubmitButton>
              <Button
                type="button"
                variant="outline"
                disabled
                title="No email provider is configured in this version."
              >
                Send test
              </Button>
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-navy-50 px-3 py-2.5 text-xs leading-relaxed text-navy-600">
              <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />
              No email provider is connected, so nothing is transmitted. Messages are recorded against the
              contact so the history stays accurate.
            </p>
          </>
        )}
      </ActionForm>

      {/* ------------------------------------------------------------ preview */}
      <div className="xl:sticky xl:top-24 xl:self-start">
        <p className="eyebrow mb-2">Preview</p>
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-line bg-surface-sunk px-4 py-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-navy-200" aria-hidden="true" />
            <span className="flex h-2.5 w-2.5 rounded-full bg-navy-200" aria-hidden="true" />
            <span className="flex h-2.5 w-2.5 rounded-full bg-navy-200" aria-hidden="true" />
            <span className="ml-2 text-2xs font-medium uppercase tracking-[0.08em] text-navy-400">
              Draft — not sent
            </span>
          </div>
          <div className="border-b border-line px-5 py-3.5">
            <p className="text-2xs uppercase tracking-[0.06em] text-navy-400">Subject</p>
            <p className="mt-0.5 text-md font-semibold text-navy-900">{subject || '(no subject)'}</p>
          </div>
          <div className="px-5 py-5">
            <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-navy-800">{body}</pre>
            <pre className="mt-7 whitespace-pre-wrap border-t border-line pt-4 font-sans text-xs leading-relaxed text-navy-500">
              {footer}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
