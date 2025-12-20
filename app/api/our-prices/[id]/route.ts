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
        market_procedures: {
          include: {
            market_procedure_subcategories: {
              include: {
                market_procedure_categories: true,
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
      procedure_name: price.market_procedures?.name || '',
      category: price.market_procedures?.market_procedure_subcategories?.market_procedure_categories?.name || '',
      subcategory: price.market_procedures?.market_procedure_subcategories?.name || '',
      brand: price.market_procedures?.brand || null,
      regular_price: regularPrice,
      event_price: price.event_price ? Number(price.event_price) : null,
      cost_price: costPrice,
      margin_percent: margin ? Math.round(margin * 10) / 10 : null,
      valid_from: price.valid_from,
      valid_until: price.valid_until,
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
      valid_until?: Date | null;
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
    if (body.valid_until !== undefined || body.valid_to !== undefined) {
      updateData.valid_until = (body.valid_until || body.valid_to) ? new Date(body.valid_until || body.valid_to) : null;
    }
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    }

    const updatedPrice = await prisma.market_our_prices.update({
      where: { id },
      data: updateData,
      include: {
        market_procedures: {
          include: {
            market_procedure_subcategories: {
              include: {
                market_procedure_categories: true,
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
