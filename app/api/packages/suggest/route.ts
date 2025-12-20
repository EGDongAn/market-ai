import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateJSON } from '@/lib/ai';
import { searchProcedures } from '@/lib/vector-search';
import { packageSuggestionPrompt } from '@/lib/prompts';

interface SuggestionRequest {
  intent?: string;
  budget?: number;
  procedureCount?: number;
}

interface PackageSuggestion {
  name: string;
  description: string;
  rationale: string;
  discountRate: number;
}

// POST /api/packages/suggest - AI package suggestion
export async function POST(request: NextRequest) {
  try {
    const body: SuggestionRequest = await request.json();
    const { intent, budget, procedureCount = 3 } = body;

    // Get procedures based on intent or popularity
    let procedures;
    if (intent) {
      // Use semantic search
      const searchResults = await searchProcedures(intent, { limit: procedureCount * 2 });
      const procedureIds = searchResults.map(r => r.id);
      procedures = await prisma.market_procedures.findMany({
        where: { id: { in: procedureIds } },
        include: {
          subcategory: { include: { category: true } },
          our_prices: { where: { is_active: true }, take: 1 }
        }
      });
    } else {
      // Get procedures with active prices
      procedures = await prisma.market_procedures.findMany({
        where: {
          our_prices: { some: { is_active: true } }
        },
        include: {
          subcategory: { include: { category: true } },
          our_prices: { where: { is_active: true }, take: 1 }
        },
        take: procedureCount * 3
      });
    }

    if (procedures.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Get competitor prices for context
    const procedureIds = procedures.map(p => p.id);
    const competitorPrices = await prisma.market_prices.groupBy({
      by: ['procedure_id'],
      where: { procedure_id: { in: procedureIds } },
      _avg: { regular_price: true }
    });

    const priceMap = new Map(competitorPrices.map(p => [
      p.procedure_id,
      p._avg.regular_price?.toNumber() || 0
    ]));

    // Generate suggestions using AI
    const suggestions: {
      name: string;
      description: string;
      procedures: typeof procedures;
      rationale: string;
      discountRate: number;
      totalPrice: number;
    }[] = [];

    // Create 3 different package combinations
    for (let i = 0; i < 3; i++) {
      const startIdx = i * procedureCount;
      const packageProcedures = procedures.slice(startIdx, startIdx + procedureCount);

      if (packageProcedures.length < 2) continue;

      const prompt = packageSuggestionPrompt
        .replace('{{procedures}}', JSON.stringify(packageProcedures.map(p => ({
          name: p.name,
          category: p.subcategory.category.name,
          price: p.our_prices[0]?.regular_price?.toString()
        }))))
        .replace('{{competitorPrices}}', JSON.stringify(
          packageProcedures.map(p => ({
            name: p.name,
            avgPrice: priceMap.get(p.id)
          }))
        ));

      try {
        const aiSuggestion = await generateJSON<PackageSuggestion>(prompt);

        const totalPrice = packageProcedures.reduce((sum, p) =>
          sum + (p.our_prices[0]?.regular_price?.toNumber() || 0), 0
        );

        suggestions.push({
          name: aiSuggestion.name,
          description: aiSuggestion.description,
          procedures: packageProcedures,
          rationale: aiSuggestion.rationale,
          discountRate: aiSuggestion.discountRate,
          totalPrice: Math.round(totalPrice * (1 - aiSuggestion.discountRate / 100))
        });
      } catch (err) {
        console.error('AI suggestion failed:', err);
        // Fallback to simple suggestion
        const totalPrice = packageProcedures.reduce((sum, p) =>
          sum + (p.our_prices[0]?.regular_price?.toNumber() || 0), 0
        );
        suggestions.push({
          name: `${packageProcedures[0].subcategory.category.name} 스페셜`,
          description: `인기 ${packageProcedures[0].subcategory.category.name} 시술 패키지`,
          procedures: packageProcedures,
          rationale: '인기 시술 조합으로 구성된 패키지입니다.',
          discountRate: 15,
          totalPrice: Math.round(totalPrice * 0.85)
        });
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Failed to generate suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
