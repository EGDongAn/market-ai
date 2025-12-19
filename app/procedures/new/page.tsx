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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

interface Category {
  id: number
  name: string
  subcategories: Subcategory[]
}

interface Subcategory {
  id: number
  name: string
  category_id: number
}

export default function NewProcedurePage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [formData, setFormData] = useState({
    subcategory_id: '',
    name: '',
    aliases: '',
    brand: '',
    unit: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
    setFormData({ ...formData, subcategory_id: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subcategory_id || !formData.name) {
      alert('카테고리와 시술명은 필수입니다.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/procedures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        router.push('/procedures')
      } else {
        const error = await response.json()
        alert(error.error || '시술 추가에 실패했습니다.')
      }
    } catch (error) {
      console.error('Failed to create procedure:', error)
      alert('시술 추가에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const currentCategory = categories.find(c => c.id.toString() === selectedCategory)
  const subcategories = currentCategory?.subcategories || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/procedures">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-green-800">새 시술 추가</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>시술 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">세부 카테고리 *</Label>
                <Select
                  value={formData.subcategory_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, subcategory_id: value })
                  }
                  disabled={!selectedCategory}
                >
                  <SelectTrigger id="subcategory">
                    <SelectValue placeholder="세부 카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">시술명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="시술명 입력"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="aliases">별칭 (쉼표로 구분)</Label>
                <Input
                  id="aliases"
                  value={formData.aliases}
                  onChange={(e) => setFormData({ ...formData, aliases: e.target.value })}
                  placeholder="별칭1, 별칭2, 별칭3"
                />
                <p className="text-sm text-gray-500">
                  여러 개의 별칭을 입력할 경우 쉼표(,)로 구분하세요.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">브랜드</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="브랜드 입력"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">단위</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="예: 1회, 1병, 1vial"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/procedures">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={submitting}
              >
                {submitting ? '저장 중...' : '저장'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
