import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateJSON } from '@/lib/ai'
import { calculateStats, calculateCompetitiveIntensity, analyzeTrend } from '@/lib/analytics'
import { classifyPricingStrategy } from '@/lib/forecasting'

interface StrategyAnalysis {
  strategyType: '침투가격' | '스키밍' | '경쟁가격' | '가치기반'
  marketShareEstimate: string
  threatScore: number
  priceAggressiveness: '낮음' | '중간' | '높음'
  focusCategories: string[]
  recommendations: string[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const competitorId = parseInt(id)

    if (isNaN(competitorId)) {
      return NextResponse.json({ error: 'Invalid competitor ID' }, { status: 400 })
    }

    // 경쟁사 정보 조회
    const competitor = await prisma.market_competitors.findUnique({
      where: { id: competitorId }
    })

    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
    }

    // 경쟁사 가격 데이터 조회 (최근 90일)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const competitorPrices = await prisma.market_prices.findMany({
      where: {
        competitor_id: competitorId,
        crawled_at: { gte: ninetyDaysAgo }
      },
      include: {
        market_procedures: {
          include: {
            market_procedure_subcategories: {
              include: {
                market_procedure_categories: true
              }
            }
          }
        }
      },
      orderBy: { crawled_at: 'desc' }
    })

    // 시장 전체 가격 데이터
    const marketPrices = await prisma.market_prices.findMany({
      where: {
        crawled_at: { gte: ninetyDaysAgo }
      },
      include: {
        market_procedures: {
          include: {
            market_procedure_subcategories: {
              include: {
                market_procedure_categories: true
              }
            }
          }
        }
      }
    })

    // 시술별 시장 평균 계산
    const marketAvgByProcedure = new Map<number, number>()
    const procedurePrices = new Map<number, number[]>()

    for (const price of marketPrices) {
      const priceValue = price.event_price?.toNumber() || price.regular_price?.toNumber() || 0
      if (priceValue > 0) {
        if (!procedurePrices.has(price.procedure_id)) {
          procedurePrices.set(price.procedure_id, [])
        }
        procedurePrices.get(price.procedure_id)!.push(priceValue)
      }
    }

    for (const [procedureId, prices] of procedurePrices) {
      const stats = calculateStats(prices)
      marketAvgByProcedure.set(procedureId, stats.mean)
    }

    // 경쟁사 가격 vs 시장 평균 분석
    const priceComparisons: number[] = []
    const categoryPrices = new Map<string, { competitor: number[]; market: number[] }>()

    const processedProcedures = new Set<number>()

    for (const price of competitorPrices) {
      if (processedProcedures.has(price.procedure_id)) continue
      processedProcedures.add(price.procedure_id)

      const competitorPrice = price.event_price?.toNumber() || price.regular_price?.toNumber() || 0
      const marketAvg = marketAvgByProcedure.get(price.procedure_id) || 0

      if (competitorPrice > 0 && marketAvg > 0) {
        const diff = ((competitorPrice - marketAvg) / marketAvg) * 100
        priceComparisons.push(diff)

        const categoryName = price.market_procedures?.market_procedure_subcategories?.market_procedure_categories?.name || '기타'
        if (!categoryPrices.has(categoryName)) {
          categoryPrices.set(categoryName, { competitor: [], market: [] })
        }
        categoryPrices.get(categoryName)!.competitor.push(competitorPrice)
        categoryPrices.get(categoryName)!.market.push(marketAvg)
      }
    }

    // 가격 전략 분류
    const priceValues = competitorPrices
      .map(p => p.event_price?.toNumber() || p.regular_price?.toNumber() || 0)
      .filter(p => p > 0)

    const pricingStrategy = classifyPricingStrategy(priceValues)
    const avgPriceDiff = calculateStats(priceComparisons).mean

    // 카테고리별 경쟁력 분석
    const categoryAnalysis: { name: string; competitiveness: string; avgDiff: number }[] = []

    for (const [categoryName, prices] of categoryPrices) {
      const compAvg = calculateStats(prices.competitor).mean
      const marketAvg = calculateStats(prices.market).mean
      const diff = marketAvg > 0 ? ((compAvg - marketAvg) / marketAvg) * 100 : 0

      categoryAnalysis.push({
        name: categoryName,
        competitiveness: diff < -10 ? '저가' : diff > 10 ? '프리미엄' : '경쟁',
        avgDiff: Math.round(diff * 10) / 10
      })
    }

    // 집중 카테고리 (가장 많은 시술이 있는)
    const focusCategories = categoryAnalysis
      .sort((a, b) => Math.abs(b.avgDiff) - Math.abs(a.avgDiff))
      .slice(0, 3)
      .map(c => c.name)

    // 위협 점수 계산 (1-10)
    const competitiveIntensity = calculateCompetitiveIntensity(priceValues)
    const trend = analyzeTrend(priceValues)

    let threatScore = 5
    if (avgPriceDiff < -15) threatScore += 2 // 저가 전략
    if (trend.direction === 'down') threatScore += 1.5 // 가격 하락 트렌드
    if (pricingStrategy === 'aggressive') threatScore += 1.5
    if (processedProcedures.size > 20) threatScore += 0.5 // 다양한 시술
    threatScore = Math.min(10, Math.max(1, threatScore))

    // AI 분석 생성
    let analysis: StrategyAnalysis
    try {
      const prompt = `경쟁사 가격 전략을 분석해주세요.

경쟁사: ${competitor.name}
지역: ${competitor.region || '미지정'}
타입: ${competitor.type || '미지정'}

분석 데이터:
- 모니터링 시술 수: ${processedProcedures.size}개
- 시장 평균 대비 가격: ${avgPriceDiff > 0 ? '+' : ''}${Math.round(avgPriceDiff)}%
- 가격 전략 유형: ${pricingStrategy}
- 가격 트렌드: ${trend.direction === 'up' ? '상승' : trend.direction === 'down' ? '하락' : '안정'} (${Math.round(trend.strength * 100)}% 강도)

카테고리별 분석:
${categoryAnalysis.map(c => `- ${c.name}: ${c.competitiveness} (시장 대비 ${c.avgDiff > 0 ? '+' : ''}${c.avgDiff}%)`).join('\n')}

다음 JSON 형식으로 응답:
{
  "strategyType": "침투가격/스키밍/경쟁가격/가치기반 중 하나",
  "marketShareEstimate": "예상 시장 점유율 (예: 10-15%)",
  "threatScore": ${Math.round(threatScore)},
  "priceAggressiveness": "낮음/중간/높음 중 하나",
  "focusCategories": ["주력 카테고리1", "주력 카테고리2"],
  "recommendations": ["대응 전략1", "대응 전략2", "대응 전략3"]
}`

      analysis = await generateJSON<StrategyAnalysis>(prompt)
    } catch {
      analysis = {
        strategyType: avgPriceDiff < -10 ? '침투가격' : avgPriceDiff > 10 ? '스키밍' : '경쟁가격',
        marketShareEstimate: threatScore > 7 ? '15-25%' : threatScore > 5 ? '10-15%' : '5-10%',
        threatScore: Math.round(threatScore),
        priceAggressiveness: avgPriceDiff < -15 ? '높음' : avgPriceDiff > 10 ? '낮음' : '중간',
        focusCategories,
        recommendations: [
          '해당 경쟁사 가격 변동 모니터링 강화',
          '차별화된 서비스 가치 제안 개발',
          '타겟 고객층 재정의 검토'
        ]
      }
    }

    return NextResponse.json({
      success: true,
      competitor: {
        id: competitor.id,
        name: competitor.name,
        type: competitor.type,
        region: competitor.region
      },
      metrics: {
        procedureCount: processedProcedures.size,
        avgPriceDiff: Math.round(avgPriceDiff * 10) / 10,
        pricingStrategy,
        trend: trend.direction,
        trendStrength: trend.strength,
        competitiveIntensity: Math.round(competitiveIntensity * 10) / 10
      },
      categoryAnalysis,
      analysis
    })
  } catch (error) {
    console.error('Strategy analysis error:', error)
    return NextResponse.json(
      { error: '경쟁사 전략 분석에 실패했습니다.' },
      { status: 500 }
    )
  }
}
