import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const competitorId = searchParams.get('competitor_id')
    const procedureId = searchParams.get('procedure_id')
    const categoryId = searchParams.get('category_id')
    const subcategoryId = searchParams.get('subcategory_id')

    const where: {
      competitor_id?: number;
      procedure_id?: number;
      procedure?: {
        subcategory: {
          id?: number;
          category_id?: number;
        };
      };
    } = {}

    if (competitorId) {
      where.competitor_id = parseInt(competitorId)
    }

    if (procedureId) {
      where.procedure_id = parseInt(procedureId)
    }

    if (categoryId || subcategoryId) {
      where.procedure = {
        subcategory: {}
      }

      if (subcategoryId) {
        where.procedure.subcategory.id = parseInt(subcategoryId)
      } else if (categoryId) {
        where.procedure.subcategory.category_id = parseInt(categoryId)
      }
    }

    const prices = await prisma.market_prices.findMany({
      where,
      include: {
        competitor: {
          select: {
            id: true,
            name: true,
            region: true,
            type: true,
          }
        },
        procedure: {
          select: {
            id: true,
            name: true,
            brand: true,
            unit: true,
            subcategory: {
              select: {
                id: true,
                name: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { procedure_id: 'asc' },
        { competitor_id: 'asc' }
      ],
      take: 1000, // Limit results
    })

    return NextResponse.json({
      success: true,
      data: prices,
      count: prices.length
    })
  } catch (error) {
    console.error('Failed to fetch prices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { competitor_id, procedure_id, regular_price, event_price, source_url, source_type } = body

    if (!competitor_id || !procedure_id) {
      return NextResponse.json(
        { success: false, error: 'competitor_id and procedure_id are required' },
        { status: 400 }
      )
    }

    // Check for existing price
    const existingPrice = await prisma.market_prices.findFirst({
      where: {
        competitor_id: parseInt(competitor_id),
        procedure_id: parseInt(procedure_id),
      },
      orderBy: {
        crawled_at: 'desc'
      }
    })

    // Create new price record
    const newPrice = await prisma.market_prices.create({
      data: {
        competitor_id: parseInt(competitor_id),
        procedure_id: parseInt(procedure_id),
        regular_price: regular_price ? parseFloat(regular_price) : null,
        event_price: event_price ? parseFloat(event_price) : null,
        source_url,
        source_type,
        crawled_at: new Date(),
      },
      include: {
        competitor: true,
        procedure: true,
      }
    })

    // Record price change history if price changed
    if (existingPrice) {
      const priceChanges = []

      if (existingPrice.regular_price !== newPrice.regular_price) {
        const oldPrice = existingPrice.regular_price ? parseFloat(existingPrice.regular_price.toString()) : null
        const newPriceVal = newPrice.regular_price ? parseFloat(newPrice.regular_price.toString()) : 0
        const changePercent = oldPrice && oldPrice > 0
          ? ((newPriceVal - oldPrice) / oldPrice) * 100
          : null

        priceChanges.push({
          competitor_id: newPrice.competitor_id,
          procedure_id: newPrice.procedure_id,
          price_type: 'regular',
          old_price: oldPrice,
          new_price: newPriceVal,
          change_percent: changePercent,
          changed_at: new Date(),
        })
      }

      if (existingPrice.event_price !== newPrice.event_price) {
        const oldPrice = existingPrice.event_price ? parseFloat(existingPrice.event_price.toString()) : null
        const newPriceVal = newPrice.event_price ? parseFloat(newPrice.event_price.toString()) : 0
        const changePercent = oldPrice && oldPrice > 0
          ? ((newPriceVal - oldPrice) / oldPrice) * 100
          : null

        priceChanges.push({
          competitor_id: newPrice.competitor_id,
          procedure_id: newPrice.procedure_id,
          price_type: 'event',
          old_price: oldPrice,
          new_price: newPriceVal,
          change_percent: changePercent,
          changed_at: new Date(),
        })
      }

      if (priceChanges.length > 0) {
        await prisma.market_price_history.createMany({
          data: priceChanges
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: newPrice,
      history_recorded: existingPrice ? true : false
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create price:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create price' },
      { status: 500 }
    )
  }
}
