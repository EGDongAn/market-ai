import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/our-prices - List all our prices with procedure details
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('is_active');

    const where: {
      is_active?: boolean;
      procedure?: {
        subcategory: {
          category: {
            name: string;
          };
        };
      };
    } = {};

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === 'true';
    }

    // Build where clause for category filter
    if (category) {
      where.procedure = {
        subcategory: {
          category: {
            name: category,
          },
        },
      };
    }

    const ourPrices = await prisma.market_our_prices.findMany({
      where,
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
      orderBy: {
        created_at: 'desc',
      },
    });

    // Format the response with calculated margins
    const formattedPrices = ourPrices.map((price) => {
      const regularPrice = Number(price.regular_price);
      const costPrice = price.cost_price ? Number(price.cost_price) : null;
      const eventPrice = price.event_price ? Number(price.event_price) : null;

      // Calculate margin percentage
      const margin = costPrice
        ? ((regularPrice - costPrice) / regularPrice) * 100
        : null;

      return {
        id: price.id,
        procedure_id: price.procedure_id,
        procedure_name: price.procedure.name,
        category: price.procedure.subcategory.category.name,
        subcategory: price.procedure.subcategory.name,
        brand: price.procedure.brand,
        regular_price: regularPrice,
        event_price: eventPrice,
        cost_price: costPrice,
        margin_percent: margin ? Math.round(margin * 10) / 10 : null,
        valid_from: price.valid_from,
        valid_to: price.valid_to,
        is_active: price.is_active,
        created_at: price.created_at,
        updated_at: price.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedPrices,
    });
  } catch (error) {
    console.error('Error fetching our prices:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch our prices',
      },
      { status: 500 }
    );
  }
}

// POST /api/our-prices - Create new price
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      procedure_id,
      regular_price,
      event_price,
      cost_price,
      valid_from,
      valid_to,
      is_active = true,
    } = body;

    // Validate required fields
    if (!procedure_id || !regular_price || !valid_from) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: procedure_id, regular_price, valid_from',
        },
        { status: 400 }
      );
    }

    // Check if procedure exists
    const procedure = await prisma.market_procedures.findUnique({
      where: { id: parseInt(procedure_id) },
    });

    if (!procedure) {
      return NextResponse.json(
        {
          success: false,
          error: 'Procedure not found',
        },
        { status: 404 }
      );
    }

    // Create the price
    const newPrice = await prisma.market_our_prices.create({
      data: {
        procedure_id: parseInt(procedure_id),
        regular_price: parseFloat(regular_price),
        event_price: event_price ? parseFloat(event_price) : null,
        cost_price: cost_price ? parseFloat(cost_price) : null,
        valid_from: new Date(valid_from),
        valid_to: valid_to ? new Date(valid_to) : null,
        is_active,
      },
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

    return NextResponse.json(
      {
        success: true,
        data: newPrice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating our price:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create price',
      },
      { status: 500 }
    );
  }
}
