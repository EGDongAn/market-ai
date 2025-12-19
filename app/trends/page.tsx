'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { getDefaultDateRange, getPeriodLabel } from '@/lib/trend-utils';

type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface Procedure {
  id: number;
  name: string;
  subcategory: {
    name: string;
    category: {
      name: string;
    };
  };
}

interface TrendDataPoint {
  date: string;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  price_change: number | null;
  competitor_count: number | null;
}

export default function TrendsPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [period, setPeriod] = useState<Period>('DAILY');
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const defaultRange = getDefaultDateRange(30);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const fetchProcedures = useCallback(async () => {
    try {
      const response = await fetch('/api/procedures');
      const data = await response.json();
      if (data.success) {
        setProcedures(data.data);
        if (data.data.length > 0) {
          setSelectedProcedure(data.data[0].id.toString());
        }
      }
    } catch (error) {
      console.error('시술 목록 로드 실패:', error);
    }
  }, []);

  const fetchTrendData = useCallback(async () => {
    if (!selectedProcedure) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        procedure_id: selectedProcedure,
        period,
        start_date: startDate,
        end_date: endDate,
      });

      const response = await fetch(`/api/trends?${params}`);
      const data = await response.json();

      if (data.success) {
        setTrendData(data.data);
      }
    } catch (error) {
      console.error('트렌드 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProcedure, period, startDate, endDate]);

  // 시술 목록 로드
  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  // 시술 선택 시 트렌드 데이터 로드
  useEffect(() => {
    if (selectedProcedure) {
      fetchTrendData();
    }
  }, [selectedProcedure, fetchTrendData]);

  const handleCalculateTrends = async () => {
    if (!selectedProcedure) return;

    setCalculating(true);
    try {
      const response = await fetch('/api/trends/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedure_id: selectedProcedure,
          period,
          start_date: startDate,
          end_date: endDate,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchTrendData();
      }
    } catch (error) {
      console.error('트렌드 계산 실패:', error);
    } finally {
      setCalculating(false);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const formatPriceChange = (change: number | null) => {
    if (change === null) return '-';
    const formatted = change.toFixed(2);
    const icon =
      change > 0 ? (
        <TrendingUp className="inline w-4 h-4 text-red-500" />
      ) : change < 0 ? (
        <TrendingDown className="inline w-4 h-4 text-blue-500" />
      ) : null;

    return (
      <span className={change > 0 ? 'text-red-500' : change < 0 ? 'text-blue-500' : ''}>
        {icon} {formatted}%
      </span>
    );
  };

  const getLatestTrend = () => {
    if (trendData.length === 0) return null;
    return trendData[trendData.length - 1];
  };

  const latestTrend = getLatestTrend();
  const selectedProc = procedures.find((p) => p.id.toString() === selectedProcedure);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">가격 트렌드 분석</h1>
        <p className="text-gray-500 mt-2">시술별 가격 변화 추이를 분석합니다</p>
      </div>

      {/* 필터 영역 */}
      <Card>
        <CardHeader>
          <CardTitle>조회 조건</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>시술 선택</Label>
              <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
                <SelectTrigger>
                  <SelectValue placeholder="시술을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {procedures.map((proc) => (
                    <SelectItem key={proc.id} value={proc.id.toString()}>
                      {proc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>집계 기간</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">일별</SelectItem>
                  <SelectItem value="WEEKLY">주별</SelectItem>
                  <SelectItem value="MONTHLY">월별</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                onClick={handleCalculateTrends}
                disabled={calculating || !selectedProcedure}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? '계산 중...' : '트렌드 계산'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요약 카드 */}
      {latestTrend && selectedProc && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>평균 가격</CardDescription>
              <CardTitle className="text-2xl">
                {latestTrend.avg_price ? formatPrice(latestTrend.avg_price) + '원' : '-'}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>가격 변화</CardDescription>
              <CardTitle className="text-2xl">
                {formatPriceChange(latestTrend.price_change)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>가격 범위</CardDescription>
              <CardTitle className="text-lg">
                {latestTrend.min_price && latestTrend.max_price
                  ? `${formatPrice(latestTrend.min_price)} ~ ${formatPrice(latestTrend.max_price)}원`
                  : '-'}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>경쟁사 수</CardDescription>
              <CardTitle className="text-2xl">
                {latestTrend.competitor_count || 0}개
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* 차트 영역 */}
      <Tabs defaultValue="price" className="space-y-4">
        <TabsList>
          <TabsTrigger value="price">가격 트렌드</TabsTrigger>
          <TabsTrigger value="range">가격 범위</TabsTrigger>
          <TabsTrigger value="change">변화율</TabsTrigger>
        </TabsList>

        <TabsContent value="price">
          <Card>
            <CardHeader>
              <CardTitle>평균 가격 추이 ({getPeriodLabel(period)})</CardTitle>
              <CardDescription>
                {selectedProc?.name} - {trendData.length}개 데이터 포인트
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatPrice(value as number)}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => value !== undefined ? formatPrice(value) + '원' : '-'}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avg_price"
                      name="평균 가격"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-400">
                  데이터가 없습니다. 트렌드 계산 버튼을 눌러주세요.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="range">
          <Card>
            <CardHeader>
              <CardTitle>가격 범위 ({getPeriodLabel(period)})</CardTitle>
              <CardDescription>
                최소, 평균, 최대 가격 비교
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatPrice(value as number)}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => value !== undefined ? formatPrice(value) + '원' : '-'}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="max_price"
                      name="최대 가격"
                      stroke="#ef4444"
                      fill="#fecaca"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="avg_price"
                      name="평균 가격"
                      stroke="#10b981"
                      fill="#a7f3d0"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="min_price"
                      name="최소 가격"
                      stroke="#3b82f6"
                      fill="#bfdbfe"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-400">
                  데이터가 없습니다. 트렌드 계산 버튼을 눌러주세요.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="change">
          <Card>
            <CardHeader>
              <CardTitle>가격 변화율 ({getPeriodLabel(period)})</CardTitle>
              <CardDescription>
                이전 기간 대비 가격 변화율 (%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value as number}%`} />
                    <Tooltip
                      formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(2)}%` : '-'}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="price_change"
                      name="변화율"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-400">
                  데이터가 없습니다. 트렌드 계산 버튼을 눌러주세요.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
