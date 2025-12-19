'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OurPrice {
  id: number;
  procedure_id: number;
  procedure_name: string;
  category: string;
  subcategory: string;
  brand: string | null;
  regular_price: number;
  event_price: number | null;
  cost_price: number | null;
  margin_percent: number | null;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function OurPricesPage() {
  const [prices, setPrices] = useState<OurPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch prices
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      if (statusFilter !== 'all') {
        params.append('is_active', statusFilter);
      }

      const response = await fetch(`/api/our-prices?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setPrices(result.data);

        // Extract unique categories
        const uniqueCategories = [
          ...new Set(result.data.map((p: OurPrice) => p.category)),
        ];
        setCategories(uniqueCategories as string[]);
      } else {
        setError(result.error || 'Failed to fetch prices');
      }
    } catch (err) {
      setError('An error occurred while fetching prices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Delete price
  const handleDelete = async (id: number) => {
    if (!confirm('이 가격 정보를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/our-prices/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        fetchPrices();
      } else {
        alert(result.error || '삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // Format Korean won
  const formatWon = (amount: number | null) => {
    if (amount === null) return '-';
    return `₩${amount.toLocaleString('ko-KR')}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">우리 가격 관리</h1>
          <p className="text-gray-600 mt-1">시술별 가격 및 원가 관리</p>
        </div>
        <Link href="/our-prices/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            가격 등록
          </Button>
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 가격</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prices.length}</div>
            <p className="text-xs text-muted-foreground">
              활성 {prices.filter((p) => p.is_active).length}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 마진율</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prices.length > 0
                ? Math.round(
                    prices
                      .filter((p) => p.margin_percent !== null)
                      .reduce((acc, p) => acc + (p.margin_percent || 0), 0) /
                      prices.filter((p) => p.margin_percent !== null).length
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              원가 등록{' '}
              {prices.filter((p) => p.cost_price !== null).length}건
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이벤트 가격</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prices.filter((p) => p.event_price !== null).length}
            </div>
            <p className="text-xs text-muted-foreground">
              진행 중인 이벤트
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">카테고리</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">상태</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="true">활성</SelectItem>
                  <SelectItem value="false">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price List */}
      <Card>
        <CardHeader>
          <CardTitle>가격 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              로딩 중...
            </div>
          ) : prices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              가격 정보가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시술명</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>브랜드</TableHead>
                    <TableHead className="text-right">정상가</TableHead>
                    <TableHead className="text-right">이벤트가</TableHead>
                    <TableHead className="text-right">원가</TableHead>
                    <TableHead className="text-right">마진율</TableHead>
                    <TableHead>유효기간</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-center">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell className="font-medium">
                        {price.procedure_name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{price.category}</div>
                          <div className="text-gray-500">
                            {price.subcategory}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{price.brand || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatWon(price.regular_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {price.event_price ? (
                          <span className="text-emerald-600 font-medium">
                            {formatWon(price.event_price)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatWon(price.cost_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {price.margin_percent !== null ? (
                          <Badge
                            variant={
                              price.margin_percent >= 50
                                ? 'default'
                                : price.margin_percent >= 30
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {price.margin_percent}%
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(price.valid_from)}</div>
                          {price.valid_to && (
                            <div className="text-gray-500">
                              ~ {formatDate(price.valid_to)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={price.is_active ? 'default' : 'secondary'}
                        >
                          {price.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Link href={`/our-prices/${price.id}`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(price.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
