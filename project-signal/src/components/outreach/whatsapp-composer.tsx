'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms/action-form';
import { Checkbox, FieldError, Label, Select, Textarea } from '@/components/ui/form';
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
 * the channel. The action re-checks permission server-side regardless, so a
 * stale page cannot send.
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
    <div className="grid gap-4 lg:grid-cols-2">
      <ActionForm action={logWhatsAppAction} className="space-y-3">
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

            <fieldset disabled={!permitted} className="space-y-3">
              <div>
                <Label htmlFor="wa-template">Message type</Label>
                <Select id="wa-template" value={templateKey} onChange={(event) => applyTemplate(event.target.value)}>
                  {templates.map((template) => (
                    <option key={template.key} value={template.key}>{template.label}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="messageText">Message</Label>
                <Textarea id="messageText" name="messageText" rows={8} value={text}
                  onChange={(event) => setText(event.target.value)} required />
                <FieldError>{state.fieldErrors?.messageText}</FieldError>
                <p className="mt-1 text-xs text-navy-500">{text.length} characters</p>
              </div>

              <label className="flex items-center gap-2 text-sm text-navy-700">
                <Checkbox name="markSent" />
                Mark as sent
              </label>

              <SubmitButton pendingLabel="Recording...">Log this message</SubmitButton>
            </fieldset>

            <p className="text-xs text-navy-500">
              No WhatsApp Business API provider is connected, so nothing is transmitted. The message is stored
              against the contact.
            </p>
          </>
        )}
      </ActionForm>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">Preview</p>
        <div className="rounded-lg bg-[#e9edf1] p-4">
          <div className="ml-auto max-w-sm rounded-lg rounded-br-sm bg-[#d9fdd3] px-3 py-2 shadow-sm">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-navy-900">{text}</pre>
            <p className="mt-1 text-right text-[10px] text-navy-500">Preview only &middot; not sent</p>
          </div>
        </div>
      </div>
    </div>
  );
}
