import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateStats, calculateCompetitiveIntensity, analyzeTrend } from '@/lib/analytics'
import { generateJSON } from '@/lib/ai'

interface CategoryAnalysis {
  id: number
  name: string
  procedureCount: number
  competitorCount: number
  avgPrice: number
  priceRange: { min: number; max: number }
  competitiveIntensity: number
  trend: 'up' | 'down' | 'stable'
  trendStrength: number
  opportunities: string[]
  threats: string[]
}

export async function GET() {
  try {
    // 카테고리 목록 조회
    const categories = await prisma.market_procedure_categories.findMany({
      include: {
        market_procedure_subcategories: {
          include: {
            market_procedures: true
          }
        }
      }
    })

    // 최근 30일 가격 데이터
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const prices = await prisma.market_prices.findMany({
      where: {
        crawled_at: { gte: thirtyDaysAgo }
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

    // 카테고리별 가격 데이터 그룹화
    const categoryPrices = new Map<number, {
      name: string
      prices: number[]
      competitors: Set<number>
      procedures: Set<number>
    }>()

    for (const price of prices) {
      const categoryId = price.market_procedures?.market_procedure_subcategories?.market_procedure_categories?.id
      const categoryName = price.market_procedures?.market_procedure_subcategories?.market_procedure_categories?.name

      if (!categoryId || !categoryName) continue

      const priceValue = price.event_price?.toNumber() || price.regular_price?.toNumber() || 0
      if (priceValue <= 0) continue

      if (!categoryPrices.has(categoryId)) {
        categoryPrices.set(categoryId, {
          name: categoryName,
          prices: [],
          competitors: new Set(),
          procedures: new Set()
        })
      }

      const data = categoryPrices.get(categoryId)!
      data.prices.push(priceValue)
      data.competitors.add(price.competitor_id)
      data.procedures.add(price.procedure_id)
    }

    // 각 카테고리 분석
    const categoryAnalyses: CategoryAnalysis[] = []

    for (const [categoryId, data] of categoryPrices) {
      if (data.prices.length < 5) continue

      const stats = calculateStats(data.prices)
      const competitiveIntensity = calculateCompetitiveIntensity(data.prices)
      const trend = analyzeTrend(data.prices)

      categoryAnalyses.push({
        id: categoryId,
        name: data.name,
        procedureCount: data.procedures.size,
        competitorCount: data.competitors.size,
        avgPrice: Math.round(stats.mean),
        priceRange: {
          min: Math.round(stats.min),
          max: Math.round(stats.max)
        },
        competitiveIntensity,
        trend: trend.direction,
        trendStrength: trend.strength,
        opportunities: [],
        threats: []
      })
    }

    // AI로 기회/위협 분석
    if (categoryAnalyses.length > 0) {
      try {
        const prompt = `각 카테고리별 기회와 위협을 분석해주세요.

카테고리 분석 데이터:
${categoryAnalyses.map(c => `
## ${c.name}
- 시술 수: ${c.procedureCount}개
- 경쟁사 수: ${c.competitorCount}개
- 평균 가격: ${c.avgPrice.toLocaleString()}원
- 가격 범위: ${c.priceRange.min.toLocaleString()}원 ~ ${c.priceRange.max.toLocaleString()}원
- 경쟁 강도: ${c.competitiveIntensity}/10
- 트렌드: ${c.trend === 'up' ? '상승' : c.trend === 'down' ? '하락' : '안정'} (강도: ${Math.round(c.trendStrength * 100)}%)
`).join('\n')}

다음 JSON 형식으로 응답:
{
  "analyses": [
    {
      "categoryName": "카테고리명",
      "opportunities": ["기회1", "기회2"],
      "threats": ["위협1", "위협2"]
    }
  ]
}`

        const response = await generateJSON<{
          analyses: {
            categoryName: string
            opportunities: string[]
            threats: string[]
          }[]
        }>(prompt)

        // 분석 결과 매핑
        for (const analysis of response.analyses) {
          const category = categoryAnalyses.find(c => c.name === analysis.categoryName)
          if (category) {
            category.opportunities = analysis.opportunities
            category.threats = analysis.threats
          }
        }
      } catch {
        // 폴백: 기본 기회/위협 할당
        for (const category of categoryAnalyses) {
          if (category.competitiveIntensity < 5) {
            category.opportunities.push('경쟁이 적어 시장 선점 기회')
          }
          if (category.trend === 'up') {
            category.opportunities.push('가격 상승 트렌드로 마진 개선 가능')
          }
          if (category.competitiveIntensity > 7) {
            category.threats.push('경쟁 심화로 가격 압박 예상')
          }
          if (category.trend === 'down') {
            category.threats.push('가격 하락 트렌드로 마진 압박')
          }
        }
      }
    }

    // 경쟁 강도순 정렬
    categoryAnalyses.sort((a, b) => b.competitiveIntensity - a.competitiveIntensity)

    // 전체 요약
    const summary = {
      totalCategories: categoryAnalyses.length,
      avgCompetitiveIntensity: Math.round(
        calculateStats(categoryAnalyses.map(c => c.competitiveIntensity)).mean * 10
      ) / 10,
      risingCategories: categoryAnalyses.filter(c => c.trend === 'up').length,
      decliningCategories: categoryAnalyses.filter(c => c.trend === 'down').length,
      highCompetitionCategories: categoryAnalyses.filter(c => c.competitiveIntensity > 7).length
    }

    return NextResponse.json({
      success: true,
      summary,
      categories: categoryAnalyses,
      analyzedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Category analysis error:', error)
    return NextResponse.json(
      { error: '카테고리 분석에 실패했습니다.' },
      { status: 500 }
    )
  }
}
