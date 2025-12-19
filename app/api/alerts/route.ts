import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const alerts = await prisma.market_alerts.findMany({
      orderBy: {
        created_at: 'desc',
      },
    })

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Failed to fetch alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      alert_type,
      competitor_id,
      procedure_id,
      threshold,
      threshold_type,
      notify_email,
      is_active = true,
    } = body

    if (!name || !alert_type) {
      return NextResponse.json(
        { error: 'Name and alert_type are required' },
        { status: 400 }
      )
    }

    const alert = await prisma.market_alerts.create({
      data: {
        name,
        alert_type,
        competitor_id: competitor_id || null,
        procedure_id: procedure_id || null,
        threshold: threshold ? parseFloat(threshold) : null,
        threshold_type: threshold_type || null,
        notify_email: notify_email || null,
        is_active,
      },
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('Failed to create alert:', error)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}
