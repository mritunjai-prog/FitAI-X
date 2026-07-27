import { Router } from 'express'
import prisma from '../../db'

const router = Router()

// GET /api/v1/calendar
router.get('/', async (req, res) => {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { dayIndex: 'asc' }
    });
    res.json(events)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch calendar data' })
  }
})

export default router
