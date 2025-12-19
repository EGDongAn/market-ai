'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Scissors,
  TrendingUp,
  Bell,
  ArrowRight,
  Plus,
} from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">대시보드</h1>
          <p className="text-gray-600 mt-1">경쟁사 가격 분석 및 마케팅 인텔리전스</p>
        </div>
        <div className="flex gap-2">
          <Link href="/competitors/new">
            <Button variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              경쟁사 추가
            </Button>
          </Link>
          <Link href="/procedures/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              시술 추가
            </Button>
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">등록 경쟁사</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              활성 경쟁사 0개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">등록 시술</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              가격 정보 0건
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">가격 변동</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              이번 주 변동 없음
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">알림</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              미확인 알림 없음
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 시작 가이드 */}
      <Card>
        <CardHeader>
          <CardTitle>시작하기</CardTitle>
          <CardDescription>경쟁사 가격 분석 시스템 사용법</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/competitors/new" className="block">
              <div className="p-4 border rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <h3 className="font-medium">경쟁사 등록</h3>
                </div>
                <p className="text-sm text-gray-600">
                  모니터링할 경쟁 병원을 등록하세요.
                </p>
              </div>
            </Link>
            <Link href="/procedures/new" className="block">
              <div className="p-4 border rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <h3 className="font-medium">시술 등록</h3>
                </div>
                <p className="text-sm text-gray-600">
                  비교할 시술 항목을 등록하세요.
                </p>
              </div>
            </Link>
            <Link href="/prices" className="block">
              <div className="p-4 border rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <h3 className="font-medium">가격 비교</h3>
                </div>
                <p className="text-sm text-gray-600">
                  경쟁사 가격을 비교 분석하세요.
                </p>
              </div>
            </Link>
            <Link href="/packages/suggest" className="block">
              <div className="p-4 border rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </span>
                  <h3 className="font-medium">패키지 제안</h3>
                </div>
                <p className="text-sm text-gray-600">
                  AI가 경쟁력 있는 패키지를 제안합니다.
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">최근 가격 변동</CardTitle>
            <Link href="/prices/history">
              <Button variant="ghost" size="sm">
                전체 보기 <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              가격 변동 기록이 없습니다.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">AI 패키지 제안</CardTitle>
            <Link href="/packages/suggest">
              <Button variant="ghost" size="sm">
                전체 보기 <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              데이터가 충분하면 AI가 패키지를 제안합니다.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
