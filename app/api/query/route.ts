import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateJSON, generateText } from '@/lib/ai'

interface QueryIntent {
  type: 'price_comparison' | 'competitor_analysis' | 'trend' | 'recommendation' | 'general'
  entities: {
    procedures?: string[]
    competitors?: string[]
    categories?: string[]
    regions?: string[]
  }
  filters: {
    priceRange?: { min?: number; max?: number }
    dateRange?: { start?: string; end?: string }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: '질문을 입력해주세요.' },
        { status: 400 }
      )
    }

    // 1. 질문 의도 파악
    let intent: QueryIntent
    try {
      const intentPrompt = `사용자 질문의 의도를 분석하세요.

질문: "${question}"

다음 JSON 형식으로 응답:
{
  "type": "price_comparison/competitor_analysis/trend/recommendation/general 중 하나",
  "entities": {
    "procedures": ["언급된 시술명들"],
    "competitors": ["언급된 경쟁사명들"],
    "categories": ["언급된 카테고리들"],
    "regions": ["언급된 지역들"]
  },
  "filters": {
    "priceRange": { "min": null, "max": null },
    "dateRange": { "start": null, "end": null }
  }
}`

      intent = await generateJSON<QueryIntent>(intentPrompt)
    } catch {
      intent = {
        type: 'general',
        entities: {},
        filters: {}
      }
    }

    // 2. 관련 데이터 조회
    let relevantData: Record<string, unknown> = {}

    // 시술 검색
    if (intent.entities.procedures && intent.entities.procedures.length > 0) {
      const procedures = await prisma.market_procedures.findMany({
        where: {
          OR: intent.entities.procedures.map(name => ({
            name: { contains: name, mode: 'insensitive' as const }
          }))
        },
        include: {
          market_procedure_subcategories: { include: { market_procedure_categories: true } },
          market_prices: {
            take: 10,
            orderBy: { crawled_at: 'desc' },
            include: { market_competitors: true }
          }
        },
        take: 10
      })
      relevantData.procedures = procedures
    }

    // 경쟁사 검색
    if (intent.entities.competitors && intent.entities.competitors.length > 0) {
      const competitors = await prisma.market_competitors.findMany({
        where: {
          OR: intent.entities.competitors.map(name => ({
            name: { contains: name, mode: 'insensitive' as const }
          }))
        },
        take: 10
      })
      relevantData.competitors = competitors
    }

    // 지역별 검색
    if (intent.entities.regions && intent.entities.regions.length > 0) {
      const regionalCompetitors = await prisma.market_competitors.findMany({
        where: {
          OR: intent.entities.regions.map(region => ({
            region: { contains: region, mode: 'insensitive' as const }
          }))
        },
        include: {
          market_prices: {
            take: 20,
            orderBy: { crawled_at: 'desc' },
            include: { market_procedures: true }
          }
        },
        take: 20
      })
      relevantData.regionalCompetitors = regionalCompetitors
    }

    // 카테고리 검색
    if (intent.entities.categories && intent.entities.categories.length > 0) {
      const categories = await prisma.market_procedure_categories.findMany({
        where: {
          OR: intent.entities.categories.map(name => ({
            name: { contains: name, mode: 'insensitive' as const }
          }))
        },
        include: {
          market_procedure_subcategories: {
            include: {
              market_procedures: {
                take: 10
              }
            }
          }
        }
      })
      relevantData.categories = categories
    }

    // 일반 쿼리의 경우 최근 가격 데이터 샘플 제공
    if (intent.type === 'general' || Object.keys(relevantData).length === 0) {
      const recentPrices = await prisma.market_prices.findMany({
        take: 20,
        orderBy: { crawled_at: 'desc' },
        include: {
          market_procedures: {
            include: {
              market_procedure_subcategories: { include: { market_procedure_categories: true } }
            }
          },
          market_competitors: true
        }
      })
      relevantData.recentPrices = recentPrices
    }

    // 3. AI로 답변 생성
    let answer: string
    let confidence: number

    try {
      const dataContext = JSON.stringify(relevantData, (key, value) => {
        // Decimal 타입 처리
        if (value && typeof value === 'object' && 'toNumber' in value) {
          return value.toNumber()
        }
        return value
      }, 2)

      const answerPrompt = `사용자 질문에 데이터를 기반으로 답변해주세요.

## 질문
"${question}"

## 분석된 의도
${JSON.stringify(intent, null, 2)}

## 관련 데이터
${dataContext.slice(0, 5000)}

## 답변 지침
1. 데이터에 기반한 구체적인 답변을 제공하세요
2. 가격은 원화로 표시하세요 (예: 50,000원)
3. 데이터가 없는 경우 명확히 언급하세요
4. 한국어로 자연스럽게 답변하세요
5. 핵심 정보를 먼저, 부가 정보는 나중에 제공하세요`

      answer = await generateText(answerPrompt)
      confidence = Object.keys(relevantData).length > 0 ? 0.85 : 0.5
    } catch {
      answer = '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.'
      confidence = 0
    }

    // 4. 추가 제안 쿼리 생성
    const suggestedQueries = generateSuggestedQueries(intent)

    return NextResponse.json({
      success: true,
      question,
      intent,
      answer,
      confidence,
      dataFound: Object.keys(relevantData).length > 0,
      suggestedQueries,
      processedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Query error:', error)
    return NextResponse.json(
      { error: '질의 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}

function generateSuggestedQueries(intent: QueryIntent): string[] {
  const suggestions: string[] = []

  if (intent.entities.procedures && intent.entities.procedures.length > 0) {
    suggestions.push(`${intent.entities.procedures[0]} 가격 트렌드는 어떤가요?`)
    suggestions.push(`${intent.entities.procedures[0]}를 제공하는 경쟁사는 몇 개인가요?`)
  }

  if (intent.entities.competitors && intent.entities.competitors.length > 0) {
    suggestions.push(`${intent.entities.competitors[0]}의 주력 시술은 무엇인가요?`)
    suggestions.push(`${intent.entities.competitors[0]} 가격 전략은 어떤가요?`)
  }

  if (intent.entities.regions && intent.entities.regions.length > 0) {
    suggestions.push(`${intent.entities.regions[0]} 지역 평균 가격은 얼마인가요?`)
  }

  // 기본 제안
  if (suggestions.length === 0) {
    suggestions.push('가장 경쟁이 치열한 시술은 무엇인가요?')
    suggestions.push('이번 주 가격 변동이 큰 경쟁사는?')
    suggestions.push('추천 패키지 조합은 무엇인가요?')
  }

  return suggestions.slice(0, 3)
}
