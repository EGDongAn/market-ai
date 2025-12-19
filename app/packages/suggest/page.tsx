'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Sparkles, Check, X, Loader2 } from 'lucide-react';

interface SuggestedProcedure {
  procedure_id: number;
  procedure_name: string;
  quantity: number;
  unit_price: number;
}

interface SuggestedPackage {
  name: string;
  description: string;
  procedures: SuggestedProcedure[];
  discount_rate: number;
  ai_rationale: string;
  total_price: number;
  subtotal: number;
}

export default function SuggestPackagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedPackage[]>([]);

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/packages/suggest', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('AI 패키지 제안 생성에 실패했습니다.');
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 제안 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (suggestion: SuggestedPackage, index: number) => {
    setSaving(index);
    setError(null);

    try {
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggestion.name,
          description: suggestion.description,
          total_price: suggestion.total_price,
          discount_rate: suggestion.discount_rate,
          source: 'AI',
          ai_rationale: suggestion.ai_rationale,
          is_active: true,
          procedures: suggestion.procedures,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '패키지 저장에 실패했습니다.');
      }

      // Remove accepted suggestion from list
      setSuggestions(suggestions.filter((_, i) => i !== index));

      // If no more suggestions, redirect to packages page
      if (suggestions.length === 1) {
        router.push('/packages');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '패키지 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(null);
    }
  };

  const handleReject = (index: number) => {
    setSuggestions(suggestions.filter((_, i) => i !== index));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/packages">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-emerald-600" />
            AI 패키지 제안
          </h1>
          <p className="text-gray-600 mt-1">
            AI가 인기 시술을 분석하여 최적의 패키지를 제안합니다
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Generate Button */}
      {suggestions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">AI 패키지 제안 받기</h2>
            <p className="text-gray-600 mb-6">
              인기 시술과 가격 데이터를 분석하여 최적의 패키지를 제안해드립니다.
            </p>
            <Button
              onClick={handleGenerateSuggestions}
              disabled={loading}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  AI 제안 생성하기
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Suggestions List */}
      {suggestions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">제안된 패키지 ({suggestions.length}개)</h2>
              <p className="text-sm text-gray-600 mt-1">
                각 패키지를 확인하고 수락 또는 거부하세요
              </p>
            </div>
            <Button
              onClick={handleGenerateSuggestions}
              variant="outline"
              disabled={loading}
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              새로 생성
            </Button>
          </div>

          {suggestions.map((suggestion, index) => (
            <Card key={index} className="border-2 border-emerald-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{suggestion.name}</CardTitle>
                      <Badge variant="secondary" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI 추천
                      </Badge>
                    </div>
                    <CardDescription>{suggestion.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Rationale */}
                <Alert className="bg-blue-50 border-blue-200">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>AI 추천 이유:</strong> {suggestion.ai_rationale}
                  </AlertDescription>
                </Alert>

                {/* Price Summary */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">소계</span>
                    <span className="font-semibold">{formatPrice(suggestion.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">할인 ({suggestion.discount_rate}%)</span>
                    <span className="font-semibold text-red-600">
                      -{formatPrice(suggestion.subtotal * (suggestion.discount_rate / 100))}
                    </span>
                  </div>
                  <div className="pt-2 border-t flex justify-between text-2xl">
                    <span className="font-bold">최종 금액</span>
                    <span className="font-bold text-emerald-600">
                      {formatPrice(suggestion.total_price)}
                    </span>
                  </div>
                </div>

                {/* Procedures List */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-700">
                    포함된 시술 ({suggestion.procedures.length}개)
                  </h3>
                  {suggestion.procedures.map((proc, procIndex) => (
                    <div
                      key={procIndex}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{proc.procedure_name}</div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm text-gray-600">
                          {proc.quantity}회 × {formatPrice(proc.unit_price)}
                        </div>
                        <div className="font-semibold text-emerald-600">
                          {formatPrice(proc.unit_price * proc.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleAccept(suggestion, index)}
                    disabled={saving !== null}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saving === index ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        수락하고 저장
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleReject(index)}
                    disabled={saving !== null}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    거부
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
