'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save } from 'lucide-react';

interface PriceData {
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
}

export default function EditOurPricePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [priceData, setPriceData] = useState<PriceData | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    regular_price: '',
    event_price: '',
    cost_price: '',
    valid_from: '',
    valid_to: '',
    is_active: true,
  });

  // Fetch price data
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/our-prices/${id}`);
        const result = await response.json();

        if (result.success) {
          const data = result.data;
          setPriceData(data);

          // Format dates for input
          const validFrom = data.valid_from
            ? new Date(data.valid_from).toISOString().split('T')[0]
            : '';
          const validTo = data.valid_to
            ? new Date(data.valid_to).toISOString().split('T')[0]
            : '';

          setFormData({
            regular_price: data.regular_price?.toString() || '',
            event_price: data.event_price?.toString() || '',
            cost_price: data.cost_price?.toString() || '',
            valid_from: validFrom,
            valid_to: validTo,
            is_active: data.is_active,
          });
        } else {
          setError(result.error || 'Failed to fetch price data');
        }
      } catch (err) {
        console.error('Error fetching price:', err);
        setError('가격 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPrice();
    }
  }, [id]);

  // Calculate margin
  const calculateMargin = () => {
    const regular = parseFloat(formData.regular_price);
    const cost = parseFloat(formData.cost_price);

    if (regular && cost && regular > 0) {
      const margin = ((regular - cost) / regular) * 100;
      return Math.round(margin * 10) / 10;
    }
    return null;
  };

  const margin = calculateMargin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.regular_price) {
      setError('정상가를 입력해주세요.');
      return;
    }

    if (!formData.valid_from) {
      setError('시작일을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/our-prices/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/our-prices');
        }, 1000);
      } else {
        setError(result.error || '가격 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error updating price:', err);
      setError('가격 수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/our-prices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">가격 수정</h1>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">로딩 중...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!priceData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/our-prices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">가격 수정</h1>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            가격 정보를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/our-prices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">우리 가격 수정</h1>
          <p className="text-gray-600 mt-1">
            {priceData.procedure_name} 가격 정보 수정
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-emerald-50 border-emerald-200">
          <AlertDescription className="text-emerald-800">
            가격이 성공적으로 수정되었습니다. 목록 페이지로 이동합니다...
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>가격 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Procedure Info (Read-only) */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="text-sm font-medium text-gray-700">시술 정보</div>
              <div className="text-lg font-bold">{priceData.procedure_name}</div>
              <div className="text-sm text-gray-600">
                {priceData.category} / {priceData.subcategory}
                {priceData.brand && ` / ${priceData.brand}`}
              </div>
            </div>

            {/* Price Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="regular_price">정상가 (원) *</Label>
                <Input
                  id="regular_price"
                  type="number"
                  placeholder="0"
                  value={formData.regular_price}
                  onChange={(e) =>
                    setFormData({ ...formData, regular_price: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="event_price">이벤트가 (원)</Label>
                <Input
                  id="event_price"
                  type="number"
                  placeholder="0"
                  value={formData.event_price}
                  onChange={(e) =>
                    setFormData({ ...formData, event_price: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cost_price">원가 (원)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  placeholder="0"
                  value={formData.cost_price}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_price: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Margin Display */}
            {margin !== null && (
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="text-sm font-medium text-emerald-900">
                  계산된 마진율
                </div>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {margin}%
                </div>
                <div className="text-xs text-emerald-700 mt-1">
                  (정상가 - 원가) / 정상가 × 100
                </div>
              </div>
            )}

            {/* Date Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="valid_from">시작일 *</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) =>
                    setFormData({ ...formData, valid_from: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="valid_to">종료일</Label>
                <Input
                  id="valid_to"
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) =>
                    setFormData({ ...formData, valid_to: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">
                  비워두면 무기한 유효합니다
                </p>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="font-normal cursor-pointer">
                활성 상태
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Link href="/our-prices">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  '저장 중...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    저장
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
