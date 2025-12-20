import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateStats, detectAnomaly } from '@/lib/analytics'
import { generateJSON } from '@/lib/ai'

interface AnomalyDetail {
  procedureId: number
  procedureName: string
  competitorId: number
  competitorName: string
  currentPrice: number
  averagePrice: number
  zScore: number
  changePercent: number
  direction: 'high' | 'low'
  severity: 'warning' | 'critical'
}

interface AnomalyInsight {
  summary: string
  potentialCauses: string[]
  recommendedActions: string[]
}

export async function POST() {
  try {
    // 최근 30일 가격 데이터 조회
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentPrices = await prisma.market_prices.findMany({
      where: {
        crawled_at: { gte: thirtyDaysAgo }
      },
      include: {
        procedure: true,
        competitor: true
      },
      orderBy: { crawled_at: 'desc' }
    })

    // 시술+경쟁사별로 그룹화
    const groupedPrices = new Map<string, typeof recentPrices>()

    for (const price of recentPrices) {
      const key = `${price.procedure_id}-${price.competitor_id}`
      if (!groupedPrices.has(key)) {
        groupedPrices.set(key, [])
      }
      groupedPrices.get(key)!.push(price)
    }

    const anomalies: AnomalyDetail[] = []

    // 각 그룹에서 이상치 탐지
    for (const [, prices] of groupedPrices) {
      if (prices.length < 3) continue

      const priceValues = prices
        .map(p => p.event_price?.toNumber() || p.regular_price?.toNumber() || 0)
        .filter(p => p > 0)

      if (priceValues.length < 3) continue

      const stats = calculateStats(priceValues)
      const latestPrice = priceValues[0]
      const result = detectAnomaly(latestPrice, stats, 2)

      if (result.isAnomaly) {
        const changePercent = ((latestPrice - stats.mean) / stats.mean) * 100

        anomalies.push({
          procedureId: prices[0].procedure_id,
          procedureName: prices[0].procedure?.name || '알 수 없음',
          competitorId: prices[0].competitor_id,
          competitorName: prices[0].competitor?.name || '알 수 없음',
          currentPrice: latestPrice,
          averagePrice: Math.round(stats.mean),
          zScore: result.zScore,
          changePercent: Math.round(changePercent * 10) / 10,
          direction: result.direction as 'high' | 'low',
          severity: Math.abs(result.zScore) > 3 ? 'critical' : 'warning'
        })
      }
    }

    // 심각도순 정렬
    anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))

    // 상위 10개에 대해 AI 인사이트 생성
    let insight: AnomalyInsight | null = null

    if (anomalies.length > 0) {
      try {
        const topAnomalies = anomalies.slice(0, 5)
        const prompt = `다음 가격 이상치를 분석해주세요:

${topAnomalies.map(a => `- ${a.competitorName}의 ${a.procedureName}: ${a.direction === 'high' ? '평균 대비 ' + a.changePercent + '% 높음' : '평균 대비 ' + Math.abs(a.changePercent) + '% 낮음'}`).join('\n')}

다음 JSON 형식으로 응답:
{
  "summary": "전체 요약 (1-2문장)",
  "potentialCauses": ["원인1", "원인2"],
  "recommendedActions": ["대응방안1", "대응방안2"]
}`

        insight = await generateJSON<AnomalyInsight>(prompt)
      } catch {
        insight = {
          summary: `${anomalies.length}개의 가격 이상치가 감지되었습니다.`,
          potentialCauses: ['프로모션 진행', '시장 가격 변동'],
          recommendedActions: ['경쟁사 가격 모니터링 강화', '가격 정책 검토']
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalAnomalies: anomalies.length,
      criticalCount: anomalies.filter(a => a.severity === 'critical').length,
      warningCount: anomalies.filter(a => a.severity === 'warning').length,
      anomalies: anomalies.slice(0, 20), // 최대 20개
      insight,
      checkedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Anomaly detection error:', error)
    return NextResponse.json(
      { error: '이상치 탐지에 실패했습니다.' },
      { status: 500 }
    )
  }
}
