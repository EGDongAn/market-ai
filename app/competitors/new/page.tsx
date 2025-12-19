'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewCompetitorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    region: '',
    type: '',
    crawl_priority: '5',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          website: formData.website || null,
          region: formData.region || null,
          type: formData.type || null,
          crawl_priority: parseInt(formData.crawl_priority),
        }),
      })

      if (response.ok) {
        router.push('/competitors')
      } else {
        const error = await response.json()
        alert(error.error || '경쟁사 추가에 실패했습니다.')
      }
    } catch (error) {
      console.error('경쟁사 추가 실패:', error)
      alert('경쟁사 추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/competitors">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">새 경쟁사 추가</h1>
          <p className="text-gray-600 mt-1">모니터링할 경쟁 병원을 등록합니다</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>경쟁사 정보</CardTitle>
          <CardDescription>경쟁사의 기본 정보를 입력해주세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                병원명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="예: 서울 피부과"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">웹사이트</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="region">지역</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({ ...formData, region: value })}
                >
                  <SelectTrigger id="region">
                    <SelectValue placeholder="지역 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="서울">서울</SelectItem>
                    <SelectItem value="경기">경기</SelectItem>
                    <SelectItem value="인천">인천</SelectItem>
                    <SelectItem value="부산">부산</SelectItem>
                    <SelectItem value="대구">대구</SelectItem>
                    <SelectItem value="대전">대전</SelectItem>
                    <SelectItem value="광주">광주</SelectItem>
                    <SelectItem value="울산">울산</SelectItem>
                    <SelectItem value="세종">세종</SelectItem>
                    <SelectItem value="강원">강원</SelectItem>
                    <SelectItem value="충북">충북</SelectItem>
                    <SelectItem value="충남">충남</SelectItem>
                    <SelectItem value="전북">전북</SelectItem>
                    <SelectItem value="전남">전남</SelectItem>
                    <SelectItem value="경북">경북</SelectItem>
                    <SelectItem value="경남">경남</SelectItem>
                    <SelectItem value="제주">제주</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">병원 유형</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="피부과">피부과</SelectItem>
                    <SelectItem value="성형외과">성형외과</SelectItem>
                    <SelectItem value="치과">치과</SelectItem>
                    <SelectItem value="한의원">한의원</SelectItem>
                    <SelectItem value="안과">안과</SelectItem>
                    <SelectItem value="정형외과">정형외과</SelectItem>
                    <SelectItem value="비뇨기과">비뇨기과</SelectItem>
                    <SelectItem value="산부인과">산부인과</SelectItem>
                    <SelectItem value="내과">내과</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="crawl_priority">크롤링 우선순위</Label>
              <Select
                value={formData.crawl_priority}
                onValueChange={(value) => setFormData({ ...formData, crawl_priority: value })}
              >
                <SelectTrigger id="crawl_priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (매우 낮음)</SelectItem>
                  <SelectItem value="2">2 (낮음)</SelectItem>
                  <SelectItem value="3">3 (보통 이하)</SelectItem>
                  <SelectItem value="4">4 (보통 이상)</SelectItem>
                  <SelectItem value="5">5 (보통)</SelectItem>
                  <SelectItem value="6">6 (높음)</SelectItem>
                  <SelectItem value="7">7 (매우 높음)</SelectItem>
                  <SelectItem value="8">8 (최우선)</SelectItem>
                  <SelectItem value="9">9 (긴급)</SelectItem>
                  <SelectItem value="10">10 (즉시)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                높을수록 더 자주 가격 정보를 수집합니다
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? '저장 중...' : '경쟁사 추가'}
              </Button>
              <Link href="/competitors">
                <Button type="button" variant="outline" disabled={loading}>
                  취소
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
