import { Router } from 'express'
import prisma from '../../db'
import AppEvents, { EVENTS } from '../../core/events'
import { generateObject } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'

const router = Router()

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || 'missing_key',
});

// GET /api/v1/workouts
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const workouts = await prisma.workout.findMany({
      where: { userId, isCurrent: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { exercises: { orderBy: { order: 'asc' } } }
    });
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workouts' })
  }
})

// GET /api/v1/workouts/current
router.get('/current', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const workout = await prisma.workout.findFirst({
      where: { userId, isCurrent: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { exercises: { orderBy: { order: 'asc' } } }
    })
    
    if (!workout) return res.status(404).json({ error: 'Current workout not found' })
    res.json(workout)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current workout' })
  }
})

// POST /api/v1/workouts/generate
router.post('/generate', async (req, res) => {
  try {
    const { userId, prompt, currentWorkoutId } = req.body;
    
    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are an elite AI personal trainer. 
Generate a comprehensive workout plan based on the user's prompt.
If currentWorkoutId is provided, base it on the existing workout and make the requested changes.
Return a structured JSON with title, duration (in minutes), description, goal, difficulty, equipment, targetMuscles (array), and exercises (array of objects with name, sets, reps, weight, restTime, notes).`,
      prompt: prompt,
      schema: z.object({
        title: z.string(),
        duration: z.string(),
        description: z.string().optional(),
        goal: z.string().optional(),
        difficulty: z.string().optional(),
        equipment: z.string().optional(),
        targetMuscles: z.string().optional(),
        exercises: z.array(z.object({
          name: z.string(),
          sets: z.number(),
          reps: z.number(),
          weight: z.string(),
          restTime: z.number(),
          notes: z.string().optional()
        })),
        aiExplanation: z.string().describe("A brief explanation of why this workout was generated and how it helps.")
      })
    });

    res.json(object);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate workout' });
  }
});

// POST /api/v1/workouts
router.post('/', async (req, res) => {
  try {
    const { userId, title, duration, description, goal, difficulty, equipment, targetMuscles, isFavorite, parentVersionId, exercises } = req.body;
    
    // If updating an existing workout template (version control)
    let versionNumber = 1;
    let actualParentId = parentVersionId;
    
    if (parentVersionId) {
      const parent = await prisma.workout.findUnique({ where: { id: parentVersionId } });
      if (parent) {
        versionNumber = parent.versionNumber + 1;
        // Mark old version as not current
        await prisma.workout.update({
          where: { id: parentVersionId },
          data: { isCurrent: false }
        });
      }
    }

    const workout = await prisma.workout.create({
      data: {
        userId, title, duration, description, goal, difficulty, equipment, targetMuscles, isFavorite,
        parentVersionId: actualParentId,
        versionNumber,
        isCurrent: true,
        exercises: {
          create: exercises.map((ex: any, idx: number) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restTime: ex.restTime || 60,
            notes: ex.notes,
            order: idx
          }))
        }
      },
      include: { exercises: true }
    });

    res.json(workout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save workout' });
  }
})

// GET /api/v1/workouts/versions/:id
router.get('/versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Find all workouts that share the same parentVersionId, or where id matches
    const current = await prisma.workout.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Not found' });
    
    const rootId = current.parentVersionId || current.id;
    const versions = await prisma.workout.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentVersionId: rootId }
        ]
      },
      orderBy: { versionNumber: 'desc' },
      include: { exercises: true }
    });
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// POST /api/v1/workouts/session/start
router.post('/session/start', async (req, res) => {
  try {
    const { userId, workoutId, title, exercises } = req.body;
    
    const session = await prisma.workoutSession.create({
      data: {
        userId,
        workoutId,
        title,
        status: 'IN_PROGRESS',
        exercises: {
          create: exercises.map((ex: any, idx: number) => ({
            name: ex.name,
            order: idx,
            sets: {
              create: Array.from({ length: ex.sets }).map((_, sIdx) => ({
                setNumber: sIdx + 1,
                reps: ex.reps,
                weight: parseFloat(ex.weight) || 0
              }))
            }
          }))
        }
      },
      include: { exercises: { include: { sets: true } } }
    });
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// POST /api/v1/workouts/session/complete
router.post('/session/complete', async (req, res) => {
  try {
    const { sessionId, duration, caloriesBurned, notes, completedSetIds } = req.body;
    
    const session = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        duration,
        caloriesBurned,
        notes
      }
    });

    if (completedSetIds && Array.isArray(completedSetIds) && completedSetIds.length > 0) {
      await prisma.workoutSessionSet.updateMany({
        where: { id: { in: completedSetIds } },
        data: { isCompleted: true }
      });
    }

    // Trigger Event-Driven Pipeline (Analytics, AI Recovery, etc)
    AppEvents.emit(EVENTS.WORKOUT_COMPLETED, { userId: session.userId, workoutId: session.workoutId, sessionId: session.id });

    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// GET /api/v1/workouts/history
router.get('/history', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const history = await prisma.workoutSession.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { endTime: 'desc' },
      include: { exercises: { include: { sets: true } } }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router
