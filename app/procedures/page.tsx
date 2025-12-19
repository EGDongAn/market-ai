'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

interface Procedure {
  id: number
  name: string
  aliases: string[] | null
  brand: string | null
  unit: string | null
  subcategory: {
    id: number
    name: string
    category: {
      id: number
      name: string
    }
  }
}

export default function ProceduresPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [procedureToDelete, setProcedureToDelete] = useState<number | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  const fetchProcedures = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/procedures'
      const params = new URLSearchParams()

      if (selectedSubcategory !== 'all') {
        params.append('subcategoryId', selectedSubcategory)
      } else if (selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory)
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()
      setProcedures(data)
    } catch (error) {
      console.error('Failed to fetch procedures:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedSubcategory])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchProcedures()
  }, [fetchProcedures])

  const handleDeleteClick = (id: number) => {
    setProcedureToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!procedureToDelete) return

    try {
      const response = await fetch(`/api/procedures/${procedureToDelete}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchProcedures()
        setDeleteDialogOpen(false)
        setProcedureToDelete(null)
      }
    } catch (error) {
      console.error('Failed to delete procedure:', error)
    }
  }

  const currentCategory = categories.find(c => c.id.toString() === selectedCategory)
  const subcategories = currentCategory?.subcategories || []

  // Group procedures by category and subcategory for tabs view
  const proceduresByCategory = categories.map(category => ({
    category,
    subcategories: category.subcategories.map(subcategory => ({
      subcategory,
      procedures: procedures.filter(p => p.subcategory.id === subcategory.id)
    })).filter(s => s.procedures.length > 0)
  })).filter(c => c.subcategories.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-green-800">시술 관리</h1>
        <Link href="/procedures/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            새 시술 추가
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>시술 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={selectedCategory} onValueChange={(value) => {
                  setSelectedCategory(value)
                  setSelectedSubcategory('all')
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 카테고리</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select
                  value={selectedSubcategory}
                  onValueChange={setSelectedSubcategory}
                  disabled={selectedCategory === 'all'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="세부 카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 세부 카테고리</SelectItem>
                    {subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
              <TabsList>
                <TabsTrigger value="list">목록형</TabsTrigger>
                <TabsTrigger value="hierarchy">계층형</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">로딩 중...</div>
                ) : procedures.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">시술이 없습니다.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>카테고리</TableHead>
                        <TableHead>세부 카테고리</TableHead>
                        <TableHead>시술명</TableHead>
                        <TableHead>별칭</TableHead>
                        <TableHead>브랜드</TableHead>
                        <TableHead>단위</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedures.map((procedure) => (
                        <TableRow key={procedure.id}>
                          <TableCell>{procedure.subcategory.category.name}</TableCell>
                          <TableCell>{procedure.subcategory.name}</TableCell>
                          <TableCell className="font-medium">{procedure.name}</TableCell>
                          <TableCell>
                            {procedure.aliases && Array.isArray(procedure.aliases)
                              ? procedure.aliases.join(', ')
                              : '-'}
                          </TableCell>
                          <TableCell>{procedure.brand || '-'}</TableCell>
                          <TableCell>{procedure.unit || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/procedures/${procedure.id}`}>
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(procedure.id)}
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
              </TabsContent>

              <TabsContent value="hierarchy" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">로딩 중...</div>
                ) : proceduresByCategory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">시술이 없습니다.</div>
                ) : (
                  <div className="space-y-6">
                    {proceduresByCategory.map(({ category, subcategories }) => (
                      <div key={category.id} className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-green-800 mb-4">
                          {category.name}
                        </h3>
                        <div className="space-y-4">
                          {subcategories.map(({ subcategory, procedures }) => (
                            <div key={subcategory.id} className="ml-4">
                              <h4 className="text-md font-medium text-gray-700 mb-2">
                                {subcategory.name}
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>시술명</TableHead>
                                    <TableHead>별칭</TableHead>
                                    <TableHead>브랜드</TableHead>
                                    <TableHead>단위</TableHead>
                                    <TableHead className="text-right">작업</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {procedures.map((procedure) => (
                                    <TableRow key={procedure.id}>
                                      <TableCell className="font-medium">
                                        {procedure.name}
                                      </TableCell>
                                      <TableCell>
                                        {procedure.aliases && Array.isArray(procedure.aliases)
                                          ? procedure.aliases.join(', ')
                                          : '-'}
                                      </TableCell>
                                      <TableCell>{procedure.brand || '-'}</TableCell>
                                      <TableCell>{procedure.unit || '-'}</TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                          <Link href={`/procedures/${procedure.id}`}>
                                            <Button variant="outline" size="sm">
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                          </Link>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteClick(procedure.id)}
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>시술 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 시술을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
