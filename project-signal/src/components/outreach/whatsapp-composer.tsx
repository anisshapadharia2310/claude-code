'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { CheckboxField, Field, Select, Textarea } from '@/components/ui/form';
import { Icon } from '@/components/ui/icon';
import { Alert } from '@/components/ui/misc';
import { logWhatsAppAction } from '@/server/actions/outreach';

export interface WhatsAppTemplate {
  key: string;
  messageType: string;
  label: string;
  text: string;
}

/**
 * WhatsApp drafting.
 *
 * The controls are disabled outright when the compliance engine does not permit
 * the channel, and the action re-checks permission on the server regardless, so
 * a stale page can never send.
 */
export function WhatsAppComposer({
  campaignContactId, templates, permitted, blockedReason,
}: {
  campaignContactId: string;
  templates: WhatsAppTemplate[];
  permitted: boolean;
  blockedReason?: string;
}) {
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? '');
  const active = templates.find((template) => template.key === templateKey) ?? templates[0];
  const [text, setText] = useState(active?.text ?? '');

  const applyTemplate = (key: string): void => {
    const template = templates.find((entry) => entry.key === key);
    setTemplateKey(key);
    if (template) setText(template.text);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ActionForm action={logWhatsAppAction} className="space-y-4">
        {(state) => (
          <>
            <input type="hidden" name="campaignContactId" value={campaignContactId} />
            <input type="hidden" name="messageType" value={active?.messageType ?? 'FOLLOW_UP'} />

            {!permitted ? (
              <Alert tone="danger" title="WhatsApp is blocked for this contact">
                {blockedReason ?? 'No documented permission for this channel.'}
              </Alert>
            ) : (
              <Alert tone="info" title="Permitted, but use it carefully">
                WhatsApp is for a joining link or a reminder to somebody who has already agreed to hear from
                you. Never open a relationship on it.
              </Alert>
            )}

            <fieldset disabled={!permitted} className="space-y-4 disabled:opacity-60">
              <Field label="Message type" htmlFor="wa-template">
                <Select id="wa-template" value={templateKey} onChange={(event) => applyTemplate(event.target.value)}>
                  {templates.map((template) => (
                    <option key={template.key} value={template.key}>{template.label}</option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Message"
                htmlFor="messageText"
                required
                error={state.fieldErrors?.messageText}
                hint={`${text.length} characters`}
              >
                <Textarea
                  id="messageText" name="messageText" rows={8} value={text} required
                  aria-invalid={state.fieldErrors?.messageText ? true : undefined}
                  onChange={(event) => setText(event.target.value)}
                />
              </Field>

              <CheckboxField name="markSent" label="Mark as sent" />

              <SubmitButton icon="chat" pendingLabel="Recording…">Log this message</SubmitButton>
            </fieldset>

            <p className="flex items-start gap-2 rounded-lg bg-navy-50 px-3 py-2.5 text-xs leading-relaxed text-navy-600">
              <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />
              No WhatsApp Business API provider is connected, so nothing is transmitted. The message is stored
              against the contact.
            </p>
          </>
        )}
      </ActionForm>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow mb-2">Preview</p>
        <div className="rounded-xl border border-line bg-[#eceff3] p-5 shadow-inner">
          <div className="ml-auto max-w-sm rounded-xl rounded-br-sm bg-[#d9fdd3] px-3.5 py-2.5 shadow-sm">
            <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-navy-900">{text}</pre>
            <p className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-navy-500">
              Preview only · not sent
              <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
