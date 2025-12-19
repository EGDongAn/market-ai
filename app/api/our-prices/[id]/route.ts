import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/our-prices/[id] - Get single price
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const price = await prisma.market_our_prices.findUnique({
      where: { id },
      include: {
        procedure: {
          include: {
            subcategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!price) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price not found',
        },
        { status: 404 }
      );
    }

    // Calculate margin
    const regularPrice = Number(price.regular_price);
    const costPrice = price.cost_price ? Number(price.cost_price) : null;
    const margin = costPrice
      ? ((regularPrice - costPrice) / regularPrice) * 100
      : null;

    const formattedPrice = {
      id: price.id,
      procedure_id: price.procedure_id,
      procedure_name: price.procedure.name,
      category: price.procedure.subcategory.category.name,
      subcategory: price.procedure.subcategory.name,
      brand: price.procedure.brand,
      regular_price: regularPrice,
      event_price: price.event_price ? Number(price.event_price) : null,
      cost_price: costPrice,
      margin_percent: margin ? Math.round(margin * 10) / 10 : null,
      valid_from: price.valid_from,
      valid_to: price.valid_to,
      is_active: price.is_active,
      created_at: price.created_at,
      updated_at: price.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: formattedPrice,
    });
  } catch (error) {
    console.error('Error fetching price:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch price',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/our-prices/[id] - Update price
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();

    // Check if price exists
    const existingPrice = await prisma.market_our_prices.findUnique({
      where: { id },
    });

    if (!existingPrice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price not found',
        },
        { status: 404 }
      );
    }

    const updateData: {
      regular_price?: number;
      event_price?: number | null;
      cost_price?: number | null;
      valid_from?: Date;
      valid_to?: Date | null;
      is_active?: boolean;
    } = {};

    if (body.regular_price !== undefined) {
      updateData.regular_price = parseFloat(body.regular_price);
    }
    if (body.event_price !== undefined) {
      updateData.event_price = body.event_price ? parseFloat(body.event_price) : null;
    }
    if (body.cost_price !== undefined) {
      updateData.cost_price = body.cost_price ? parseFloat(body.cost_price) : null;
    }
    if (body.valid_from !== undefined) {
      updateData.valid_from = new Date(body.valid_from);
    }
    if (body.valid_to !== undefined) {
      updateData.valid_to = body.valid_to ? new Date(body.valid_to) : null;
    }
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    }

    const updatedPrice = await prisma.market_our_prices.update({
      where: { id },
      data: updateData,
      include: {
        procedure: {
          include: {
            subcategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedPrice,
    });
  } catch (error) {
    console.error('Error updating price:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update price',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/our-prices/[id] - Delete price
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    // Check if price exists
    const existingPrice = await prisma.market_our_prices.findUnique({
      where: { id },
    });

    if (!existingPrice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price not found',
        },
        { status: 404 }
      );
    }

    await prisma.market_our_prices.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Price deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting price:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete price',
      },
      { status: 500 }
    );
  }
}
