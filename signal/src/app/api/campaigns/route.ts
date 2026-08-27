import { NextResponse } from 'next/server';
import { requireApiCapability } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiError } from '@/lib/api';

/** GET /api/campaigns - list campaigns with their priority breakdown. */
export async function GET() {
  try {
    await requireApiCapability('campaign:view');
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { campaignContacts: true } } },
    });
    return NextResponse.json({
      campaigns: campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        clientBrand: campaign.clientBrand,
        campaignType: campaign.campaignType,
        topic: campaign.topic,
        status: campaign.status,
        eventDate: campaign.eventDate,
        enrolledContacts: campaign._count.campaignContacts,
        campaignCost: campaign.campaignCost ? Number(campaign.campaignCost) : null,
        currency: campaign.currency,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
