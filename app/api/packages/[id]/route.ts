import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/packages/[id] - Get single package
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const packageId = parseInt(id);

    const pkg = await prisma.market_packages.findUnique({
      where: { id: packageId },
      include: {
        procedures: {
          include: {
            procedure: true,
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json(
        { error: '패키지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(pkg);
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { error: '패키지 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// PUT /api/packages/[id] - Update package
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const packageId = parseInt(id);
    const body = await request.json();
    const { name, description, total_price, discount_rate, source, ai_rationale, is_active, procedures } = body;

    // Delete existing procedures and create new ones
    await prisma.market_package_procedures.deleteMany({
      where: { package_id: packageId },
    });

    const updatedPackage = await prisma.market_packages.update({
      where: { id: packageId },
      data: {
        name,
        description,
        total_price,
        discount_rate: discount_rate || null,
        source: source || 'Manual',
        ai_rationale: ai_rationale || null,
        is_active: is_active !== undefined ? is_active : true,
        procedures: {
          create: procedures.map((proc: { procedure_id: number; quantity?: number; unit_price: number }) => ({
            procedure_id: proc.procedure_id,
            quantity: proc.quantity || 1,
            unit_price: proc.unit_price,
          })),
        },
      },
      include: {
        procedures: {
          include: {
            procedure: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPackage);
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { error: '패키지 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE /api/packages/[id] - Delete package
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const packageId = parseInt(id);

    await prisma.market_packages.delete({
      where: { id: packageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { error: '패키지 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
