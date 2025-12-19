import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const competitors = await prisma.market_competitors.findMany({
      orderBy: [
        { is_active: 'desc' },
        { crawl_priority: 'desc' },
        { created_at: 'desc' },
      ],
    });

    return NextResponse.json(competitors);
  } catch (error) {
    console.error('경쟁사 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '경쟁사 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, website, region, type, crawl_priority } = body;

    // 필수 필드 검증
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '병원명은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 중복 이름 체크
    const existing = await prisma.market_competitors.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 경쟁사 이름입니다.' },
        { status: 400 }
      );
    }

    // 새 경쟁사 생성
    const competitor = await prisma.market_competitors.create({
      data: {
        name: name.trim(),
        website: website?.trim() || null,
        region: region?.trim() || null,
        type: type?.trim() || null,
        crawl_priority: crawl_priority ? parseInt(crawl_priority) : 5,
        is_active: true,
      },
    });

    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error('경쟁사 생성 오류:', error);
    return NextResponse.json(
      { error: '경쟁사 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
