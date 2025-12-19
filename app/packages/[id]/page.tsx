'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface Procedure {
  id: number;
  name: string;
  brand?: string;
}

interface PackageProcedure {
  procedure_id: number;
  procedure_name?: string;
  quantity: number;
  unit_price: number;
}

interface Package {
  id: number;
  name: string;
  description?: string;
  total_price: string;
  discount_rate?: number;
  source: string;
  ai_rationale?: string;
  is_active: boolean;
  procedures: {
    id: number;
    procedure_id: number;
    quantity: number;
    unit_price: string;
    procedure: {
      id: number;
      name: string;
      brand?: string;
    };
  }[];
}

export default function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_rate: 0,
    is_active: true,
    source: 'Manual',
    ai_rationale: '',
  });

  const [packageProcedures, setPackageProcedures] = useState<PackageProcedure[]>([]);

  const fetchPackage = useCallback(async () => {
    try {
      const response = await fetch(`/api/packages/${id}`);
      if (!response.ok) throw new Error('Failed to fetch package');
      const data: Package = await response.json();

      setFormData({
        name: data.name,
        description: data.description || '',
        discount_rate: data.discount_rate || 0,
        is_active: data.is_active,
        source: data.source,
        ai_rationale: data.ai_rationale || '',
      });

      setPackageProcedures(
        data.procedures.map((proc) => ({
          procedure_id: proc.procedure_id,
          quantity: proc.quantity,
          unit_price: Number(proc.unit_price),
        }))
      );
    } catch {
      setError('패키지 정보를 불러올 수 없습니다.');
    } finally {
      setFetching(false);
    }
  }, [id]);

  const fetchProcedures = useCallback(async () => {
    try {
      const response = await fetch('/api/procedures');
      if (!response.ok) throw new Error('Failed to fetch procedures');
      const data = await response.json();
      setProcedures(data);
    } catch {
      setError('시술 목록을 불러올 수 없습니다.');
    } finally {
      setProceduresLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackage();
    fetchProcedures();
  }, [fetchPackage, fetchProcedures]);

  const calculateTotal = () => {
    const subtotal = packageProcedures.reduce(
      (sum, proc) => sum + proc.unit_price * proc.quantity,
      0
    );
    const discount = subtotal * (formData.discount_rate / 100);
    return subtotal - discount;
  };

  const calculateSubtotal = () => {
    return packageProcedures.reduce(
      (sum, proc) => sum + proc.unit_price * proc.quantity,
      0
    );
  };

  const addProcedure = () => {
    setPackageProcedures([
      ...packageProcedures,
      { procedure_id: 0, quantity: 1, unit_price: 0 },
    ]);
  };

  const removeProcedure = (index: number) => {
    setPackageProcedures(packageProcedures.filter((_, i) => i !== index));
  };

  const updateProcedure = (index: number, field: keyof PackageProcedure, value: number) => {
    const updated = [...packageProcedures];
    updated[index] = { ...updated[index], [field]: value };
    setPackageProcedures(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error('패키지 이름을 입력해주세요.');
      }

      const validProcedures = packageProcedures.filter(
        (proc) => proc.procedure_id > 0 && proc.unit_price > 0
      );

      if (validProcedures.length === 0) {
        throw new Error('최소 1개 이상의 시술을 추가해주세요.');
      }

      const total = calculateTotal();

      const response = await fetch(`/api/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total_price: total,
          procedures: validProcedures,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '패키지 수정에 실패했습니다.');
      }

      router.push('/packages');
    } catch (err) {
      setError(err instanceof Error ? err.message : '패키지 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  if (fetching) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/packages">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">패키지 수정</h1>
          <p className="text-gray-600 mt-1">패키지 정보를 수정하세요</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>패키지의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">패키지 이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 안티에이징 풀코스"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="패키지에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>

            {formData.source === 'AI' && formData.ai_rationale && (
              <div className="space-y-2">
                <Label htmlFor="ai_rationale">AI 추천 이유</Label>
                <Textarea
                  id="ai_rationale"
                  value={formData.ai_rationale}
                  onChange={(e) => setFormData({ ...formData, ai_rationale: e.target.value })}
                  rows={2}
                  className="bg-blue-50"
                  disabled
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount_rate">할인율 (%)</Label>
                <Input
                  id="discount_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, discount_rate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_active">활성 상태</Label>
                <Select
                  value={formData.is_active.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value === 'true' })
                  }
                >
                  <SelectTrigger id="is_active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">활성</SelectItem>
                    <SelectItem value="false">비활성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Procedures */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>포함 시술</CardTitle>
                <CardDescription>패키지에 포함할 시술을 추가하세요</CardDescription>
              </div>
              <Button type="button" onClick={addProcedure} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                시술 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {proceduresLoading ? (
              <div className="text-center py-8 text-gray-500">시술 목록 로딩 중...</div>
            ) : (
              <>
                {packageProcedures.map((proc, index) => (
                  <div key={index} className="flex gap-4 items-start p-4 border rounded-lg">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>시술 선택 *</Label>
                        <Select
                          value={proc.procedure_id.toString()}
                          onValueChange={(value) =>
                            updateProcedure(index, 'procedure_id', parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="시술 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {procedures.map((procedure) => (
                              <SelectItem key={procedure.id} value={procedure.id.toString()}>
                                {procedure.name}
                                {procedure.brand && ` (${procedure.brand})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>횟수</Label>
                        <Input
                          type="number"
                          min="1"
                          value={proc.quantity}
                          onChange={(e) =>
                            updateProcedure(index, 'quantity', parseInt(e.target.value) || 1)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>단가 (원) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1000"
                          value={proc.unit_price}
                          onChange={(e) =>
                            updateProcedure(index, 'unit_price', parseInt(e.target.value) || 0)
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProcedure(index)}
                      disabled={packageProcedures.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Price Summary */}
        <Card>
          <CardHeader>
            <CardTitle>가격 요약</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">소계</span>
              <span className="font-semibold">{formatPrice(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">할인 ({formData.discount_rate}%)</span>
              <span className="font-semibold text-red-600">
                -{formatPrice(calculateSubtotal() * (formData.discount_rate / 100))}
              </span>
            </div>
            <div className="pt-3 border-t flex justify-between text-2xl">
              <span className="font-bold">총 금액</span>
              <span className="font-bold text-emerald-600">{formatPrice(calculateTotal())}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link href="/packages">
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading ? '수정 중...' : '패키지 수정'}
          </Button>
        </div>
      </form>
    </div>
  );
}
