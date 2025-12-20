// 가격 예측 알고리즘

import { calculateMean, calculateStats, analyzeTrend } from './analytics'

export interface PricePrediction {
  date: string
  predictedPrice: number
  confidence: number
  lowerBound: number
  upperBound: number
}

export interface ForecastResult {
  predictions: PricePrediction[]
  trend: 'up' | 'down' | 'stable'
  trendStrength: number
  averageConfidence: number
}

// 선형 회귀 계수 계산
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] || 0 }

  const xMean = (n - 1) / 2
  const yMean = calculateMean(values)

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += Math.pow(i - xMean, 2)
  }

  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = yMean - slope * xMean

  return { slope, intercept }
}

// 지수 이동평균 (EMA) 계산
function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return []

  const k = 2 / (period + 1)
  const ema: number[] = [values[0]]

  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k))
  }

  return ema
}

// 가격 예측 생성
export function generateForecast(
  historicalPrices: { date: Date; price: number }[],
  daysToForecast: number = 7
): ForecastResult {
  if (historicalPrices.length < 3) {
    return {
      predictions: [],
      trend: 'stable',
      trendStrength: 0,
      averageConfidence: 0
    }
  }

  // 가격만 추출 (시간순 정렬)
  const sortedData = [...historicalPrices].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
  const prices = sortedData.map(d => d.price)

  // 선형 회귀로 기본 트렌드 파악
  const { slope, intercept } = linearRegression(prices)

  // EMA로 최근 트렌드 강조
  const ema = calculateEMA(prices, Math.min(7, prices.length))
  const recentEma = ema[ema.length - 1]

  // 통계 계산
  const stats = calculateStats(prices)
  const trendAnalysis = analyzeTrend(prices)

  // 예측 생성
  const predictions: PricePrediction[] = []
  const lastDate = sortedData[sortedData.length - 1].date
  const lastPrice = prices[prices.length - 1]

  for (let i = 1; i <= daysToForecast; i++) {
    const futureDate = new Date(lastDate)
    futureDate.setDate(futureDate.getDate() + i)

    // 선형 회귀 기반 예측
    const linearPrediction = intercept + slope * (prices.length + i - 1)

    // EMA 기반 가중치 적용
    const emaPrediction = recentEma + slope * i

    // 두 예측의 가중 평균 (EMA에 더 많은 가중치)
    const predictedPrice = linearPrediction * 0.3 + emaPrediction * 0.7

    // 신뢰도 계산 (멀어질수록 감소)
    const dayFactor = 1 - (i / daysToForecast) * 0.3
    const dataSizeFactor = Math.min(1, prices.length / 30)
    const confidence = Math.round(dayFactor * dataSizeFactor * 100) / 100

    // 신뢰 구간 계산 (표준편차 기반)
    const marginOfError = stats.stdDev * (1 + i * 0.1)

    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      predictedPrice: Math.round(predictedPrice),
      confidence,
      lowerBound: Math.round(predictedPrice - marginOfError),
      upperBound: Math.round(predictedPrice + marginOfError)
    })
  }

  return {
    predictions,
    trend: trendAnalysis.direction,
    trendStrength: trendAnalysis.strength,
    averageConfidence: Math.round(
      calculateMean(predictions.map(p => p.confidence)) * 100
    ) / 100
  }
}

// 시즌성 패턴 감지 (간단 버전)
export function detectSeasonality(
  monthlyData: { month: number; avgPrice: number }[]
): {
  hasSeasonality: boolean
  peakMonths: number[]
  lowMonths: number[]
} {
  if (monthlyData.length < 6) {
    return { hasSeasonality: false, peakMonths: [], lowMonths: [] }
  }

  const prices = monthlyData.map(d => d.avgPrice)
  const stats = calculateStats(prices)

  const peakMonths: number[] = []
  const lowMonths: number[] = []

  for (const data of monthlyData) {
    if (data.avgPrice > stats.mean + stats.stdDev * 0.5) {
      peakMonths.push(data.month)
    } else if (data.avgPrice < stats.mean - stats.stdDev * 0.5) {
      lowMonths.push(data.month)
    }
  }

  // 최소 2개 이상의 피크/저점이 있어야 시즌성 인정
  const hasSeasonality = peakMonths.length >= 1 && lowMonths.length >= 1

  return { hasSeasonality, peakMonths, lowMonths }
}

// 경쟁사 가격 예측 트렌드 분류
export function classifyPricingStrategy(
  priceHistory: number[]
): 'aggressive' | 'stable' | 'premium' | 'variable' {
  if (priceHistory.length < 5) return 'stable'

  const stats = calculateStats(priceHistory)
  const trend = analyzeTrend(priceHistory)

  // 변동계수 (CV)
  const cv = stats.stdDev / stats.mean

  if (cv > 0.15) return 'variable'
  if (trend.direction === 'down' && trend.strength > 0.3) return 'aggressive'
  if (trend.direction === 'up' && trend.strength > 0.3) return 'premium'

  return 'stable'
}
