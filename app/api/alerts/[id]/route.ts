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
      name,
      alert_type,
      competitor_id,
      procedure_id,
      threshold,
      threshold_type,
      notify_email,
      is_active,
    } = body

    const updateData: Prisma.market_alertsUpdateInput = {}

    if (name !== undefined) updateData.name = name
    if (alert_type !== undefined) updateData.alert_type = alert_type
    if (competitor_id !== undefined) updateData.competitor_id = competitor_id || null
    if (procedure_id !== undefined) updateData.procedure_id = procedure_id || null
    if (threshold !== undefined)
      updateData.threshold = threshold ? parseFloat(threshold) : null
    if (threshold_type !== undefined) updateData.threshold_type = threshold_type || null
    if (notify_email !== undefined) updateData.notify_email = notify_email || null
    if (is_active !== undefined) updateData.is_active = is_active

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
