import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateJSON } from '@/lib/ai'
import { calculateStats } from '@/lib/analytics'

interface OptimizedPackage {
  name: string
  description: string
  procedures: {
    id: number
    name: string
    category: string
    ourPrice: number
    marketAvg: number
    marginPercent: number
  }[]
  totalOurPrice: number
  totalMarketAvg: number
  optimalDiscount: number
  expectedMargin: number
  demandForecast: '높음' | '중간' | '낮음'
  abTestSuggestion: string
  rationale: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetMargin = 25, season, procedureCount = 3 } = body

    // 우리 가격 조회
    const ourPrices = await prisma.market_our_prices.findMany({
      where: { is_active: true },
      include: {
        procedure: {
          include: {
            subcategory: { include: { category: true } }
          }
        }
      }
    })

    if (ourPrices.length === 0) {
      return NextResponse.json({
        success: false,
        error: '등록된 우리 가격이 없습니다.'
      })
    }

    // 시장 평균 가격 조회
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const marketPrices = await prisma.market_prices.findMany({
      where: {
        crawled_at: { gte: thirtyDaysAgo }
      }
    })

    // 시술별 시장 평균 계산
    const marketAvgByProcedure = new Map<number, number>()
    const procedurePricesMap = new Map<number, number[]>()

    for (const price of marketPrices) {
      const priceValue = price.event_price?.toNumber() || price.regular_price?.toNumber() || 0
      if (priceValue > 0) {
        if (!procedurePricesMap.has(price.procedure_id)) {
          procedurePricesMap.set(price.procedure_id, [])
        }
        procedurePricesMap.get(price.procedure_id)!.push(priceValue)
      }
    }

    for (const [procedureId, prices] of procedurePricesMap) {
      const stats = calculateStats(prices)
      marketAvgByProcedure.set(procedureId, stats.mean)
    }

    // 시술 데이터 정리
    const procedureData = ourPrices.map(op => {
      const marketAvg = marketAvgByProcedure.get(op.procedure_id) || 0
      const ourPrice = op.event_price?.toNumber() || op.regular_price?.toNumber() || 0
      const cost = op.cost_price?.toNumber() || 0
      const marginPercent = ourPrice > 0 ? ((ourPrice - cost) / ourPrice) * 100 : 0

      return {
        id: op.procedure_id,
        name: op.procedure?.name || '알 수 없음',
        category: op.procedure?.subcategory?.category?.name || '기타',
        subcategory: op.procedure?.subcategory?.name || '기타',
        ourPrice,
        cost,
        marketAvg: Math.round(marketAvg),
        marginPercent: Math.round(marginPercent),
        competitiveness: marketAvg > 0 ? ((ourPrice - marketAvg) / marketAvg) * 100 : 0
      }
    }).filter(p => p.ourPrice > 0)

    // 카테고리별 그룹화
    const byCategory = new Map<string, typeof procedureData>()
    for (const proc of procedureData) {
      if (!byCategory.has(proc.category)) {
        byCategory.set(proc.category, [])
      }
      byCategory.get(proc.category)!.push(proc)
    }

    // 시즌별 추천 (간단 로직)
    const currentMonth = new Date().getMonth() + 1
    let seasonalHint = ''
    if (season) {
      seasonalHint = `시즌: ${season}`
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      seasonalHint = '봄철 피부 재생/미백 시즌'
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      seasonalHint = '여름철 제모/바디 시즌'
    } else if (currentMonth >= 9 && currentMonth <= 11) {
      seasonalHint = '가을철 안티에이징/리프팅 시즌'
    } else {
      seasonalHint = '겨울철 보습/재생 시즌'
    }

    // AI로 최적화된 패키지 생성
    let optimizedPackages: OptimizedPackage[]
    try {
      const prompt = `최적화된 시술 패키지를 3개 생성해주세요.

## 요구사항
- 목표 마진율: ${targetMargin}%
- 패키지당 시술 수: ${procedureCount}개
- ${seasonalHint}

## 사용 가능한 시술 목록
${procedureData.slice(0, 20).map(p => `- ${p.name} (${p.category}): 우리가격 ${p.ourPrice.toLocaleString()}원, 시장평균 ${p.marketAvg.toLocaleString()}원, 마진 ${p.marginPercent}%`).join('\n')}

## JSON 형식으로 응답
{
  "packages": [
    {
      "name": "패키지명 (한국어, 매력적)",
      "description": "패키지 설명 (1-2문장)",
      "procedureIds": [시술ID1, 시술ID2, 시술ID3],
      "optimalDiscount": 15,
      "demandForecast": "높음/중간/낮음",
      "abTestSuggestion": "A안: X% vs B안: Y%",
      "rationale": "추천 이유"
    }
  ]
}`

      const response = await generateJSON<{
        packages: {
          name: string
          description: string
          procedureIds: number[]
          optimalDiscount: number
          demandForecast: '높음' | '중간' | '낮음'
          abTestSuggestion: string
          rationale: string
        }[]
      }>(prompt)

      optimizedPackages = response.packages.map(pkg => {
        const selectedProcedures = pkg.procedureIds
          .map(id => procedureData.find(p => p.id === id))
          .filter((p): p is typeof procedureData[0] => p !== undefined)

        const totalOurPrice = selectedProcedures.reduce((sum, p) => sum + p.ourPrice, 0)
        const totalMarketAvg = selectedProcedures.reduce((sum, p) => sum + p.marketAvg, 0)
        const totalCost = selectedProcedures.reduce((sum, p) => sum + p.cost, 0)

        const discountedPrice = totalOurPrice * (1 - pkg.optimalDiscount / 100)
        const expectedMargin = discountedPrice > 0 ? ((discountedPrice - totalCost) / discountedPrice) * 100 : 0

        return {
          name: pkg.name,
          description: pkg.description,
          procedures: selectedProcedures.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            ourPrice: p.ourPrice,
            marketAvg: p.marketAvg,
            marginPercent: p.marginPercent
          })),
          totalOurPrice,
          totalMarketAvg,
          optimalDiscount: pkg.optimalDiscount,
          expectedMargin: Math.round(expectedMargin),
          demandForecast: pkg.demandForecast,
          abTestSuggestion: pkg.abTestSuggestion,
          rationale: pkg.rationale
        }
      })
    } catch {
      // 폴백: 간단한 패키지 생성
      const categories = Array.from(byCategory.keys()).slice(0, 3)
      optimizedPackages = categories.map((cat, idx) => {
        const catProcs = byCategory.get(cat)!.slice(0, procedureCount)
        const totalOurPrice = catProcs.reduce((sum, p) => sum + p.ourPrice, 0)
        const totalMarketAvg = catProcs.reduce((sum, p) => sum + p.marketAvg, 0)

        return {
          name: `${cat} 스페셜 패키지 ${idx + 1}`,
          description: `${cat} 카테고리 인기 시술 모음`,
          procedures: catProcs.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            ourPrice: p.ourPrice,
            marketAvg: p.marketAvg,
            marginPercent: p.marginPercent
          })),
          totalOurPrice,
          totalMarketAvg,
          optimalDiscount: 15,
          expectedMargin: targetMargin,
          demandForecast: '중간' as const,
          abTestSuggestion: 'A: 15% 할인 vs B: 20% 할인',
          rationale: '카테고리 기반 자동 생성'
        }
      })
    }

    return NextResponse.json({
      success: true,
      season: seasonalHint,
      targetMargin,
      optimizedPackages,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Package optimization error:', error)
    return NextResponse.json(
      { error: '패키지 최적화에 실패했습니다.' },
      { status: 500 }
    )
  }
}
