import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WhatsAppComposer, type WhatsAppTemplate } from '@/components/outreach/whatsapp-composer';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { formatDate, formatDateTime, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { getRepository } from '@/server/repo';
import { complianceFor } from '@/server/services/compliance-view';

export const metadata: Metadata = { title: 'WhatsApp workspace' };

export default async function WhatsAppPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('logOutreach');
  const { id } = await params;

  const repo = await getRepository();
  const link = await repo.getCampaignContact(id);
  if (!link) notFound();

  const contact = link.contact;
  const campaign = link.campaign;
  const compliance = await complianceFor(repo, link);
  const messages = await repo.listWhatsAppActivities(link.id);
  const record = contact.complianceRecords[0] ?? null;

  const permitted = compliance.allowedChannels.includes('WHATSAPP');
  const blockedReason = compliance.blockedChannels.find((entry) => entry.channel === 'WHATSAPP')?.reason;

  const localEvent = campaign.eventDate
    ? new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'full', timeStyle: 'short', timeZone: contact.timeZone ?? 'UTC',
      }).format(campaign.eventDate)
    : null;

  const first = contact.firstName;
  const templates: WhatsAppTemplate[] = [
    {
      key: 'invitation',
      messageType: 'WEBINAR_INVITATION',
      label: 'Webinar invitation',
      text: [
        `Hello ${first}, this is [caller] from ${campaign.clientBrand}'s research team.`,
        '',
        `As agreed on our call, here is the session on ${campaign.topic.toLowerCase()}.`,
        localEvent ? `It runs on ${localEvent} your time.` : '',
        campaign.registrationUrl ? `Registration: ${campaign.registrationUrl}` : '',
        '',
        'Reply STOP and I will not message you here again.',
      ].filter(Boolean).join('\n'),
    },
    {
      key: 'reminder',
      messageType: 'WEBINAR_REMINDER',
      label: 'Reminder',
      text: [
        `Hello ${first}, a quick reminder about the session on ${campaign.topic.toLowerCase()}.`,
        localEvent ? `It starts ${localEvent} your time.` : '',
        campaign.registrationUrl ? `Joining link: ${campaign.registrationUrl}` : '',
        '',
        'Reply STOP to opt out.',
      ].filter(Boolean).join('\n'),
    },
    {
      key: 'whitepaper',
      messageType: 'WHITEPAPER_SHARE',
      label: 'Share the white paper',
      text: [
        `Hello ${first}, here is the paper we discussed on ${campaign.topic.toLowerCase()}.`,
        campaign.whitePaperUrl ? campaign.whitePaperUrl : '',
        '',
        'Reply STOP to opt out.',
      ].filter(Boolean).join('\n'),
    },
    {
      key: 'followup',
      messageType: 'FOLLOW_UP',
      label: 'Follow-up',
      text: `Hello ${first}, following up on my message about ${campaign.topic.toLowerCase()}. Happy to leave it if the timing is wrong. Reply STOP to opt out.`,
    },
  ];

  return (
    <>
      <PageHeader
        title={`WhatsApp ${contact.firstName} ${contact.lastName}`}
        description={<>{campaign.name} &middot; {contact.phoneNumber ?? 'No number on record'}</>}
        actions={<ButtonLink href={`/outreach/${link.id}`} variant="outline" size="sm">Back to outreach</ButtonLink>}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Permission status</p>
            <p className="mt-1">
              {permitted
                ? <Badge tone="success">Permitted and opted in</Badge>
                : <Badge tone="danger">Blocked</Badge>}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-navy-600">
              {permitted
                ? `Consent recorded: ${record?.consentSource ?? 'source not recorded'}${record?.consentDate ? ` on ${formatDate(record.consentDate)}` : ''}.`
                : blockedReason}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Event, local time</p>
            <p className="mt-1 text-sm text-navy-800">{localEvent ?? 'No event date on this campaign'}</p>
            <p className="mt-1 text-xs text-navy-500">{contact.timeZone ?? 'No time zone on record'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Recommendation</p>
            <p className="mt-1 text-xs leading-relaxed text-navy-700">{link.whatsappRecommendation ?? '-'}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Message" description="Templates only, in the contact's own time zone." />
        <CardBody>
          <WhatsAppComposer
            campaignContactId={link.id}
            templates={templates}
            permitted={permitted}
            blockedReason={blockedReason}
          />
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader title="WhatsApp history" />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead><tr><Th>When</Th><Th>Type</Th><Th>Message</Th><Th>Status</Th></tr></thead>
              <tbody>
                {messages.map((message) => (
                  <Tr key={message.id}>
                    <Td className="whitespace-nowrap">{formatDateTime(message.sentAt ?? message.createdAt)}</Td>
                    <Td className="text-xs">{humanize(message.messageType)}</Td>
                    <Td className="max-w-md text-xs">{message.messageText}</Td>
                    <Td className="text-xs">{humanize(message.deliveryStatus)}</Td>
                  </Tr>
                ))}
                {messages.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-navy-500">Nothing logged yet.</td></tr>
                ) : null}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </Card>
    </>
  );
}
