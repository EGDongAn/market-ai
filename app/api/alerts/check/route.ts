import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, market_alerts, market_competitors, market_alert_notifications } from '@prisma/client'

interface PriceData {
  procedure_id: number
  competitor_id: number
  regular_price: number | null
  event_price: number | null
  procedure_name: string
  competitor_name: string
}

type NotificationData = PriceData[] | market_competitors[]

export async function POST() {
  try {
    // Fetch all active alerts
    const alerts = await prisma.market_alerts.findMany({
      where: { is_active: true },
    })

    const notifications: market_alert_notifications[] = []

    for (const alert of alerts) {
      let triggered = false
      let notificationData: NotificationData | null = null

      switch (alert.alert_type) {
        case 'PRICE_DROP':
        case 'PRICE_INCREASE':
        case 'PRICE_CHANGE':
          const priceChanges = await checkPriceChanges(alert)
          if (priceChanges.length > 0) {
            triggered = true
            notificationData = priceChanges
          }
          break

        case 'NEW_COMPETITOR':
          const newCompetitors = await checkNewCompetitors()
          if (newCompetitors.length > 0) {
            triggered = true
            notificationData = newCompetitors
          }
          break

        case 'COMPETITOR_UPDATE':
          const updates = await checkCompetitorUpdates(alert)
          if (updates.length > 0) {
            triggered = true
            notificationData = updates
          }
          break
      }

      if (triggered && notificationData) {
        const notification = await createNotification(alert, notificationData)
        notifications.push(notification)
      }
    }

    return NextResponse.json({
      success: true,
      checked: alerts.length,
      triggered: notifications.length,
      notifications,
    })
  } catch (error) {
    console.error('Failed to check alerts:', error)
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 })
  }
}

async function checkPriceChanges(alert: market_alerts): Promise<PriceData[]> {
  try {
    // Get recent price changes (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const whereClause: Prisma.market_pricesWhereInput = {
      crawled_at: {
        gte: yesterday,
      },
    }

    if (alert.competitor_id) {
      whereClause.competitor_id = alert.competitor_id
    }

    if (alert.procedure_id) {
      whereClause.procedure_id = alert.procedure_id
    }

    const recentPrices = await prisma.market_prices.findMany({
      where: whereClause,
      include: {
        procedure: {
          select: {
            name: true,
          },
        },
        competitor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        crawled_at: 'desc',
      },
    })

    // Get historical prices for comparison
    const priceChanges: PriceData[] = []

    for (const price of recentPrices) {
      const olderPrices = await prisma.market_prices.findMany({
        where: {
          competitor_id: price.competitor_id,
          procedure_id: price.procedure_id,
          crawled_at: {
            lt: yesterday,
          },
        },
        orderBy: {
          crawled_at: 'desc',
        },
        take: 1,
      })

      if (olderPrices.length > 0) {
        const oldPrice = olderPrices[0]
        const currentPrice = price.event_price || price.regular_price
        const previousPrice = oldPrice.event_price || oldPrice.regular_price

        if (currentPrice && previousPrice) {
          const changePercent = ((currentPrice.toNumber() - previousPrice.toNumber()) / previousPrice.toNumber()) * 100

          let shouldNotify = false

          if (alert.alert_type === 'PRICE_DROP' && changePercent < 0) {
            if (alert.threshold_type === 'PERCENT') {
              shouldNotify = Math.abs(changePercent) >= (alert.threshold || 0)
            } else if (alert.threshold_type === 'ABSOLUTE') {
              shouldNotify = Math.abs(currentPrice.toNumber() - previousPrice.toNumber()) >= (alert.threshold || 0)
            }
          } else if (alert.alert_type === 'PRICE_INCREASE' && changePercent > 0) {
            if (alert.threshold_type === 'PERCENT') {
              shouldNotify = changePercent >= (alert.threshold || 0)
            } else if (alert.threshold_type === 'ABSOLUTE') {
              shouldNotify = (currentPrice.toNumber() - previousPrice.toNumber()) >= (alert.threshold || 0)
            }
          } else if (alert.alert_type === 'PRICE_CHANGE') {
            if (alert.threshold_type === 'PERCENT') {
              shouldNotify = Math.abs(changePercent) >= (alert.threshold || 0)
            } else if (alert.threshold_type === 'ABSOLUTE') {
              shouldNotify = Math.abs(currentPrice.toNumber() - previousPrice.toNumber()) >= (alert.threshold || 0)
            }
          }

          if (shouldNotify) {
            priceChanges.push({
              procedure_id: price.procedure_id,
              competitor_id: price.competitor_id,
              regular_price: currentPrice.toNumber(),
              event_price: price.event_price?.toNumber() || null,
              procedure_name: price.procedure.name,
              competitor_name: price.competitor.name,
            })
          }
        }
      }
    }

    return priceChanges
  } catch (error) {
    console.error('Error checking price changes:', error)
    return []
  }
}

async function checkNewCompetitors(): Promise<market_competitors[]> {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const newCompetitors = await prisma.market_competitors.findMany({
      where: {
        created_at: {
          gte: yesterday,
        },
        is_active: true,
      },
    })

    return newCompetitors
  } catch (error) {
    console.error('Error checking new competitors:', error)
    return []
  }
}

async function checkCompetitorUpdates(alert: market_alerts): Promise<market_competitors[]> {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const whereClause: Prisma.market_competitorsWhereInput = {
      updated_at: {
        gte: yesterday,
      },
    }

    if (alert.competitor_id) {
      whereClause.id = alert.competitor_id
    }

    const updatedCompetitors = await prisma.market_competitors.findMany({
      where: whereClause,
    })

    return updatedCompetitors
  } catch (error) {
    console.error('Error checking competitor updates:', error)
    return []
  }
}

async function createNotification(alert: market_alerts, data: NotificationData) {
  let title = ''
  let message = ''

  switch (alert.alert_type) {
    case 'PRICE_DROP':
      title = '가격 하락 알림'
      message = `${data.length}개의 시술 가격이 하락했습니다.`
      break
    case 'PRICE_INCREASE':
      title = '가격 상승 알림'
      message = `${data.length}개의 시술 가격이 상승했습니다.`
      break
    case 'PRICE_CHANGE':
      title = '가격 변동 알림'
      message = `${data.length}개의 시술 가격이 변동되었습니다.`
      break
    case 'NEW_COMPETITOR':
      title = '신규 경쟁사 알림'
      message = `${data.length}개의 신규 경쟁사가 추가되었습니다.`
      break
    case 'COMPETITOR_UPDATE':
      title = '경쟁사 업데이트 알림'
      message = `${data.length}개의 경쟁사 정보가 업데이트되었습니다.`
      break
    default:
      title = '알림'
      message = '새로운 변동사항이 있습니다.'
  }

  const notification = await prisma.market_alert_notifications.create({
    data: {
      alert_id: alert.id,
      title,
      message,
      data: JSON.parse(JSON.stringify(data)),
      is_read: false,
    },
  })

  return notification
}
