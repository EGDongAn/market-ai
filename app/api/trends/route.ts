import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatTrendData } from '@/lib/trend-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const procedureId = searchParams.get('procedure_id');
    const period = searchParams.get('period') || 'DAILY';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!procedureId) {
      return NextResponse.json(
        { error: 'procedure_id 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    // TODO: Implement when market_procedure_trends table is created
    // Trends table doesn't exist yet - return empty data
    const formattedTrends: any[] = []
    // const trends = await prisma.market_procedure_trends.findMany({
    //   where: {
    //     procedure_id: parseInt(procedureId),
    //     period: period as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    //     ...(startDate &&
    //       endDate && {
    //         period_date: {
    //           gte: new Date(startDate),
    //           lte: new Date(endDate),
    //         },
    //       }),
    //   },
    //   orderBy: {
    //     period_date: 'asc',
    //   },
    // });
    // const formattedTrends = formatTrendData(
    //   trends.map((t: any) => ({
    //     procedure_id: t.procedure_id,
    //     period: t.period as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    //     period_date: t.period_date,
    //     avg_price: t.avg_price ? Number(t.avg_price) : null,
    //     min_price: t.min_price ? Number(t.min_price) : null,
    //     max_price: t.max_price ? Number(t.max_price) : null,
    //     price_change: t.price_change,
    //     competitor_count: t.competitor_count,
    //   }))
    // );

    return NextResponse.json({
      success: true,
      data: formattedTrends,
      count: formattedTrends.length,
    });
  } catch (error) {
    console.error('트렌드 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '트렌드 데이터 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
