import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const alertId = parseInt(id)

    const alert = await prisma.market_alerts.findUnique({
      where: { id: alertId },
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json(alert)
  } catch (error) {
    console.error('Failed to fetch alert:', error)
    return NextResponse.json({ error: 'Failed to fetch alert' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const alertId = parseInt(id)
    const body = await request.json()

    const {
      alert_type,
      competitor_id,
      procedure_id,
      threshold_percent,
      threshold_value,
      email_notify,
      push_notify,
      is_active,
    } = body

    const updateData: Prisma.market_alertsUpdateInput = {}

    if (alert_type !== undefined) updateData.alert_type = alert_type
    if (threshold_percent !== undefined)
      updateData.threshold_percent = threshold_percent ? parseFloat(threshold_percent) : null
    if (threshold_value !== undefined)
      updateData.threshold_value = threshold_value ? parseFloat(threshold_value) : null
    if (email_notify !== undefined) updateData.email_notify = email_notify
    if (push_notify !== undefined) updateData.push_notify = push_notify
    if (is_active !== undefined) updateData.is_active = is_active

    // Handle relations
    if (competitor_id !== undefined) {
      if (competitor_id) {
        updateData.market_competitors = { connect: { id: competitor_id } }
      } else {
        updateData.market_competitors = { disconnect: true }
      }
    }
    if (procedure_id !== undefined) {
      if (procedure_id) {
        updateData.market_procedures = { connect: { id: procedure_id } }
      } else {
        updateData.market_procedures = { disconnect: true }
      }
    }

    const alert = await prisma.market_alerts.update({
      where: { id: alertId },
      data: updateData,
    })

    return NextResponse.json(alert)
  } catch (error) {
    console.error('Failed to update alert:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const alertId = parseInt(id)

    await prisma.market_alerts.delete({
      where: { id: alertId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete alert:', error)
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
  }
}
