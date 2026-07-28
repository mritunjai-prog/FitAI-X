import { Router } from 'express'
import prisma from '../../db'

const router = Router()

// GET /api/v1/calendar?userId=xxx
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    const events = await prisma.calendarEvent.findMany({
      where: { userId: String(userId), deletedAt: null },
      orderBy: { dayIndex: 'asc' }
    });
    res.json(events)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch calendar data' })
  }
})

// POST /api/v1/calendar — create an event
router.post('/', async (req, res) => {
  try {
    const { userId, dayIndex, title, intensity, type, description, exercises, workoutId } = req.body;
    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        dayIndex,
        title,
        intensity,
        description,
        exercises: exercises ? JSON.stringify(exercises) : null,
        workoutId,
        type: type || 'workout'
      }
    });
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
})

// POST /api/v1/calendar/manual — user manually adds a workout
router.post('/manual', async (req, res) => {
  try {
    const { userId, dayIndex, title, intensity, exercises } = req.body;

    if (!userId || dayIndex === undefined || !title) {
      return res.status(400).json({ error: 'userId, dayIndex, and title are required' });
    }

    // Upsert: delete existing events on that day first, then create
    await prisma.calendarEvent.deleteMany({ where: { userId, dayIndex } });

    const event = await prisma.calendarEvent.create({
      data: {
        userId,
        dayIndex,
        title,
        intensity: intensity || 'Moderate',
        description: `Custom workout added manually`,
        exercises: exercises ? JSON.stringify(exercises) : null,
        type: 'workout'
      }
    });
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add manual workout' });
  }
})

// PATCH /api/v1/calendar/:id — update event
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, intensity, description, exercises, dayIndex } = req.body;

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(intensity && { intensity }),
        ...(description && { description }),
        ...(dayIndex !== undefined && { dayIndex }),
        ...(exercises && { exercises: JSON.stringify(exercises) })
      }
    });
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update calendar event' });
  }
})

// DELETE /api/v1/calendar/:id — soft delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.calendarEvent.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete calendar event' });
  }
})

export default router
