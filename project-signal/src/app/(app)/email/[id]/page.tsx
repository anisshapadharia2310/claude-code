import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmailComposer, type EmailTemplate } from '@/components/outreach/email-composer';
import { ButtonLink } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/misc';
import { Table, TableWrap, Td, Th, Tr } from '@/components/ui/table';
import { primaryTrigger } from '@/domain/recommendations';
import { formatDateTime, humanize } from '@/lib/utils';
import { requirePermission } from '@/server/auth/guards';
import { complianceFor } from '@/server/services/compliance-view';
import { getRepository } from '@/server/repo';
import { complianceFooter } from '@/server/providers/email';

export const metadata: Metadata = { title: 'Email workspace' };

export default async function EmailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('logOutreach');
  const { id } = await params;

  const repo = await getRepository();
  const link = await repo.getCampaignContact(id);
  if (!link) notFound();

  const contact = link.contact;
  const account = contact.account;
  const campaign = link.campaign;
  const compliance = await complianceFor(repo, link);
  const emails = await repo.listEmailActivities(link.id);

  const trigger = primaryTrigger(account);
  const first = contact.firstName;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const footer = complianceFooter({
    agencyName: process.env.NEXT_PUBLIC_AGENCY_NAME ?? 'Signal Demand Partners',
    agencyAddress: process.env.NEXT_PUBLIC_AGENCY_ADDRESS ?? '1 Example Street, Toronto, ON M5H 2N2, Canada',
    privacyUrl: process.env.NEXT_PUBLIC_AGENCY_PRIVACY_URL ?? 'https://example.com/privacy',
    unsubscribeUrl: `${appUrl}/unsubscribe?c=${contact.id}`,
    clientBrand: campaign.clientBrand,
  });

  const eventLine = campaign.eventDate
    ? `${new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: contact.timeZone ?? 'UTC' }).format(campaign.eventDate)} (${contact.timeZone ?? 'UTC'})`
    : null;

  const templates: EmailTemplate[] = campaign.campaignType === 'WEBINAR'
    ? [
        {
          key: 'invitation',
          emailType: 'WEBINAR_INVITATION',
          label: 'Webinar invitation',
          subject: trigger
            ? `${account.companyName} and ${campaign.topic.toLowerCase()}`
            : `${campaign.topic}`,
          body: [
            `Hello ${first},`,
            '',
            trigger
              ? `I saw that ${account.companyName} has ${trigger}. That usually puts ${campaign.targetBusinessProblem.toLowerCase()} on somebody's desk, and from your role it looks like that desk is yours.`
              : `You lead work that touches ${campaign.targetBusinessProblem.toLowerCase()}, which is why I am writing to you rather than to a general address.`,
            '',
            `We are running a session on ${campaign.topic.toLowerCase()}.${eventLine ? ` It runs on ${eventLine}.` : ''}${campaign.speakerInformation ? ` Speakers: ${campaign.speakerInformation}` : ''}`,
            '',
            'One question so I do not waste your time: is this something your team is actively working on this quarter, or is it further out?',
            '',
            campaign.registrationUrl ? `If it is useful, the registration link is ${campaign.registrationUrl}` : '',
            '',
            'Best regards,',
          ].filter((linePart) => linePart !== undefined).join('\n'),
        },
        {
          key: 'reminder',
          emailType: 'WEBINAR_REMINDER',
          label: 'Reminder before the event',
          subject: `Tomorrow: ${campaign.topic}`,
          body: [
            `Hello ${first},`,
            '',
            `A short reminder that the session on ${campaign.topic.toLowerCase()} runs ${eventLine ?? 'tomorrow'}.`,
            '',
            campaign.registrationUrl ? `Joining link: ${campaign.registrationUrl}` : '',
            '',
            'If the time does not work, say so and I will send you the recording instead.',
            '',
            'Best regards,',
          ].join('\n'),
        },
        {
          key: 'replay',
          emailType: 'REPLAY_SHARE',
          label: 'Replay and follow-up',
          subject: `The recording, and the part about ${campaign.targetBusinessProblem.toLowerCase()}`,
          body: [
            `Hello ${first},`,
            '',
            'Here is the recording of the session, in case it is useful to share internally.',
            '',
            `The section most relevant to ${account.companyName} is the part on ${campaign.targetBusinessProblem.toLowerCase()}.`,
            '',
            'Worth a short conversation, or shall I leave it with you?',
            '',
            'Best regards,',
          ].join('\n'),
        },
      ]
    : [
        {
          key: 'whitepaper',
          emailType: 'WHITEPAPER_OFFER',
          label: 'White paper offer',
          subject: trigger ? `For ${account.companyName}: ${campaign.topic}` : campaign.topic,
          body: [
            `Hello ${first},`,
            '',
            trigger
              ? `I saw that ${account.companyName} has ${trigger}.`
              : `You lead work that touches ${campaign.targetBusinessProblem.toLowerCase()}.`,
            '',
            `We have written a paper on ${campaign.topic.toLowerCase()}. It is practitioner material, not a brochure: ${campaign.description ?? ''}`,
            '',
            campaign.whitePaperUrl ? `The paper is here: ${campaign.whitePaperUrl}` : '',
            '',
            'If it is not relevant to your remit, tell me and I will stop.',
            '',
            'Best regards,',
          ].join('\n'),
        },
        {
          key: 'followup',
          emailType: 'FOLLOW_UP',
          label: 'Follow-up',
          subject: `Following up on ${campaign.topic}`,
          body: [
            `Hello ${first},`,
            '',
            'I sent you a paper last week and did not want to let it disappear.',
            '',
            `The question it answers is ${campaign.targetBusinessProblem.toLowerCase()}. If that is not on your desk, who owns it at ${account.companyName}?`,
            '',
            'Best regards,',
          ].join('\n'),
        },
      ];

  const canEmail = compliance.allowedChannels.includes('EMAIL');
  const blockedReason = compliance.blockedChannels.find((entry) => entry.channel === 'EMAIL')?.reason;

  return (
    <>
      <PageHeader
        title={`Email ${contact.firstName} ${contact.lastName}`}
        description={
          <>
            {contact.workEmail ?? 'No email on record'} &middot; {contact.jobTitle} at {account.companyName}
          </>
        }
        actions={
          <ButtonLink href={`/outreach/${link.id}`} variant="outline" size="sm" icon="chevronLeft">
            Back to outreach
          </ButtonLink>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="eyebrow">Campaign topic</p>
            <p className="mt-1 text-sm text-navy-800">{campaign.topic}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="eyebrow">Target business problem</p>
            <p className="mt-1 text-sm text-navy-800">{campaign.targetBusinessProblem}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="eyebrow">Recommended angle</p>
            <p className="mt-1 text-sm leading-relaxed text-navy-800">{link.emailAngle ?? '-'}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Draft"
          description="Nothing is transmitted in this version. The compliance footer is appended automatically."
          icon={<Icon name="mail" className="h-4 w-4" />}
        />
        <CardBody>
          <EmailComposer
            campaignContactId={link.id}
            templates={templates}
            footer={footer}
            canSend={canEmail}
            blockedReason={blockedReason}
            personalization={[
              { token: 'First name', value: contact.firstName },
              { token: 'Company', value: account.companyName },
              { token: 'Job title', value: contact.jobTitle },
              { token: 'Trigger', value: trigger ?? 'no recorded trigger' },
              { token: 'Topic', value: campaign.topic },
              { token: 'Problem', value: campaign.targetBusinessProblem },
              ...(campaign.registrationUrl ? [{ token: 'Registration link', value: campaign.registrationUrl }] : []),
            ]}
          />
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Email history" icon={<Icon name="clock" className="h-4 w-4" />} />
        <CardBody className="p-0">
          <TableWrap>
            <Table>
              <thead><tr><Th>When</Th><Th>Type</Th><Th>Subject</Th><Th>Status</Th><Th>Reply</Th></tr></thead>
              <tbody>
                {emails.map((email) => (
                  <Tr key={email.id}>
                    <Td className="whitespace-nowrap">{formatDateTime(email.sentAt ?? email.createdAt)}</Td>
                    <Td className="text-xs">{humanize(email.emailType)}</Td>
                    <Td>{email.subject}</Td>
                    <Td className="text-xs">{humanize(email.deliveryStatus)}</Td>
                    <Td className="text-xs">{email.replySentiment ? humanize(email.replySentiment) : '-'}</Td>
                  </Tr>
                ))}
                {emails.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-navy-500">No emails logged yet.</td></tr>
                ) : null}
              </tbody>
            </Table>
          </TableWrap>
        </CardBody>
      </Card>
    </>
  );
}
