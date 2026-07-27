import { Router } from 'express'
import prisma from '../../db'
import AppEvents, { EVENTS } from '../../core/events'

const router = Router()

// GET /api/v1/workouts/current
router.get('/current', async (req, res) => {
  try {
    const workout = await prisma.workout.findFirst({
      include: { exercises: true }
    })
    
    if (!workout) {
      return res.status(404).json({ error: 'Current workout not found' })
    }
    
    res.json(workout)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current workout' })
  }
})

// POST /api/v1/workouts
router.post('/', async (req, res) => {
  try {
    const { title, duration, exercises, userId } = req.body;
    
    const workout = await prisma.workout.create({
      data: {
        userId: userId,
        title: title,
        duration: duration,
        exercises: {
          create: exercises.map((ex: any) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight
          }))
        }
      },
      include: {
        exercises: true
      }
    });

    // Trigger Event-Driven Pipeline (FR-026)
    AppEvents.emit(EVENTS.WORKOUT_COMPLETED, { userId, workoutId: workout.id });

    res.json(workout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save workout' });
  }
})

export default router
