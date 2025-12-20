import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      competitorCount,
      procedureCount,
      priceCount,
      alertCount,
    ] = await Promise.all([
      prisma.market_competitors.count(),
      prisma.market_procedures.count(),
      prisma.market_prices.count(),
      prisma.market_alerts.count(),
    ]);

    // Get last crawl time from crawl configs
    const lastCrawl = await prisma.market_crawl_configs.findFirst({
      where: { last_run_status: 'SUCCESS' },
      orderBy: { last_run_at: 'desc' },
      select: { last_run_at: true },
    });

    return NextResponse.json({
      competitorCount,
      procedureCount,
      priceCount,
      alertCount,
      lastCrawlAt: lastCrawl?.last_run_at,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
