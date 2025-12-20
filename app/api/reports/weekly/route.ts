import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateText } from '@/lib/ai'
import { calculateChangeRate, analyzeTrend } from '@/lib/analytics'

interface WeeklyStats {
  totalCompetitors: number
  totalProcedures: number
  priceChanges: number
  avgChangePercent: number
}

interface TopChange {
  procedureName: string
  competitorName: string
  changePercent: number
  direction: 'up' | 'down'
  newPrice: number
  oldPrice: number
}

export async function GET() {
  try {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    // 이번 주 가격 데이터
    const thisWeekPrices = await prisma.market_prices.findMany({
      where: {
        crawled_at: { gte: oneWeekAgo }
      },
      include: {
        procedure: {
          include: {
            subcategory: { include: { category: true } }
          }
        },
        competitor: true
      },
      orderBy: { crawled_at: 'desc' }
    })

    // 지난주 가격 데이터
    const lastWeekPrices = await prisma.market_prices.findMany({
      where: {
        crawled_at: {
          gte: twoWeeksAgo,
          lt: oneWeekAgo
        }
      },
      include: {
        procedure: true,
        competitor: true
      }
    })

    // 가격 변동 분석
    const priceChanges: TopChange[] = []
    const lastWeekMap = new Map<string, number>()

    for (const price of lastWeekPrices) {
      const key = `${price.procedure_id}-${price.competitor_id}`
      const priceValue = price.event_price?.toNumber() || price.regular_price?.toNumber() || 0
      if (priceValue > 0) {
        lastWeekMap.set(key, priceValue)
      }
    }

    const processedKeys = new Set<string>()

    for (const price of thisWeekPrices) {
      const key = `${price.procedure_id}-${price.competitor_id}`
      if (processedKeys.has(key)) continue
      processedKeys.add(key)

      const currentPrice = price.event_price?.toNumber() || price.regular_price?.toNumber() || 0
      const lastWeekPrice = lastWeekMap.get(key)

      if (currentPrice > 0 && lastWeekPrice && lastWeekPrice > 0) {
        const changePercent = calculateChangeRate(currentPrice, lastWeekPrice)

        if (Math.abs(changePercent) >= 3) {
          priceChanges.push({
            procedureName: price.procedure?.name || '알 수 없음',
            competitorName: price.competitor?.name || '알 수 없음',
            changePercent: Math.round(changePercent * 10) / 10,
            direction: changePercent > 0 ? 'up' : 'down',
            newPrice: currentPrice,
            oldPrice: lastWeekPrice
          })
        }
      }
    }

    // 상위 변동 정렬
    priceChanges.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    const topChanges = priceChanges.slice(0, 10)

    // 카테고리별 트렌드
    const categoryTrends = new Map<string, number[]>()
    for (const price of thisWeekPrices) {
      const categoryName = price.procedure?.subcategory?.category?.name || '기타'
      const priceValue = price.event_price?.toNumber() || price.regular_price?.toNumber() || 0

      if (priceValue > 0) {
        if (!categoryTrends.has(categoryName)) {
          categoryTrends.set(categoryName, [])
        }
        categoryTrends.get(categoryName)!.push(priceValue)
      }
    }

    const categoryAnalysis = Array.from(categoryTrends.entries()).map(([name, prices]) => {
      const trend = analyzeTrend(prices)
      return {
        category: name,
        trend: trend.direction,
        changePercent: trend.changePercent,
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      }
    })

    // 통계 요약
    const uniqueCompetitors = new Set(thisWeekPrices.map(p => p.competitor_id))
    const uniqueProcedures = new Set(thisWeekPrices.map(p => p.procedure_id))

    const stats: WeeklyStats = {
      totalCompetitors: uniqueCompetitors.size,
      totalProcedures: uniqueProcedures.size,
      priceChanges: priceChanges.length,
      avgChangePercent: priceChanges.length > 0
        ? Math.round(priceChanges.reduce((sum, p) => sum + Math.abs(p.changePercent), 0) / priceChanges.length * 10) / 10
        : 0
    }

    // AI 리포트 생성
    let report: string
    try {
      const prompt = `병원 마케팅 담당자를 위한 주간 시장 리포트를 작성해주세요.

## 이번 주 요약 데이터
- 모니터링 경쟁사: ${stats.totalCompetitors}개
- 모니터링 시술: ${stats.totalProcedures}개
- 가격 변동 건수: ${stats.priceChanges}건
- 평균 변동폭: ${stats.avgChangePercent}%

## 주요 가격 변동 (상위 5개)
${topChanges.slice(0, 5).map(c => `- ${c.competitorName} ${c.procedureName}: ${c.direction === 'up' ? '▲' : '▼'}${Math.abs(c.changePercent)}% (${c.oldPrice.toLocaleString()}원 → ${c.newPrice.toLocaleString()}원)`).join('\n')}

## 카테고리별 동향
${categoryAnalysis.slice(0, 5).map(c => `- ${c.category}: ${c.trend === 'up' ? '상승' : c.trend === 'down' ? '하락' : '안정'} (${c.changePercent > 0 ? '+' : ''}${c.changePercent}%)`).join('\n')}

위 데이터를 바탕으로:
1. 핵심 인사이트 (2-3문장)
2. 주목해야 할 경쟁사 동향
3. 추천 액션 아이템 (3개)

경영진이 빠르게 읽을 수 있도록 간결하게 작성해주세요. 마크다운 형식으로 응답해주세요.`

      report = await generateText(prompt)
    } catch {
      report = `# 주간 시장 리포트

## 요약
이번 주 ${stats.totalCompetitors}개 경쟁사의 ${stats.totalProcedures}개 시술 가격을 모니터링했습니다.
총 ${stats.priceChanges}건의 가격 변동이 감지되었으며, 평균 변동폭은 ${stats.avgChangePercent}%입니다.

## 주요 변동
${topChanges.slice(0, 5).map(c => `- ${c.competitorName} ${c.procedureName}: ${c.direction === 'up' ? '▲' : '▼'}${Math.abs(c.changePercent)}%`).join('\n')}

## 추천 액션
1. 주요 가격 변동 경쟁사 모니터링 강화
2. 가격 경쟁력 분석 업데이트
3. 시장 트렌드에 맞는 패키지 구성 검토`
    }

    return NextResponse.json({
      success: true,
      period: {
        start: oneWeekAgo.toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      stats,
      topChanges,
      categoryAnalysis,
      report,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Weekly report error:', error)
    return NextResponse.json(
      { error: '주간 리포트 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
