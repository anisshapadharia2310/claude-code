'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Button } from '@/components/ui/button';
import { Checkbox, FieldError, Input, Label, Select, Textarea } from '@/components/ui/form';
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
 * Nothing is transmitted: the provider is a logging stub. The compliance footer
 * is rendered as part of the preview and appended on log, so it cannot be
 * edited away by accident.
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

  const insert = (token: string): void => setBody((current) => `${current}${token}`);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ActionForm action={logEmailAction} className="space-y-3">
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

            <div>
              <Label htmlFor="template">Template</Label>
              <Select id="template" value={templateKey} onChange={(event) => applyTemplate(event.target.value)}>
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>{template.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject line</Label>
              <Input id="subject" name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} required />
              <FieldError>{state.fieldErrors?.subject}</FieldError>
            </div>

            <div>
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" name="body" rows={14} value={body} onChange={(event) => setBody(event.target.value)} required />
              <FieldError>{state.fieldErrors?.body}</FieldError>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-navy-600">Insert a personalization field</p>
              <div className="flex flex-wrap gap-1.5">
                {personalization.map((field) => (
                  <button
                    key={field.token}
                    type="button"
                    onClick={() => insert(field.value)}
                    title={`Inserts: ${field.value}`}
                    className="rounded border border-navy-200 bg-white px-2 py-1 text-xs text-navy-700 hover:bg-navy-50"
                  >
                    {field.token}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="replySentiment">Log a reply (optional)</Label>
              <Select id="replySentiment" name="replySentiment" defaultValue="">
                <option value="">No reply yet</option>
                <option value="POSITIVE">Positive reply</option>
                <option value="NEUTRAL">Neutral reply</option>
                <option value="NEGATIVE">Negative reply</option>
                <option value="OUT_OF_OFFICE">Out of office</option>
                <option value="REFERRAL">Referred to someone else</option>
                <option value="UNSUBSCRIBE">Unsubscribe request</option>
              </Select>
              <p className="mt-1 text-xs text-navy-500">
                A positive reply adds engagement points. An unsubscribe request opts the contact out immediately.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-navy-700">
              <Checkbox name="markSent" disabled={!canSend} />
              Mark as sent
            </label>

            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <SubmitButton pendingLabel="Recording...">Log this email</SubmitButton>
              <Button type="button" variant="outline" disabled title="No email provider is configured in this version.">
                Send test
              </Button>
            </div>
            <p className="text-xs text-navy-500">
              No email provider is connected, so nothing is transmitted. Messages are recorded against the
              contact so the history stays accurate.
            </p>
          </>
        )}
      </ActionForm>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">Preview</p>
        <div className="rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line px-4 py-3">
            <p className="text-xs text-navy-500">Subject</p>
            <p className="text-sm font-semibold text-navy-900">{subject || '(no subject)'}</p>
          </div>
          <div className="px-4 py-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-navy-800">{body}</pre>
            <pre className="mt-6 whitespace-pre-wrap border-t border-line pt-3 font-sans text-xs leading-relaxed text-navy-500">
              {footer}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
