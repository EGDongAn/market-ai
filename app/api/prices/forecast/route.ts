import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateForecast, classifyPricingStrategy } from '@/lib/forecasting'
import { generateJSON } from '@/lib/ai'

interface ForecastInsight {
  summary: string
  recommendation: string
  riskLevel: '낮음' | '중간' | '높음'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { procedure_id, competitor_id, days = 7 } = body

    if (!procedure_id) {
      return NextResponse.json(
        { error: 'procedure_id is required' },
        { status: 400 }
      )
    }

    const forecastDays = Math.min(Math.max(days, 7), 30)

    // 가격 히스토리 조회 (최근 90일)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const whereClause: {
      procedure_id: number
      competitor_id?: number
      crawled_at: { gte: Date }
    } = {
      procedure_id: parseInt(procedure_id),
      crawled_at: { gte: ninetyDaysAgo }
    }

    if (competitor_id) {
      whereClause.competitor_id = parseInt(competitor_id)
    }

    const priceHistory = await prisma.market_prices.findMany({
      where: whereClause,
      orderBy: { crawled_at: 'asc' },
      include: {
        market_procedures: true,
        market_competitors: true
      }
    })

    if (priceHistory.length < 3) {
      return NextResponse.json({
        success: false,
        error: '예측을 위한 충분한 가격 데이터가 없습니다. 최소 3개의 데이터 포인트가 필요합니다.',
        dataPoints: priceHistory.length
      })
    }

    // 가격 데이터 변환
    const priceData = priceHistory
      .map(p => ({
        date: p.crawled_at!,
        price: p.event_price?.toNumber() || p.regular_price?.toNumber() || 0
      }))
      .filter(p => p.price > 0 && p.date !== null)

    // 예측 생성
    const forecast = generateForecast(priceData, forecastDays)

    // 가격 전략 분류
    const strategy = classifyPricingStrategy(priceData.map(p => p.price))

    // AI 인사이트 생성
    let insight: ForecastInsight
    try {
      const prompt = `가격 예측 분석 결과를 바탕으로 인사이트를 제공해주세요.

시술: ${priceHistory[0]?.market_procedures?.name || '알 수 없음'}
${competitor_id ? `경쟁사: ${priceHistory[0]?.market_competitors?.name || '알 수 없음'}` : '전체 시장'}
현재 가격 트렌드: ${forecast.trend === 'up' ? '상승' : forecast.trend === 'down' ? '하락' : '안정'}
트렌드 강도: ${Math.round(forecast.trendStrength * 100)}%
가격 전략: ${strategy === 'aggressive' ? '공격적' : strategy === 'premium' ? '프리미엄' : strategy === 'variable' ? '변동적' : '안정적'}
예측 신뢰도: ${Math.round(forecast.averageConfidence * 100)}%

다음 JSON 형식으로 응답:
{
  "summary": "1-2문장 요약",
  "recommendation": "구체적인 대응 방안",
  "riskLevel": "낮음/중간/높음"
}`

      insight = await generateJSON<ForecastInsight>(prompt)
    } catch {
      insight = {
        summary: `${forecast.trend === 'up' ? '상승' : forecast.trend === 'down' ? '하락' : '안정'} 트렌드가 예상됩니다.`,
        recommendation: '가격 모니터링을 지속하세요.',
        riskLevel: forecast.trendStrength > 0.5 ? '높음' : forecast.trendStrength > 0.2 ? '중간' : '낮음'
      }
    }

    return NextResponse.json({
      success: true,
      procedureId: procedure_id,
      competitorId: competitor_id || null,
      procedureName: priceHistory[0]?.market_procedures?.name,
      competitorName: competitor_id ? priceHistory[0]?.market_competitors?.name : '전체 시장',
      dataPoints: priceData.length,
      forecast: {
        predictions: forecast.predictions,
        trend: forecast.trend,
        trendStrength: forecast.trendStrength,
        averageConfidence: forecast.averageConfidence,
        strategy
      },
      insight
    })
  } catch (error) {
    console.error('Forecast error:', error)
    return NextResponse.json(
      { error: '가격 예측 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
