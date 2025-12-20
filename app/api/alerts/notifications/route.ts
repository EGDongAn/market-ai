import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const history = await prisma.market_alert_history.findMany({
      include: {
        market_alerts: {
          select: {
            alert_type: true,
          },
        },
      },
      orderBy: {
        triggered_at: 'desc',
      },
      skip,
      take: limit,
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Failed to fetch alert history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alert history' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'History ID is required' }, { status: 400 })
    }

    const history = await prisma.market_alert_history.update({
      where: { id: parseInt(id) },
      data: { is_read: true },
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Failed to mark history as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark history as read' },
      { status: 500 }
    )
  }
}
