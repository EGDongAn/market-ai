import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await prisma.market_crawl_configs.findUnique({
      where: { id: parseInt(id) },
      include: {
        market_competitors: true,
      },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to fetch crawl config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crawl config' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { competitor_id, config_type, selectors, schedule, is_active } = body;

    const config = await prisma.market_crawl_configs.update({
      where: { id: parseInt(id) },
      data: {
        competitor_id,
        config_type,
        selectors,
        schedule,
        is_active,
      },
      include: {
        market_competitors: true,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to update crawl config:', error);
    return NextResponse.json(
      { error: 'Failed to update crawl config' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.market_crawl_configs.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete crawl config:', error);
    return NextResponse.json(
      { error: 'Failed to delete crawl config' },
      { status: 500 }
    );
  }
}
