import Link from 'next/link';
import { can, requireCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LEGAL_DISCLAIMER } from '@/lib/domain/compliance-gate';
import { ComplianceRecordForm, CountryRuleForm } from '@/components/compliance-forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { humanize } from '@/lib/utils';

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string }>;
}) {
  const user = await requireCapability('contact:view');
  const params = await searchParams;
  const canManage = can(user.role, 'compliance:manage');

  const [rules, needsAttention, selected] = await Promise.all([
    prisma.countryComplianceRule.findMany({ orderBy: { country: 'asc' } }),
    prisma.contact.findMany({
      where: {
        OR: [
          { complianceRecords: { none: {} } },
          { complianceRecords: { some: { lawfulBasis: 'NOT_DETERMINED' } } },
          { consentStatus: { in: ['NOT_CAPTURED', 'OPT_OUT', 'DO_NOT_CONTACT'] } },
        ],
      },
      include: { account: { select: { companyName: true } }, complianceRecords: true },
      orderBy: { country: 'asc' },
      take: 60,
    }),
    params.contact
      ? prisma.contact.findUnique({
          where: { id: params.contact },
          include: { complianceRecords: { orderBy: { updatedAt: 'desc' }, take: 1 } },
        })
      : null,
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Compliance</h1>
        <p className="text-sm text-muted-foreground">
          Channel permissions are configuration per country, evaluated per contact before any Send or
          Contact action is offered.
        </p>
      </div>

      <Alert variant="warning" title="Legal notice">
        {LEGAL_DISCLAIMER} SIGNAL records what you configure and enforces it consistently; it does not
        determine what the law requires in any jurisdiction.
      </Alert>

      <Tabs defaultValue={selected ? 'record' : 'rules'}>
        <TabsList>
          <TabsTrigger value="rules">Country rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="attention">Needs attention ({needsAttention.length})</TabsTrigger>
          {selected ? <TabsTrigger value="record">Contact record</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Country compliance rules</CardTitle>
              <CardDescription>
                The consent strength each channel requires, and the fields that must be present before
                outreach is permitted. Missing fields produce a compliance hold rather than silent
                sending.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {canManage ? (
                rules.map((rule) => <CountryRuleForm key={rule.id} rule={rule} />)
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Required fields</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.country}</TableCell>
                        <TableCell className="text-xs">{humanize(rule.emailRequirement)}</TableCell>
                        <TableCell className="text-xs">{humanize(rule.phoneRequirement)}</TableCell>
                        <TableCell className="text-xs">{humanize(rule.whatsappRequirement)}</TableCell>
                        <TableCell className="text-xs">{rule.requiredFields.join(', ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attention">
          <Card>
            <CardHeader>
              <CardTitle>Contacts with incomplete or blocking compliance</CardTitle>
              <CardDescription>
                Records here are on compliance hold or blocked. Completing the record and re-scoring
                releases the hold.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Consent</TableHead>
                    <TableHead>Lawful basis</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsAttention.map((contact) => {
                    const record = contact.complianceRecords[0];
                    const blocking = ['OPT_OUT', 'DO_NOT_CONTACT'].includes(contact.consentStatus);
                    return (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                            {contact.firstName} {contact.lastName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs">{contact.account.companyName}</TableCell>
                        <TableCell className="text-xs">{contact.country}</TableCell>
                        <TableCell className="text-xs">{humanize(contact.consentStatus)}</TableCell>
                        <TableCell className="text-xs">
                          {record ? humanize(record.lawfulBasis) : 'No record'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={blocking ? 'danger' : 'warning'}>
                            {blocking ? 'Outreach blocked' : 'Incomplete'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/compliance?contact=${contact.id}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Edit
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {selected ? (
          <TabsContent value="record">
            <Card>
              <CardHeader>
                <CardTitle>
                  Compliance record: {selected.firstName} {selected.lastName}
                </CardTitle>
                <CardDescription>
                  {selected.country} &middot; saving re-scores every campaign this contact is enrolled
                  in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <ComplianceRecordForm
                    contactId={selected.id}
                    country={selected.country}
                    record={
                      selected.complianceRecords[0]
                        ? {
                            consentStatus: selected.complianceRecords[0].consentStatus,
                            consentSource: selected.complianceRecords[0].consentSource,
                            consentDate:
                              selected.complianceRecords[0].consentDate?.toISOString().slice(0, 10) ?? null,
                            lawfulBasis: selected.complianceRecords[0].lawfulBasis,
                            noticeProvided: selected.complianceRecords[0].noticeProvided,
                            optOutStatus: selected.complianceRecords[0].optOutStatus,
                            allowedChannels: selected.complianceRecords[0].allowedChannels,
                            blockedChannels: selected.complianceRecords[0].blockedChannels,
                            complianceNotes: selected.complianceRecords[0].complianceNotes,
                          }
                        : null
                    }
                  />
                ) : (
                  <Alert variant="warning">
                    Only an administrator can edit compliance records.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
