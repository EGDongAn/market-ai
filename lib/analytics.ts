// 통계 분석 유틸리티

export interface PriceStats {
  mean: number
  stdDev: number
  min: number
  max: number
  count: number
}

export interface ZScoreResult {
  value: number
  zScore: number
  isAnomaly: boolean
  direction: 'high' | 'low' | 'normal'
}

// 평균 계산
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

// 표준편차 계산
export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length < 2) return 0
  const avg = mean ?? calculateMean(values)
  const squareDiffs = values.map(value => Math.pow(value - avg, 2))
  return Math.sqrt(squareDiffs.reduce((sum, val) => sum + val, 0) / values.length)
}

// 기본 통계 계산
export function calculateStats(values: number[]): PriceStats {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0, min: 0, max: 0, count: 0 }
  }

  const mean = calculateMean(values)
  const stdDev = calculateStdDev(values, mean)

  return {
    mean,
    stdDev,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length
  }
}

// Z-score 기반 이상치 탐지
export function detectAnomaly(
  value: number,
  stats: PriceStats,
  threshold: number = 2
): ZScoreResult {
  if (stats.stdDev === 0) {
    return {
      value,
      zScore: 0,
      isAnomaly: false,
      direction: 'normal'
    }
  }

  const zScore = (value - stats.mean) / stats.stdDev
  const isAnomaly = Math.abs(zScore) > threshold

  let direction: 'high' | 'low' | 'normal' = 'normal'
  if (isAnomaly) {
    direction = zScore > 0 ? 'high' : 'low'
  }

  return {
    value,
    zScore: Math.round(zScore * 100) / 100,
    isAnomaly,
    direction
  }
}

// 변화율 계산
export function calculateChangeRate(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

// 이동평균 계산
export function calculateMovingAverage(values: number[], window: number): number[] {
  if (values.length < window) return []

  const result: number[] = []
  for (let i = window - 1; i < values.length; i++) {
    const windowValues = values.slice(i - window + 1, i + 1)
    result.push(calculateMean(windowValues))
  }

  return result
}

// 백분위수 계산
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = (percentile / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)

  if (lower === upper) return sorted[lower]

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

// 경쟁 강도 계산 (가격 분산도 기반)
export function calculateCompetitiveIntensity(prices: number[]): number {
  if (prices.length < 2) return 0

  const stats = calculateStats(prices)
  if (stats.mean === 0) return 0

  // 변동계수 (CV) 기반: 낮을수록 가격 경쟁이 치열함
  const cv = stats.stdDev / stats.mean

  // 0-10 스케일로 변환 (CV가 낮을수록 경쟁 강도 높음)
  // CV가 0이면 10점, CV가 0.5 이상이면 0점
  const intensity = Math.max(0, Math.min(10, (1 - cv * 2) * 10))

  return Math.round(intensity * 10) / 10
}

// 트렌드 방향 분석
export function analyzeTrend(values: number[]): {
  direction: 'up' | 'down' | 'stable'
  strength: number
  changePercent: number
} {
  if (values.length < 2) {
    return { direction: 'stable', strength: 0, changePercent: 0 }
  }

  const firstHalf = values.slice(0, Math.floor(values.length / 2))
  const secondHalf = values.slice(Math.floor(values.length / 2))

  const firstAvg = calculateMean(firstHalf)
  const secondAvg = calculateMean(secondHalf)

  if (firstAvg === 0) {
    return { direction: 'stable', strength: 0, changePercent: 0 }
  }

  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100

  let direction: 'up' | 'down' | 'stable' = 'stable'
  if (changePercent > 3) direction = 'up'
  else if (changePercent < -3) direction = 'down'

  // 강도: 0-1 사이, 변화가 클수록 강함
  const strength = Math.min(1, Math.abs(changePercent) / 20)

  return {
    direction,
    strength: Math.round(strength * 100) / 100,
    changePercent: Math.round(changePercent * 10) / 10
  }
}
