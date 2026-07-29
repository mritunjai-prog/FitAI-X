import { Router, Request, Response } from 'express'
import prisma from '../../db'

const router = Router()

// GET /api/v1/notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || req.headers['x-user-id'] as string
    const notifications = await prisma.notification.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    res.json({ notifications: notifications || [] })
  } catch (error) {
    // If no Notification model or DB empty, return empty
    res.json({ notifications: [] })
  }
})

// POST /api/v1/notifications/:id/read
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    try {
      const notif = await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      })
      res.json({ success: true, notification: notif })
    } catch {
      res.status(404).json({ error: 'Notification not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

export default router
