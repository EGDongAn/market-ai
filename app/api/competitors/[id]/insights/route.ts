import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateJSON } from '@/lib/ai';
import { competitorInsightPrompt } from '@/lib/prompts';

interface CompetitorInsight {
  positioning: string;
  priceVsMarket: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const competitorId = parseInt(id);

    if (isNaN(competitorId)) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 });
    }

    // Get competitor
    const competitor = await prisma.market_competitors.findUnique({
      where: { id: competitorId }
    });

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // Get competitor's prices with procedure details
    const competitorPrices = await prisma.market_prices.findMany({
      where: { competitor_id: competitorId },
      include: {
        procedure: {
          include: {
            subcategory: { include: { category: true } }
          }
        }
      },
      orderBy: { crawled_at: 'desc' }
    });

    // Get market averages
    const marketAverages = await prisma.market_prices.groupBy({
      by: ['procedure_id'],
      _avg: { regular_price: true, event_price: true },
      _count: true
    });

    const marketAvgMap = new Map(marketAverages.map(m => [
      m.procedure_id,
      {
        avgRegular: m._avg.regular_price?.toNumber() || 0,
        avgEvent: m._avg.event_price?.toNumber() || 0,
        count: m._count
      }
    ]));

    // Prepare price comparison data
    const priceComparison = competitorPrices.map(price => {
      const marketData = marketAvgMap.get(price.procedure_id);
      const competitorPrice = price.regular_price?.toNumber() || 0;
      const marketAvg = marketData?.avgRegular || 0;
      const diff = marketAvg > 0 ? ((competitorPrice - marketAvg) / marketAvg * 100).toFixed(1) : 0;

      return {
        procedure: price.procedure.name,
        category: price.procedure.subcategory.category.name,
        competitorPrice,
        marketAvg: Math.round(marketAvg),
        diff: `${diff}%`
      };
    });

    // Calculate overall stats
    const totalCompetitorPrice = priceComparison.reduce((sum, p) => sum + p.competitorPrice, 0);
    const totalMarketAvg = priceComparison.reduce((sum, p) => sum + p.marketAvg, 0);
    const overallDiff = totalMarketAvg > 0
      ? ((totalCompetitorPrice - totalMarketAvg) / totalMarketAvg * 100).toFixed(1)
      : 0;

    // Generate AI insights
    const prompt = competitorInsightPrompt
      .replace('{{competitorName}}', competitor.name)
      .replace('{{marketAvg}}', `₩${Math.round(totalMarketAvg / priceComparison.length).toLocaleString()}`)
      .replace('{{priceData}}', JSON.stringify(priceComparison.slice(0, 20)));

    let insights: CompetitorInsight;
    try {
      insights = await generateJSON<CompetitorInsight>(prompt);
    } catch {
      // Fallback insights
      insights = {
        positioning: Number(overallDiff) > 10 ? '프리미엄' : Number(overallDiff) < -10 ? '저가' : '중간',
        priceVsMarket: `${Number(overallDiff) >= 0 ? '+' : ''}${overallDiff}%`,
        strengths: ['가격 데이터 수집 중'],
        weaknesses: ['추가 분석 필요'],
        suggestions: ['더 많은 가격 데이터 수집 권장']
      };
    }

    return NextResponse.json({
      competitor: {
        id: competitor.id,
        name: competitor.name,
        type: competitor.type,
        region: competitor.region
      },
      priceAnalysis: {
        totalProcedures: priceComparison.length,
        avgVsMarket: `${Number(overallDiff) >= 0 ? '+' : ''}${overallDiff}%`,
        priceComparison: priceComparison.slice(0, 10)
      },
      insights
    });
  } catch (error) {
    console.error('Failed to generate insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
