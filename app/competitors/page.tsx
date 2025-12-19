'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'

interface Competitor {
  id: number
  name: string
  website: string | null
  region: string | null
  type: string | null
  is_active: boolean
  crawl_priority: number
  created_at: string
  updated_at: string
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompetitors()
  }, [])

  const fetchCompetitors = async () => {
    try {
      const response = await fetch('/api/competitors')
      const data = await response.json()
      setCompetitors(data)
    } catch (error) {
      console.error('경쟁사 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" 경쟁사를 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/competitors/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCompetitors(competitors.filter((c) => c.id !== id))
      } else {
        alert('삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('경쟁사 삭제 실패:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">경쟁사 관리</h1>
          <p className="text-gray-600 mt-1">모니터링할 경쟁 병원을 관리합니다</p>
        </div>
        <Link href="/competitors/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            새 경쟁사 추가
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            등록된 경쟁사
          </CardTitle>
          <CardDescription>
            총 {competitors.length}개의 경쟁사가 등록되어 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : competitors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              등록된 경쟁사가 없습니다. 새 경쟁사를 추가해주세요.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>웹사이트</TableHead>
                  <TableHead>지역</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>크롤링 우선순위</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((competitor) => (
                  <TableRow key={competitor.id}>
                    <TableCell className="font-medium">{competitor.name}</TableCell>
                    <TableCell>
                      {competitor.website ? (
                        <a
                          href={competitor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline"
                        >
                          {competitor.website}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{competitor.region || '-'}</TableCell>
                    <TableCell>{competitor.type || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={competitor.is_active ? 'default' : 'secondary'}>
                        {competitor.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{competitor.crawl_priority}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/competitors/${competitor.id}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(competitor.id, competitor.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
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
