'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'

interface Competitor {
  id: number
  name: string
}

interface Procedure {
  id: number
  name: string
}

export default function NewAlertPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])

  const [formData, setFormData] = useState({
    name: '',
    alert_type: '',
    competitor_id: '',
    procedure_id: '',
    threshold: '',
    threshold_type: '',
    notify_email: '',
  })

  useEffect(() => {
    fetchCompetitors()
    fetchProcedures()
  }, [])

  const fetchCompetitors = async () => {
    try {
      const response = await fetch('/api/competitors')
      const data = await response.json()
      setCompetitors(data)
    } catch (error) {
      console.error('Failed to fetch competitors:', error)
    }
  }

  const fetchProcedures = async () => {
    try {
      const response = await fetch('/api/procedures')
      const data = await response.json()
      setProcedures(data)
    } catch (error) {
      console.error('Failed to fetch procedures:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        name: formData.name,
        alert_type: formData.alert_type,
        competitor_id: formData.competitor_id ? parseInt(formData.competitor_id) : null,
        procedure_id: formData.procedure_id ? parseInt(formData.procedure_id) : null,
        threshold: formData.threshold ? parseFloat(formData.threshold) : null,
        threshold_type: formData.threshold_type || null,
        notify_email: formData.notify_email || null,
        is_active: true,
      }

      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.push('/alerts')
      } else {
        const error = await response.json()
        alert('오류: ' + (error.message || '알림 생성에 실패했습니다'))
      }
    } catch (error) {
      console.error('Failed to create alert:', error)
      alert('알림 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const alertTypes = [
    { value: 'PRICE_DROP', label: '가격 하락' },
    { value: 'PRICE_INCREASE', label: '가격 상승' },
    { value: 'PRICE_CHANGE', label: '가격 변동' },
    { value: 'NEW_COMPETITOR', label: '신규 경쟁사' },
    { value: 'COMPETITOR_UPDATE', label: '경쟁사 업데이트' },
  ]

  const thresholdTypes = [
    { value: 'PERCENT', label: '퍼센트 (%)' },
    { value: 'ABSOLUTE', label: '절대값 (원)' },
  ]

  const requiresThreshold = ['PRICE_DROP', 'PRICE_INCREASE', 'PRICE_CHANGE'].includes(
    formData.alert_type
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/alerts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">알림 규칙 추가</h1>
          <p className="text-gray-600 mt-1">새로운 알림 규칙을 생성합니다</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>알림 규칙 정보</CardTitle>
          <CardDescription>알림 조건과 알림 방법을 설정하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">알림 이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 보톡스 가격 하락 알림"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert_type">알림 유형 *</Label>
              <Select
                value={formData.alert_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, alert_type: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="알림 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {alertTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="competitor_id">경쟁사 (선택)</Label>
                <Select
                  value={formData.competitor_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, competitor_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체</SelectItem>
                    {competitors.map((competitor) => (
                      <SelectItem key={competitor.id} value={competitor.id.toString()}>
                        {competitor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="procedure_id">시술 (선택)</Label>
                <Select
                  value={formData.procedure_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, procedure_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체</SelectItem>
                    {procedures.map((procedure) => (
                      <SelectItem key={procedure.id} value={procedure.id.toString()}>
                        {procedure.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {requiresThreshold && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="threshold">임계값</Label>
                  <Input
                    id="threshold"
                    type="number"
                    step="0.01"
                    value={formData.threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, threshold: e.target.value })
                    }
                    placeholder="예: 10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="threshold_type">임계값 유형</Label>
                  <Select
                    value={formData.threshold_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, threshold_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {thresholdTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notify_email">알림 이메일</Label>
              <Input
                id="notify_email"
                type="email"
                value={formData.notify_email}
                onChange={(e) =>
                  setFormData({ ...formData, notify_email: e.target.value })
                }
                placeholder="example@hospital.com"
              />
              <p className="text-sm text-gray-500">
                이메일을 입력하면 알림이 발생할 때 이메일로도 통지됩니다
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? '저장 중...' : '저장'}
              </Button>
              <Link href="/alerts">
                <Button type="button" variant="outline">
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
