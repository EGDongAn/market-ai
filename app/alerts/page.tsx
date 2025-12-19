'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Bell, BellOff, Edit, Trash2, Check } from 'lucide-react'

interface Alert {
  id: number
  name: string
  alert_type: string
  competitor_id: number | null
  procedure_id: number | null
  threshold: number | null
  threshold_type: string | null
  notify_email: string | null
  is_active: boolean
  created_at: string
}

interface Notification {
  id: number
  alert_id: number
  title: string
  message: string
  data: unknown
  is_read: boolean
  sent_at: string
  alert?: {
    name: string
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [activeTab, setActiveTab] = useState('settings')

  useEffect(() => {
    fetchAlerts()
    fetchNotifications()
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      const data = await response.json()
      setAlerts(data)
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/alerts/notifications')
      const data = await response.json()
      setNotifications(data)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedAlert) return

    try {
      const response = await fetch(`/api/alerts/${selectedAlert.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setAlerts(alerts.filter((a) => a.id !== selectedAlert.id))
        setDeleteDialogOpen(false)
        setSelectedAlert(null)
      }
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  const handleToggleActive = async (alert: Alert) => {
    try {
      const response = await fetch(`/api/alerts/${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !alert.is_active }),
      })

      if (response.ok) {
        const updated = await response.json()
        setAlerts(alerts.map((a) => (a.id === alert.id ? updated : a)))
      }
    } catch (error) {
      console.error('Failed to toggle alert:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const response = await fetch('/api/alerts/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId }),
      })

      if (response.ok) {
        setNotifications(
          notifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        )
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PRICE_DROP: '가격 하락',
      PRICE_INCREASE: '가격 상승',
      NEW_COMPETITOR: '신규 경쟁사',
      PRICE_CHANGE: '가격 변동',
      COMPETITOR_UPDATE: '경쟁사 업데이트',
    }
    return labels[type] || type
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">알림 관리</h1>
          <p className="text-gray-600 mt-1">가격 및 경쟁사 변동 알림 설정</p>
        </div>
        <Link href="/alerts/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            알림 규칙 추가
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">알림 설정</TabsTrigger>
          <TabsTrigger value="notifications">
            알림 내역
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>알림 규칙</CardTitle>
              <CardDescription>
                가격 변동 및 경쟁사 업데이트를 추적하는 규칙을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  설정된 알림 규칙이 없습니다
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상태</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>임계값</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(alert)}
                          >
                            {alert.is_active ? (
                              <Bell className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <BellOff className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{alert.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {alert.threshold && alert.threshold_type
                            ? `${alert.threshold}${
                                alert.threshold_type === 'PERCENT' ? '%' : '원'
                              }`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {alert.notify_email || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/alerts/${alert.id}`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAlert(alert)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>알림 내역</CardTitle>
              <CardDescription>
                발생한 알림 내역을 확인할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  알림 내역이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border ${
                        notification.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{notification.title}</h4>
                            {!notification.is_read && (
                              <Badge variant="default" className="bg-blue-600">
                                NEW
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              {new Date(notification.sent_at).toLocaleString('ko-KR')}
                            </span>
                            {notification.alert && (
                              <span>규칙: {notification.alert.name}</span>
                            )}
                          </div>
                        </div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>알림 규칙 삭제</DialogTitle>
            <DialogDescription>
              정말로 &quot;{selectedAlert?.name}&quot; 알림 규칙을 삭제하시겠습니까? 이 작업은
              되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
