import client from './client'

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  createdAt: string
  isRead: boolean
}

export const fetchNotifications = async (): Promise<Notification[]> => {
  const { data } = await client.get('/notifications')
  return data.notifications
}

export const markNotificationAsRead = async (id: string): Promise<Notification> => {
  const { data } = await client.post(`/notifications/${id}/read`)
  return data.notification
}
