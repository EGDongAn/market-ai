import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const notifications = await prisma.market_alert_notifications.findMany({
      include: {
        alert: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        sent_at: 'desc',
      },
      skip,
      take: limit,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    const notification = await prisma.market_alert_notifications.update({
      where: { id: parseInt(id) },
      data: { is_read: true },
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}
