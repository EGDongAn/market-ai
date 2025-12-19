'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'

interface Price {
  id: number
  regular_price: string | null
  event_price: string | null
  competitor: {
    id: number
    name: string
    region: string | null
  }
  procedure: {
    id: number
    name: string
    brand: string | null
    subcategory: {
      id: number
      name: string
      category: {
        id: number
        name: string
      }
    }
  }
}

interface Category {
  id: number
  name: string
}

interface Subcategory {
  id: number
  name: string
  category_id: number
}

interface PriceMatrix {
  [procedureId: number]: {
    procedure: Price['procedure']
    prices: {
      [competitorId: number]: {
        regular_price: string | null
        event_price: string | null
      }
    }
  }
}

export default function PricesPage() {
  const [prices, setPrices] = useState<Price[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null)

  // Load categories and subcategories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories')
        const data = await res.json()
        if (data.success) {
          setCategories(data.data)
        }
      } catch (error) {
        console.error('Failed to load categories:', error)
      }
    }

    async function loadSubcategories() {
      try {
        const res = await fetch('/api/subcategories')
        const data = await res.json()
        if (data.success) {
          setSubcategories(data.data)
        }
      } catch (error) {
        console.error('Failed to load subcategories:', error)
      }
    }

    loadCategories()
    loadSubcategories()
  }, [])

  // Load prices
  useEffect(() => {
    async function loadPrices() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedSubcategory) {
          params.append('subcategory_id', selectedSubcategory.toString())
        } else if (selectedCategory) {
          params.append('category_id', selectedCategory.toString())
        }

        const res = await fetch(`/api/prices?${params}`)
        const data = await res.json()
        if (data.success) {
          setPrices(data.data)
        }
      } catch (error) {
        console.error('Failed to load prices:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPrices()
  }, [selectedCategory, selectedSubcategory])

  // Build price matrix
  const priceMatrix: PriceMatrix = {}
  const competitors = new Map<number, { id: number; name: string; region: string | null }>()

  prices.forEach((price) => {
    // Track unique competitors
    if (!competitors.has(price.competitor.id)) {
      competitors.set(price.competitor.id, price.competitor)
    }

    // Initialize procedure entry
    if (!priceMatrix[price.procedure.id]) {
      priceMatrix[price.procedure.id] = {
        procedure: price.procedure,
        prices: {}
      }
    }

    // Add price for this competitor
    priceMatrix[price.procedure.id].prices[price.competitor.id] = {
      regular_price: price.regular_price,
      event_price: price.event_price,
    }
  })

  // Find minimum prices for highlighting
  const getMinPrices = (procedureId: number) => {
    const procedureData = priceMatrix[procedureId]
    if (!procedureData) return { minRegular: Infinity, minEvent: Infinity }

    const regularPrices = Object.values(procedureData.prices)
      .map(p => p.regular_price ? parseFloat(p.regular_price) : Infinity)
      .filter(p => p !== Infinity)

    const eventPrices = Object.values(procedureData.prices)
      .map(p => p.event_price ? parseFloat(p.event_price) : Infinity)
      .filter(p => p !== Infinity)

    return {
      minRegular: regularPrices.length > 0 ? Math.min(...regularPrices) : Infinity,
      minEvent: eventPrices.length > 0 ? Math.min(...eventPrices) : Infinity
    }
  }

  const isMinPrice = (price: string | null, minPrice: number) => {
    if (!price || minPrice === Infinity) return false
    return parseFloat(price) === minPrice
  }

  const filteredSubcategories = selectedCategory
    ? subcategories.filter(s => s.category_id === selectedCategory)
    : subcategories

  const competitorArray = Array.from(competitors.values())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">가격 비교</h1>
        <p className="text-muted-foreground mt-2">
          경쟁사별 시술 가격을 비교하고 분석합니다
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
          <CardDescription>카테고리와 세부 카테고리로 필터링</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">카테고리</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedCategory || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : null
                  setSelectedCategory(value)
                  setSelectedSubcategory(null)
                }}
              >
                <option value="">전체</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">세부 카테고리</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedSubcategory || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : null
                  setSelectedSubcategory(value)
                }}
                disabled={!selectedCategory}
              >
                <option value="">전체</option>
                {filteredSubcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>가격 매트릭스</CardTitle>
          <CardDescription>
            시술별 경쟁사 가격 비교 (최저가는 초록색으로 표시됩니다)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : Object.keys(priceMatrix).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              표시할 가격 데이터가 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-background z-10">시술명</TableHead>
                    <TableHead className="w-[120px]">카테고리</TableHead>
                    {competitorArray.map(comp => (
                      <TableHead key={comp.id} className="text-center min-w-[140px]">
                        <div>{comp.name}</div>
                        {comp.region && (
                          <div className="text-xs text-muted-foreground font-normal">
                            {comp.region}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(priceMatrix).map(([procedureId, data]) => {
                    const minPrices = getMinPrices(parseInt(procedureId))
                    return (
                      <TableRow key={procedureId}>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">
                          <div>{data.procedure.name}</div>
                          {data.procedure.brand && (
                            <div className="text-xs text-muted-foreground">
                              {data.procedure.brand}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="text-xs">
                              {data.procedure.subcategory.category.name}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {data.procedure.subcategory.name}
                            </Badge>
                          </div>
                        </TableCell>
                        {competitorArray.map(comp => {
                          const priceData = data.prices[comp.id]
                          const hasRegularMin = priceData?.regular_price && isMinPrice(priceData.regular_price, minPrices.minRegular)
                          const hasEventMin = priceData?.event_price && isMinPrice(priceData.event_price, minPrices.minEvent)

                          return (
                            <TableCell key={comp.id} className="text-center">
                              {priceData ? (
                                <div className="flex flex-col gap-1">
                                  <div className={hasRegularMin ? 'text-green-600 font-semibold' : ''}>
                                    {formatPrice(priceData.regular_price)}
                                  </div>
                                  {priceData.event_price && (
                                    <div className={`text-sm ${hasEventMin ? 'text-green-600 font-semibold' : 'text-orange-600'}`}>
                                      이벤트: {formatPrice(priceData.event_price)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
