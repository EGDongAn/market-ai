import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const procedure = await prisma.market_procedures.findUnique({
      where: { id: parseInt(id) },
      include: {
        subcategory: {
          include: {
            category: true
          }
        }
      }
    })

    if (!procedure) {
      return NextResponse.json(
        { error: 'Procedure not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(procedure)
  } catch (error) {
    console.error('Failed to fetch procedure:', error)
    return NextResponse.json(
      { error: 'Failed to fetch procedure' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const procedure = await prisma.market_procedures.update({
      where: { id: parseInt(id) },
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
    console.error('Failed to update procedure:', error)
    return NextResponse.json(
      { error: 'Failed to update procedure' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.market_procedures.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete procedure:', error)
    return NextResponse.json(
      { error: 'Failed to delete procedure' },
      { status: 500 }
    )
  }
}
