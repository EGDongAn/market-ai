import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const competitorId = searchParams.get('competitor_id')
    const procedureId = searchParams.get('procedure_id')
    const priceType = searchParams.get('price_type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = searchParams.get('limit')

    const where: {
      competitor_id?: number;
      procedure_id?: number;
      price_type?: string;
      changed_at?: {
        gte?: Date;
        lte?: Date;
      };
    } = {}

    if (competitorId) {
      where.competitor_id = parseInt(competitorId)
    }

    if (procedureId) {
      where.procedure_id = parseInt(procedureId)
    }

    if (priceType) {
      where.price_type = priceType
    }

    if (startDate || endDate) {
      where.changed_at = {}
      if (startDate) {
        where.changed_at.gte = new Date(startDate)
      }
      if (endDate) {
        where.changed_at.lte = new Date(endDate)
      }
    }

    const history = await prisma.market_price_history.findMany({
      where,
      orderBy: {
        changed_at: 'desc'
      },
      take: limit ? parseInt(limit) : 100,
    })

    // Enrich with competitor and procedure names
    const enrichedHistory = await Promise.all(
      history.map(async (record) => {
        const competitor = record.competitor_id
          ? await prisma.market_competitors.findUnique({
              where: { id: record.competitor_id },
              select: { name: true, region: true }
            })
          : null

        const procedure = await prisma.market_procedures.findUnique({
          where: { id: record.procedure_id },
          select: {
            name: true,
            brand: true,
            subcategory: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        })

        return {
          ...record,
          competitor,
          procedure,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: enrichedHistory,
      count: enrichedHistory.length
    })
  } catch (error) {
    console.error('Failed to fetch price history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch price history' },
      { status: 500 }
    )
  }
}
