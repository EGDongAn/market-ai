import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    const price = await prisma.market_prices.findUnique({
      where: { id },
      include: {
        competitor: {
          select: {
            id: true,
            name: true,
            website: true,
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
            aliases: true,
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
      }
    })

    if (!price) {
      return NextResponse.json(
        { success: false, error: 'Price not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: price
    })
  } catch (error) {
    console.error('Failed to fetch price:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch price' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { regular_price, event_price, source_url, source_type } = body

    // Get existing price for history
    const existingPrice = await prisma.market_prices.findUnique({
      where: { id }
    })

    if (!existingPrice) {
      return NextResponse.json(
        { success: false, error: 'Price not found' },
        { status: 404 }
      )
    }

    // Update price
    const updatedPrice = await prisma.market_prices.update({
      where: { id },
      data: {
        regular_price: regular_price !== undefined ? parseFloat(regular_price) : undefined,
        event_price: event_price !== undefined ? parseFloat(event_price) : undefined,
        source_url,
        source_type,
        crawled_at: new Date(),
      },
      include: {
        competitor: true,
        procedure: true,
      }
    })

    // Record price change history
    const priceChanges = []

    if (regular_price !== undefined && existingPrice.regular_price !== updatedPrice.regular_price) {
      const oldPrice = existingPrice.regular_price ? parseFloat(existingPrice.regular_price.toString()) : null
      const newPrice = updatedPrice.regular_price ? parseFloat(updatedPrice.regular_price.toString()) : 0
      const changePercent = oldPrice && oldPrice > 0
        ? ((newPrice - oldPrice) / oldPrice) * 100
        : null

      priceChanges.push({
        competitor_id: updatedPrice.competitor_id,
        procedure_id: updatedPrice.procedure_id,
        price_type: 'regular',
        old_price: oldPrice,
        new_price: newPrice,
        change_percent: changePercent,
        changed_at: new Date(),
      })
    }

    if (event_price !== undefined && existingPrice.event_price !== updatedPrice.event_price) {
      const oldPrice = existingPrice.event_price ? parseFloat(existingPrice.event_price.toString()) : null
      const newPrice = updatedPrice.event_price ? parseFloat(updatedPrice.event_price.toString()) : 0
      const changePercent = oldPrice && oldPrice > 0
        ? ((newPrice - oldPrice) / oldPrice) * 100
        : null

      priceChanges.push({
        competitor_id: updatedPrice.competitor_id,
        procedure_id: updatedPrice.procedure_id,
        price_type: 'event',
        old_price: oldPrice,
        new_price: newPrice,
        change_percent: changePercent,
        changed_at: new Date(),
      })
    }

    if (priceChanges.length > 0) {
      await prisma.market_price_history.createMany({
        data: priceChanges
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedPrice,
      history_recorded: priceChanges.length > 0
    })
  } catch (error) {
    console.error('Failed to update price:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update price' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    await prisma.market_prices.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Price deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete price:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete price' },
      { status: 500 }
    )
  }
}
