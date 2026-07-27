import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Mock in-memory notifications for development
let mockNotifications = [
  {
    id: uuidv4(),
    title: 'All Tasks Completed!',
    message: 'You have completed all your scheduled tasks for today. Great job!',
    type: 'system',
    createdAt: new Date().toISOString(),
    isRead: false
  },
  {
    id: uuidv4(),
    title: 'Workout Reminder',
    message: 'Time for your Upper Body Power session.',
    type: 'workout',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    isRead: false
  },
  {
    id: uuidv4(),
    title: 'Recovery Alert',
    message: 'Your recovery score dropped to 65%. Consider a rest day.',
    type: 'recovery',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    isRead: false
  },
  {
    id: uuidv4(),
    title: 'Weekly Report Ready',
    message: 'You crushed 4 workouts this week! View your full report.',
    type: 'system',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    isRead: true
  }
]

// GET /api/v1/notifications
router.get('/', (req: Request, res: Response) => {
  try {
    // Return notifications sorted by newest first
    const sorted = [...mockNotifications].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    res.json({ notifications: sorted })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// POST /api/v1/notifications/:id/read
router.post('/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const notif = mockNotifications.find(n => n.id === id)
    if (notif) {
      notif.isRead = true
      res.json({ success: true, notification: notif })
    } else {
      res.status(404).json({ error: 'Notification not found' })
    }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

export default router
