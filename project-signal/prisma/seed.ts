/**
 * Database seed.
 *
 * Writes the fixture dataset, then runs the real qualification engine over it.
 * No score or priority is hard-coded anywhere: the distribution you see in the
 * application is what the scoring rules actually produce.
 *
 * Usage:  npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/server/auth/password';
import { buildDataset } from '../src/server/seed/dataset';
import { applySeedQualification } from '../src/server/seed/qualify-seed';
import { PrismaRepository } from '../src/server/repo/prisma-repo';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const password = process.env.SEED_PASSWORD ?? 'signal123';
  const dataset = buildDataset(hashPassword(password));

  console.log('Clearing existing data...');
  await prisma.scoreAudit.deleteMany();
  await prisma.callActivity.deleteMany();
  await prisma.emailActivity.deleteMany();
  await prisma.whatsAppActivity.deleteMany();
  await prisma.engagementEvent.deleteMany();
  await prisma.campaignContact.deleteMany();
  await prisma.scoringConfig.deleteMany();
  await prisma.complianceRecord.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.account.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.countryComplianceRule.deleteMany();
  await prisma.user.deleteMany();

  console.log('Writing reference data...');
  await prisma.user.createMany({ data: dataset.users });
  await prisma.countryComplianceRule.createMany({ data: dataset.countryRules });
  await prisma.campaign.createMany({ data: dataset.campaigns });

  console.log(`Writing ${dataset.accounts.length} accounts and ${dataset.contacts.length} contacts...`);
  await prisma.account.createMany({ data: dataset.accounts });
  await prisma.contact.createMany({ data: dataset.contacts });
  await prisma.complianceRecord.createMany({ data: dataset.complianceRecords });

  console.log(`Writing ${dataset.memberships.length} campaign memberships...`);
  await prisma.campaignContact.createMany({
    data: dataset.memberships.map((membership) => ({
      id: `cc-${membership.campaignId.slice(5, 12)}-${membership.contactId}`,
      campaignId: membership.campaignId,
      contactId: membership.contactId,
    })),
  });

  console.log(`Writing ${dataset.events.length} engagement events...`);
  await prisma.engagementEvent.createMany({ data: dataset.events });

  console.log('Running the qualification engine over the seeded data...');
  const repo = new PrismaRepository();
  const summary = await applySeedQualification(repo);

  const counts = await prisma.campaignContact.groupBy({
    by: ['priority'],
    _count: { _all: true },
    orderBy: { priority: 'asc' },
  });

  console.log('\n--- Seed complete ---');
  console.log(`Users            ${dataset.users.length}`);
  console.log(`Accounts         ${dataset.accounts.length}`);
  console.log(`Contacts         ${dataset.contacts.length}`);
  console.log(`Campaigns        ${dataset.campaigns.length}`);
  console.log(`Memberships      ${dataset.memberships.length}`);
  console.log(`Events           ${dataset.events.length}`);
  console.log(`Calls logged     ${summary.callsLogged}`);
  console.log(`P1s approved     ${summary.approvedP1s}`);
  console.log('\nPriority distribution across all campaigns:');
  for (const row of counts) {
    console.log(`  ${row.priority.padEnd(16)} ${row._count._all}`);
  }
  console.log(`\nSign in with any seeded user and the password "${password}".`);
  console.log('  admin@signal.agency / manager@signal.agency / researcher@signal.agency / caller@signal.agency');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
