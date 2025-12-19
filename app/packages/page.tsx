'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Sparkles, Package, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';

interface PackageProcedure {
  id: number;
  procedure_id: number;
  quantity: number;
  unit_price: string;
  procedure: {
    id: number;
    name: string;
    brand?: string;
  };
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
  created_at: string;
  procedures: PackageProcedure[];
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/packages');
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '패키지를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 패키지를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/packages/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete package');

      setPackages(packages.filter((pkg) => pkg.id !== id));
    } catch {
      alert('패키지 삭제 중 오류가 발생했습니다.');
    }
  };

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('ko-KR').format(Number(price)) + '원';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">패키지 관리</h1>
        </div>
        <div className="text-center py-12 text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">패키지 관리</h1>
          <p className="text-gray-600 mt-1">시술 패키지를 관리하고 AI 추천을 받아보세요</p>
        </div>
        <div className="flex gap-2">
          <Link href="/packages/suggest">
            <Button variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI 패키지 제안
            </Button>
          </Link>
          <Link href="/packages/new">
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              새 패키지 추가
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Package List */}
      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">아직 생성된 패키지가 없습니다.</p>
            <Link href="/packages/new">
              <Button>첫 패키지 만들기</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={!pkg.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{pkg.name}</CardTitle>
                      {pkg.source === 'AI' && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI 추천
                        </Badge>
                      )}
                      {!pkg.is_active && <Badge variant="outline">비활성</Badge>}
                    </div>
                    {pkg.description && (
                      <CardDescription>{pkg.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/packages/${pkg.id}`}>
                      <Button variant="outline" size="icon-sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleDelete(pkg.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Package Info */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">총 금액</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formatPrice(pkg.total_price)}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm text-gray-600">할인율</div>
                    <div className="text-xl font-semibold">
                      {pkg.discount_rate ? `${pkg.discount_rate}%` : '-'}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm text-gray-600">포함 시술</div>
                    <div className="text-xl font-semibold">{pkg.procedures.length}개</div>
                  </div>
                </div>

                {/* AI Rationale */}
                {pkg.ai_rationale && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <strong>AI 추천 이유:</strong> {pkg.ai_rationale}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Procedures List */}
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setExpandedId(expandedId === pkg.id ? null : pkg.id)}
                  >
                    <span className="text-sm font-medium">
                      포함된 시술 ({pkg.procedures.length}개)
                    </span>
                    {expandedId === pkg.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  {expandedId === pkg.id && (
                    <div className="mt-2 space-y-2">
                      {pkg.procedures.map((proc) => (
                        <div
                          key={proc.id}
                          className="flex items-center justify-between p-3 bg-white border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{proc.procedure.name}</div>
                            {proc.procedure.brand && (
                              <div className="text-sm text-gray-500">
                                {proc.procedure.brand}
                              </div>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-sm text-gray-600">
                              {proc.quantity}회 × {formatPrice(proc.unit_price)}
                            </div>
                            <div className="font-semibold text-emerald-600">
                              {formatPrice(Number(proc.unit_price) * proc.quantity)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
