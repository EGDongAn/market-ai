'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface PriceHistory {
  id: number
  competitor_id: number | null
  procedure_id: number
  price_type: string
  old_price: string | null
  new_price: string
  change_percent: number | null
  changed_at: string
  competitor: {
    name: string
    region: string | null
  } | null
  procedure: {
    name: string
    brand: string | null
    subcategory: {
      name: string
      category: {
        name: string
      }
    }
  }
}

interface Competitor {
  id: number
  name: string
}

interface Procedure {
  id: number
  name: string
}

export default function PriceHistoryPage() {
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompetitor, setSelectedCompetitor] = useState<number | null>(null)
  const [selectedProcedure, setSelectedProcedure] = useState<number | null>(null)
  const [selectedPriceType, setSelectedPriceType] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Load competitors and procedures
  useEffect(() => {
    async function loadCompetitors() {
      try {
        const res = await fetch('/api/competitors')
        const data = await res.json()
        if (data.success) {
          setCompetitors(data.data)
        }
      } catch (error) {
        console.error('Failed to load competitors:', error)
      }
    }

    async function loadProcedures() {
      try {
        const res = await fetch('/api/procedures')
        const data = await res.json()
        if (data.success) {
          setProcedures(data.data)
        }
      } catch (error) {
        console.error('Failed to load procedures:', error)
      }
    }

    loadCompetitors()
    loadProcedures()
  }, [])

  // Load price history
  useEffect(() => {
    async function loadHistory() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedCompetitor) {
          params.append('competitor_id', selectedCompetitor.toString())
        }
        if (selectedProcedure) {
          params.append('procedure_id', selectedProcedure.toString())
        }
        if (selectedPriceType) {
          params.append('price_type', selectedPriceType)
        }
        if (startDate) {
          params.append('start_date', startDate)
        }
        if (endDate) {
          params.append('end_date', endDate)
        }

        const res = await fetch(`/api/prices/history?${params}`)
        const data = await res.json()
        if (data.success) {
          setHistory(data.data)
        }
      } catch (error) {
        console.error('Failed to load history:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [selectedCompetitor, selectedProcedure, selectedPriceType, startDate, endDate])

  const formatChangePercent = (percent: number | null) => {
    if (percent == null) return '-'
    const sign = percent > 0 ? '+' : ''
    return `${sign}${percent.toFixed(1)}%`
  }

  const getChangeColor = (percent: number | null) => {
    if (percent == null) return ''
    if (percent > 0) return 'text-red-600'
    if (percent < 0) return 'text-green-600'
    return ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">가격 변동 이력</h1>
        <p className="text-muted-foreground mt-2">
          시술 가격의 변동 내역을 추적합니다
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
          <CardDescription>경쟁사, 시술, 기간별로 필터링</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">경쟁사</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedCompetitor || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : null
                  setSelectedCompetitor(value)
                }}
              >
                <option value="">전체</option>
                {competitors.map(comp => (
                  <option key={comp.id} value={comp.id}>{comp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">시술</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedProcedure || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : null
                  setSelectedProcedure(value)
                }}
              >
                <option value="">전체</option>
                {procedures.map(proc => (
                  <option key={proc.id} value={proc.id}>{proc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">가격 유형</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedPriceType}
                onChange={(e) => setSelectedPriceType(e.target.value)}
              >
                <option value="">전체</option>
                <option value="regular">정상가</option>
                <option value="event">이벤트가</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">시작일</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">종료일</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>가격 변동 내역</CardTitle>
          <CardDescription>
            총 {history.length}개의 가격 변동 기록
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              표시할 가격 변동 이력이 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>변경일시</TableHead>
                  <TableHead>경쟁사</TableHead>
                  <TableHead>시술명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>가격 유형</TableHead>
                  <TableHead className="text-right">이전 가격</TableHead>
                  <TableHead className="text-right">변경 가격</TableHead>
                  <TableHead className="text-right">변동률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(record.changed_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                    </TableCell>
                    <TableCell>
                      <div>{record.competitor?.name || '우리병원'}</div>
                      {record.competitor?.region && (
                        <div className="text-xs text-muted-foreground">
                          {record.competitor.region}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{record.procedure.name}</div>
                      {record.procedure.brand && (
                        <div className="text-xs text-muted-foreground">
                          {record.procedure.brand}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="text-xs w-fit">
                          {record.procedure.subcategory.category.name}
                        </Badge>
                        <Badge variant="secondary" className="text-xs w-fit">
                          {record.procedure.subcategory.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.price_type === 'event' ? 'default' : 'outline'}>
                        {record.price_type === 'event' ? '이벤트' : '정상가'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(record.old_price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(record.new_price)}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getChangeColor(record.change_percent)}`}>
                      {formatChangePercent(record.change_percent)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
