import { Router } from 'express';
import prisma from '../../db';
import { calculateMuscleFatigue } from './graph';

const router = Router();

// GET /api/v1/exercise-graph/fatigue/:userId
router.get('/fatigue/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Fetch user's workouts from the last 72 hours
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    
    const recentWorkouts = await prisma.workout.findMany({
      where: {
        userId,
        createdAt: { gte: seventyTwoHoursAgo },
        deletedAt: null
      },
      include: {
        exercises: true
      }
    });

    // 2. Flatten into a list of completed exercises
    const recentExercises = recentWorkouts.flatMap(w => 
      w.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        completedAt: w.createdAt // Using workout createdAt as completion time for simplicity
      }))
    );

    // 3. Run through the graph engine
    const fatigue = calculateMuscleFatigue(recentExercises, new Date());

    res.json({ fatigue, recentExercises: recentExercises.length });
  } catch (error) {
    console.error('Error calculating fatigue:', error);
    res.status(500).json({ error: 'Failed to calculate muscle fatigue' });
  }
});

export default router;
