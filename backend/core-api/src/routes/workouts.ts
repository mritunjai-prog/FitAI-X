import { Router } from 'express'
import prisma from '../db'

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

export default router
