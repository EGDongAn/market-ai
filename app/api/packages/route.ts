import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/packages - List all packages with procedures
export async function GET() {
  try {
    const packages = await prisma.market_packages.findMany({
      include: {
        market_package_items: {
          include: {
            market_procedures: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: '패키지 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST /api/packages - Create new package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, package_price, regular_price, is_ai_suggested, ai_rationale, is_active, procedures } = body;

    // Validate required fields
    if (!name || !package_price || !procedures || procedures.length === 0) {
      return NextResponse.json(
        { error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // Create package with procedures
    const newPackage = await prisma.market_packages.create({
      data: {
        name,
        description,
        package_price,
        regular_price: regular_price || null,
        is_ai_suggested: is_ai_suggested || false,
        ai_rationale: ai_rationale || null,
        is_active: is_active !== undefined ? is_active : true,
        market_package_items: {
          create: procedures.map((proc: { procedure_id: number; quantity?: number; discount_percent?: number }) => ({
            procedure_id: proc.procedure_id,
            quantity: proc.quantity || 1,
            discount_percent: proc.discount_percent || 0,
          })),
        },
      },
      include: {
        market_package_items: {
          include: {
            market_procedures: true,
          },
        },
      },
    });

    return NextResponse.json(newPackage, { status: 201 });
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { error: '패키지 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
