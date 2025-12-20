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
      alert_type,
      competitor_id,
      procedure_id,
      threshold_percent,
      threshold_value,
      email_notify,
      push_notify,
      is_active = true,
    } = body

    if (!alert_type) {
      return NextResponse.json(
        { error: 'alert_type is required' },
        { status: 400 }
      )
    }

    const alert = await prisma.market_alerts.create({
      data: {
        alert_type,
        competitor_id: competitor_id || null,
        procedure_id: procedure_id || null,
        threshold_percent: threshold_percent ? parseFloat(threshold_percent) : null,
        threshold_value: threshold_value ? parseFloat(threshold_value) : null,
        email_notify: email_notify ?? true,
        push_notify: push_notify ?? false,
        is_active,
      },
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('Failed to create alert:', error)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}
