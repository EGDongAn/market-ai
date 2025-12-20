import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const configs = await prisma.market_crawl_configs.findMany({
      include: {
        market_competitors: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Failed to fetch crawl configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crawl configs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { competitor_id, config_type, selectors, schedule, is_active } = body;

    const config = await prisma.market_crawl_configs.create({
      data: {
        competitor_id,
        config_type,
        selectors,
        schedule,
        is_active: is_active ?? true,
      },
      include: {
        market_competitors: true,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Failed to create crawl config:', error);
    return NextResponse.json(
      { error: 'Failed to create crawl config' },
      { status: 500 }
    );
  }
}
