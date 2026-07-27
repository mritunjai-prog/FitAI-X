import { Router } from 'express'
import prisma from '../../db'

const router = Router()

// GET /api/v1/calendar
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const events = await prisma.calendarEvent.findMany({
      where: userId ? { userId: String(userId) } : undefined,
      orderBy: { dayIndex: 'asc' }
    });
    res.json(events)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch calendar data' })
  }
})

// POST /api/v1/calendar
router.post('/', async (req, res) => {
  try {
    const { userId, dayIndex, title, intensity, type } = req.body;
    const event = await prisma.calendarEvent.create({
      data: { userId, dayIndex, title, intensity, type: type || 'workout' }
    });
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
})

export default router
