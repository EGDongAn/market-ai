import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/packages/suggest - AI package suggestion
export async function POST() {
  try {
    // Get popular procedures (those with the most price data)
    const proceduresWithPrices = await prisma.market_procedures.findMany({
      include: {
        prices: {
          where: {
            regular_price: { not: null },
          },
          orderBy: {
            crawled_at: 'desc',
          },
          take: 1,
        },
        our_prices: {
          where: {
            is_active: true,
          },
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        },
      },
    });

    // Filter procedures that have price data
    const proceduresWithData = proceduresWithPrices.filter(
      (p) => p.prices.length > 0 || p.our_prices.length > 0
    );

    // Mock AI suggestions - generate sample packages
    const suggestions = [
      {
        name: '안티에이징 풀코스',
        description: '피부 노화 방지를 위한 종합 케어 패키지',
        procedures: proceduresWithData.slice(0, 3).map((proc) => ({
          procedure_id: proc.id,
          procedure_name: proc.name,
          quantity: 1,
          unit_price: proc.our_prices[0]?.regular_price || proc.prices[0]?.regular_price || 100000,
        })),
        discount_rate: 15,
        ai_rationale: '가장 인기 있는 안티에이징 시술을 조합하여 시너지 효과를 극대화합니다. 경쟁사 대비 15% 할인으로 가격 경쟁력을 확보할 수 있습니다.',
      },
      {
        name: '리프팅 스페셜',
        description: '탄력 개선을 위한 집중 리프팅 패키지',
        procedures: proceduresWithData.slice(2, 5).map((proc) => ({
          procedure_id: proc.id,
          procedure_name: proc.name,
          quantity: 2,
          unit_price: proc.our_prices[0]?.regular_price || proc.prices[0]?.regular_price || 150000,
        })),
        discount_rate: 20,
        ai_rationale: '리프팅 효과가 뛰어난 시술들을 2회씩 구성하여 지속적인 개선 효과를 제공합니다. 20% 할인율로 높은 가치를 제공합니다.',
      },
      {
        name: '미백 집중 케어',
        description: '밝고 투명한 피부를 위한 미백 패키지',
        procedures: proceduresWithData.slice(1, 4).map((proc) => ({
          procedure_id: proc.id,
          procedure_name: proc.name,
          quantity: 1,
          unit_price: proc.our_prices[0]?.regular_price || proc.prices[0]?.regular_price || 120000,
        })),
        discount_rate: 10,
        ai_rationale: '미백에 효과적인 시술들을 조합하여 종합적인 피부 톤 개선 효과를 제공합니다. 시장 평균 대비 경쟁력 있는 가격으로 구성했습니다.',
      },
    ];

    // Filter out suggestions with no procedures
    const validSuggestions = suggestions.filter((s) => s.procedures.length > 0);

    // Calculate total prices for each suggestion
    const suggestionsWithPrices = validSuggestions.map((suggestion) => {
      const subtotal = suggestion.procedures.reduce(
        (sum, proc) => sum + Number(proc.unit_price) * proc.quantity,
        0
      );
      const total_price = subtotal * (1 - suggestion.discount_rate / 100);

      return {
        ...suggestion,
        total_price: Math.round(total_price),
        subtotal: Math.round(subtotal),
      };
    });

    return NextResponse.json(suggestionsWithPrices);
  } catch (error) {
    console.error('Error generating package suggestions:', error);
    return NextResponse.json(
      { error: 'AI 패키지 제안 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
