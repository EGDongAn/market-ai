import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const subcategoryId = searchParams.get('subcategoryId')

    const where: {
      subcategory_id?: number;
      subcategory?: {
        category_id: number;
      };
    } = {}

    if (subcategoryId) {
      where.subcategory_id = parseInt(subcategoryId)
    } else if (categoryId) {
      where.subcategory = {
        category_id: parseInt(categoryId)
      }
    }

    const procedures = await prisma.market_procedures.findMany({
      where,
      include: {
        subcategory: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(procedures)
  } catch (error) {
    console.error('Failed to fetch procedures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch procedures' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { subcategory_id, name, aliases, brand, unit } = body

    if (!subcategory_id || !name) {
      return NextResponse.json(
        { error: 'Subcategory ID and name are required' },
        { status: 400 }
      )
    }

    // Convert comma-separated aliases to JSON array
    const aliasesArray = aliases
      ? aliases.split(',').map((a: string) => a.trim()).filter(Boolean)
      : null

    const procedure = await prisma.market_procedures.create({
      data: {
        subcategory_id: parseInt(subcategory_id),
        name,
        aliases: aliasesArray,
        brand: brand || null,
        unit: unit || null
      },
      include: {
        subcategory: {
          include: {
            category: true
          }
        }
      }
    })

    return NextResponse.json(procedure)
  } catch (error) {
    console.error('Failed to create procedure:', error)
    return NextResponse.json(
      { error: 'Failed to create procedure' },
      { status: 500 }
    )
  }
}
