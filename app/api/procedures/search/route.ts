import { NextRequest, NextResponse } from 'next/server'
import { searchProcedures } from '@/lib/vector-search'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, category_id, subcategory_id, limit = 10 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const results = await searchProcedures(query, {
      limit,
      categoryId: category_id,
      subcategoryId: subcategory_id,
      threshold: 0.3
    })

    return NextResponse.json({
      query,
      results,
      count: results.length
    })
  } catch (error) {
    console.error('Search failed:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
