'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CrawlConfig {
  id: number;
  competitor_id: number;
  crawl_type: string;
  target_url: string;
  schedule: string | null;
  frequency: string;
  is_active: boolean;
  last_crawled_at: Date | null;
  created_at: Date;
  competitor: {
    id: number;
    name: string;
  };
}

interface Competitor {
  id: number;
  name: string;
  website: string | null;
  region: string | null;
  type: string | null;
  is_active: boolean;
}

interface Stats {
  competitorCount: number;
  procedureCount: number;
  priceCount: number;
  alertCount: number;
  lastCrawlAt: Date | null;
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<CrawlConfig[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CrawlConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    competitor_id: '',
    crawl_type: 'WEBPAGE',
    target_url: '',
    schedule: '',
    frequency: 'DAILY',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configsRes, competitorsRes, statsRes] = await Promise.all([
        fetch('/api/settings/crawl-configs'),
        fetch('/api/competitors'),
        fetch('/api/settings/stats'),
      ]);

      const [configsData, competitorsData, statsData] = await Promise.all([
        configsRes.json(),
        competitorsRes.json(),
        statsRes.json(),
      ]);

      setConfigs(configsData);
      setCompetitors(competitorsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingConfig
        ? `/api/settings/crawl-configs/${editingConfig.id}`
        : '/api/settings/crawl-configs';

      const method = editingConfig ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          competitor_id: parseInt(formData.competitor_id),
        }),
      });

      if (response.ok) {
        await fetchData();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/settings/crawl-configs/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to delete config:', error);
    }
  };

  const handleEdit = (config: CrawlConfig) => {
    setEditingConfig(config);
    setFormData({
      competitor_id: config.competitor_id.toString(),
      crawl_type: config.crawl_type,
      target_url: config.target_url,
      schedule: config.schedule || '',
      frequency: config.frequency,
      is_active: config.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingConfig(null);
    setFormData({
      competitor_id: '',
      crawl_type: 'WEBPAGE',
      target_url: '',
      schedule: '',
      frequency: 'DAILY',
      is_active: true,
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-muted-foreground mt-2">시스템 설정 및 크롤링 관리</p>
      </div>

      <Tabs defaultValue="crawling" className="space-y-4">
        <TabsList>
          <TabsTrigger value="crawling">크롤링 설정</TabsTrigger>
          <TabsTrigger value="notifications">알림 설정</TabsTrigger>
          <TabsTrigger value="system">시스템 정보</TabsTrigger>
        </TabsList>

        <TabsContent value="crawling" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>크롤링 설정</CardTitle>
                  <CardDescription>경쟁사 데이터 수집 설정을 관리합니다</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      크롤링 설정 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingConfig ? '크롤링 설정 수정' : '크롤링 설정 추가'}
                      </DialogTitle>
                      <DialogDescription>
                        경쟁사 데이터 수집을 위한 설정을 입력하세요
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="competitor">경쟁사</Label>
                        <Select
                          value={formData.competitor_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, competitor_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="경쟁사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {competitors.map((competitor) => (
                              <SelectItem
                                key={competitor.id}
                                value={competitor.id.toString()}
                              >
                                {competitor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="crawl_type">크롤링 타입</Label>
                        <Select
                          value={formData.crawl_type}
                          onValueChange={(value) =>
                            setFormData({ ...formData, crawl_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WEBPAGE">웹페이지</SelectItem>
                            <SelectItem value="API">API</SelectItem>
                            <SelectItem value="PDF">PDF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="target_url">대상 URL</Label>
                        <Input
                          id="target_url"
                          value={formData.target_url}
                          onChange={(e) =>
                            setFormData({ ...formData, target_url: e.target.value })
                          }
                          placeholder="https://example.com/price-list"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="frequency">수집 주기</Label>
                        <Select
                          value={formData.frequency}
                          onValueChange={(value) =>
                            setFormData({ ...formData, frequency: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HOURLY">시간별</SelectItem>
                            <SelectItem value="DAILY">일별</SelectItem>
                            <SelectItem value="WEEKLY">주별</SelectItem>
                            <SelectItem value="MONTHLY">월별</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="schedule">스케줄 (Cron)</Label>
                        <Input
                          id="schedule"
                          value={formData.schedule}
                          onChange={(e) =>
                            setFormData({ ...formData, schedule: e.target.value })
                          }
                          placeholder="0 9 * * * (선택사항)"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) =>
                            setFormData({ ...formData, is_active: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="is_active">활성화</Label>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDialogOpenChange(false)}
                        >
                          취소
                        </Button>
                        <Button type="submit">
                          {editingConfig ? '수정' : '추가'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>경쟁사</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead>대상 URL</TableHead>
                    <TableHead>주기</TableHead>
                    <TableHead>마지막 수집</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        설정된 크롤링이 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {config.competitor.name}
                        </TableCell>
                        <TableCell>{config.crawl_type}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {config.target_url}
                        </TableCell>
                        <TableCell>{config.frequency}</TableCell>
                        <TableCell>
                          {config.last_crawled_at
                            ? format(new Date(config.last_crawled_at), 'PPp', { locale: ko })
                            : '없음'}
                        </TableCell>
                        <TableCell>
                          {config.is_active ? (
                            <Badge variant="default">
                              <Check className="mr-1 h-3 w-3" />
                              활성
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <X className="mr-1 h-3 w-3" />
                              비활성
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(config)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(config.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>이메일 및 알림 수신 설정</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">알림 이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="price_change"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="price_change">가격 변동 알림</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="new_competitor"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="new_competitor">신규 경쟁사 알림</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="crawl_error"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="crawl_error">크롤링 오류 알림</Label>
              </div>
              <Button>저장</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>시스템 정보</CardTitle>
              <CardDescription>데이터베이스 및 시스템 상태</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>경쟁사 수</CardDescription>
                    <CardTitle className="text-3xl">
                      {stats?.competitorCount || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>시술 항목 수</CardDescription>
                    <CardTitle className="text-3xl">
                      {stats?.procedureCount || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>가격 데이터 수</CardDescription>
                    <CardTitle className="text-3xl">
                      {stats?.priceCount || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>활성 알림 수</CardDescription>
                    <CardTitle className="text-3xl">
                      {stats?.alertCount || 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="space-y-2">
                <Label>마지막 동기화</Label>
                <div className="text-sm text-muted-foreground">
                  {stats?.lastCrawlAt
                    ? format(new Date(stats.lastCrawlAt), 'PPpp', { locale: ko })
                    : '동기화 기록 없음'}
                </div>
              </div>

              <div className="space-y-2">
                <Label>데이터베이스 연결</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    <Check className="mr-1 h-3 w-3" />
                    연결됨
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
