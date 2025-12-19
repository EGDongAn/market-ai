'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save } from 'lucide-react';

interface Procedure {
  id: number;
  name: string;
  brand: string | null;
  unit: string | null;
  category: string;
  subcategory: string;
}

export default function NewOurPricePage() {
  const router = useRouter();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredProcedures, setFilteredProcedures] = useState<Procedure[]>(
    []
  );
  const [formData, setFormData] = useState({
    procedure_id: '',
    regular_price: '',
    event_price: '',
    cost_price: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: '',
    is_active: true,
  });

  // Fetch procedures
  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        const response = await fetch('/api/procedures');
        const result = await response.json();

        if (result.success) {
          const procs = result.data.map((p: {
            id: number;
            name: string;
            brand: string | null;
            unit: string | null;
            subcategory: {
              name: string;
              category: {
                name: string;
              };
            };
          }) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            unit: p.unit,
            category: p.subcategory.category.name,
            subcategory: p.subcategory.name,
          }));

          setProcedures(procs);

          // Extract unique categories
          const uniqueCategories = [
            ...new Set(procs.map((p: Procedure) => p.category)),
          ];
          setCategories(uniqueCategories as string[]);
        }
      } catch (err) {
        console.error('Error fetching procedures:', err);
      }
    };

    fetchProcedures();
  }, []);

  // Filter procedures by category
  useEffect(() => {
    if (selectedCategory) {
      const filtered = procedures.filter(
        (p) => p.category === selectedCategory
      );
      setFilteredProcedures(filtered);
    } else {
      setFilteredProcedures(procedures);
    }
  }, [selectedCategory, procedures]);

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
    if (!formData.procedure_id) {
      setError('시술을 선택해주세요.');
      return;
    }

    if (!formData.regular_price) {
      setError('정상가를 입력해주세요.');
      return;
    }

    if (!formData.valid_from) {
      setError('시작일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/our-prices', {
        method: 'POST',
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
        setError(result.error || '가격 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error creating price:', err);
      setError('가격 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold">우리 가격 등록</h1>
          <p className="text-gray-600 mt-1">새로운 시술 가격 정보를 등록합니다</p>
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
            가격이 성공적으로 등록되었습니다. 목록 페이지로 이동합니다...
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>가격 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category Filter */}
            <div className="grid gap-2">
              <Label htmlFor="category">카테고리 필터</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="전체 카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Procedure Selection */}
            <div className="grid gap-2">
              <Label htmlFor="procedure">시술 *</Label>
              <Select
                value={formData.procedure_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, procedure_id: value })
                }
              >
                <SelectTrigger id="procedure">
                  <SelectValue placeholder="시술을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProcedures.map((proc) => (
                    <SelectItem key={proc.id} value={proc.id.toString()}>
                      {proc.name}
                      {proc.brand && ` (${proc.brand})`} - {proc.category} /{' '}
                      {proc.subcategory}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                활성 상태로 등록
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
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  '등록 중...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    등록
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
