import { Decimal } from '@prisma/client/runtime/library';

export type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface PriceData {
  price: Decimal;
  crawled_at: Date;
}

export interface AggregatedPrice {
  avg_price: number;
  min_price: number;
  max_price: number;
  count: number;
}

export interface TrendData {
  procedure_id: number;
  period: Period;
  period_date: Date;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  price_change: number | null;
  competitor_count: number | null;
}

/**
 * 가격 변화율 계산
 * @param oldPrice 이전 가격
 * @param newPrice 현재 가격
 * @returns 변화율 (%)
 */
export function calculatePriceChange(
  oldPrice: number | null,
  newPrice: number | null
): number | null {
  if (!oldPrice || !newPrice || oldPrice === 0) return null;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * 기간별로 가격 데이터 집계
 * @param prices 가격 데이터 배열
 * @param period 집계 기간 (DAILY/WEEKLY/MONTHLY)
 * @returns 집계된 가격 데이터 맵 (날짜 키)
 */
export function aggregatePricesByPeriod(
  prices: PriceData[],
  period: Period
): Map<string, AggregatedPrice> {
  const aggregated = new Map<string, number[]>();

  prices.forEach(({ price, crawled_at }) => {
    const periodKey = getPeriodKey(crawled_at, period);
    const priceNum = Number(price);

    if (!aggregated.has(periodKey)) {
      aggregated.set(periodKey, []);
    }
    aggregated.get(periodKey)!.push(priceNum);
  });

  const result = new Map<string, AggregatedPrice>();

  aggregated.forEach((priceArray, key) => {
    result.set(key, {
      avg_price: priceArray.reduce((sum, p) => sum + p, 0) / priceArray.length,
      min_price: Math.min(...priceArray),
      max_price: Math.max(...priceArray),
      count: priceArray.length,
    });
  });

  return result;
}

/**
 * 날짜를 기간별 키로 변환
 * @param date 날짜
 * @param period 기간
 * @returns 기간 키 (YYYY-MM-DD 형식)
 */
function getPeriodKey(date: Date, period: Period): string {
  const d = new Date(date);

  switch (period) {
    case 'DAILY':
      return d.toISOString().split('T')[0];

    case 'WEEKLY':
      // 주의 시작일 (월요일)로 설정
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().split('T')[0];

    case 'MONTHLY':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

    default:
      return d.toISOString().split('T')[0];
  }
}

/**
 * 트렌드 데이터를 차트에 적합한 형식으로 변환
 * @param trends 트렌드 데이터 배열
 * @returns 차트용 데이터 배열
 */
export function formatTrendData(trends: TrendData[]) {
  return trends.map((trend) => ({
    date: trend.period_date.toISOString().split('T')[0],
    avg_price: trend.avg_price ? Number(trend.avg_price) : null,
    min_price: trend.min_price ? Number(trend.min_price) : null,
    max_price: trend.max_price ? Number(trend.max_price) : null,
    price_change: trend.price_change,
    competitor_count: trend.competitor_count,
  }));
}

/**
 * 날짜 범위 생성 (기본값: 최근 30일)
 * @param days 일수
 * @returns { startDate, endDate }
 */
export function getDefaultDateRange(days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * 기간 레이블 한글 변환
 * @param period 기간
 * @returns 한글 레이블
 */
export function getPeriodLabel(period: Period): string {
  const labels: Record<Period, string> = {
    DAILY: '일별',
    WEEKLY: '주별',
    MONTHLY: '월별',
  };
  return labels[period];
}
