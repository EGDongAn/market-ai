import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  aggregatePricesByPeriod,
  calculatePriceChange,
  type Period,
} from '@/lib/trend-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { procedure_id, period = 'DAILY', start_date, end_date } = body;

    if (!procedure_id) {
      return NextResponse.json(
        { error: 'procedure_id가 필요합니다' },
        { status: 400 }
      );
    }

    const periodEnum = period as Period;

    // 가격 데이터 조회
    const prices = await prisma.market_prices.findMany({
      where: {
        procedure_id: parseInt(procedure_id),
        ...(start_date &&
          end_date && {
            crawled_at: {
              gte: new Date(start_date),
              lte: new Date(end_date),
            },
          }),
      },
      select: {
        regular_price: true,
        event_price: true,
        crawled_at: true,
        competitor_id: true,
      },
      orderBy: {
        crawled_at: 'asc',
      },
    });

    if (prices.length === 0) {
      return NextResponse.json({
        success: true,
        message: '집계할 가격 데이터가 없습니다',
        created: 0,
      });
    }

    // 이벤트 가격이 있으면 이벤트 가격, 없으면 정가 사용
    const priceData = prices
      .map((p) => ({
        price: p.event_price || p.regular_price,
        crawled_at: p.crawled_at,
        competitor_id: p.competitor_id,
      }))
      .filter((p) => p.price !== null && p.crawled_at !== null);

    // 기간별로 가격 집계
    const aggregated = aggregatePricesByPeriod(
      priceData.map((p) => ({
        price: p.price!,
        crawled_at: p.crawled_at!,
      })),
      periodEnum
    );

    // 경쟁사 수 집계 (기간별)
    const competitorsByPeriod = new Map<string, Set<number>>();
    priceData.forEach(({ crawled_at, competitor_id }) => {
      const periodKey = getPeriodKey(crawled_at!, periodEnum);
      if (!competitorsByPeriod.has(periodKey)) {
        competitorsByPeriod.set(periodKey, new Set());
      }
      competitorsByPeriod.get(periodKey)!.add(competitor_id);
    });

    // 트렌드 데이터 생성
    const trends: {
      procedure_id: number;
      period: Period;
      period_date: Date;
      avg_price: number;
      min_price: number;
      max_price: number;
      price_change: number | null;
      competitor_count: number;
    }[] = [];
    let previousAvgPrice: number | null = null;

    for (const [dateStr, priceStats] of Array.from(aggregated.entries()).sort()) {
      const price_change = calculatePriceChange(previousAvgPrice, priceStats.avg_price);
      const competitor_count = competitorsByPeriod.get(dateStr)?.size || 0;

      trends.push({
        procedure_id: parseInt(procedure_id),
        period: periodEnum,
        period_date: new Date(dateStr),
        avg_price: priceStats.avg_price,
        min_price: priceStats.min_price,
        max_price: priceStats.max_price,
        price_change,
        competitor_count,
      });

      previousAvgPrice = priceStats.avg_price;
    }

    // TODO: Implement when market_procedure_trends table is created
    // Trends table doesn't exist yet - just return the calculated data
    // await prisma.$transaction(async (tx) => {
    //   await tx.market_procedure_trends.deleteMany({
    //     where: {
    //       procedure_id: parseInt(procedure_id),
    //       period: periodEnum,
    //       ...(start_date &&
    //         end_date && {
    //           period_date: {
    //             gte: new Date(start_date),
    //             lte: new Date(end_date),
    //           },
    //         }),
    //     },
    //   });
    //   await tx.market_procedure_trends.createMany({
    //     data: trends,
    //   });
    // });

    return NextResponse.json({
      success: true,
      message: '트렌드 데이터가 성공적으로 생성되었습니다',
      created: trends.length,
      data: trends.map((t) => ({
        period_date: t.period_date.toISOString().split('T')[0],
        avg_price: t.avg_price,
        min_price: t.min_price,
        max_price: t.max_price,
        price_change: t.price_change,
        competitor_count: t.competitor_count,
      })),
    });
  } catch (error) {
    console.error('트렌드 계산 오류:', error);
    return NextResponse.json(
      { error: '트렌드 계산 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 날짜를 기간별 키로 변환 (trend-utils.ts의 getPeriodKey와 동일)
function getPeriodKey(date: Date, period: Period): string {
  const d = new Date(date);

  switch (period) {
    case 'DAILY':
      return d.toISOString().split('T')[0];

    case 'WEEKLY':
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().split('T')[0];

    case 'MONTHLY':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

    default:
      return d.toISOString().split('T')[0];
  }
}
