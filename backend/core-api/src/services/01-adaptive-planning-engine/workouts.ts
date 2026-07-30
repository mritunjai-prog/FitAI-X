import { Router } from 'express'
import prisma from '../../db'
import AppEvents, { EVENTS } from '../../core/events'
import { z } from 'zod'
import { callAI, buildUserContext } from '../ai/aiService'
import { awardXp, updateStreak } from '../xp/xpService'

const router = Router()

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
    
    if (!workout) return res.json(null)
    res.json(workout)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current workout' })
  }
})

// POST /api/v1/workouts/generate
router.post('/generate', async (req, res) => {
  try {
    const { userId, prompt, currentWorkoutId } = req.body;
    const userContext = await buildUserContext(userId);

    const schema = z.object({
      title: z.string(),
      duration: z.string(),
      description: z.string().optional(),
      goal: z.string().optional(),
      difficulty: z.string().optional(),
      equipment: z.string().optional(),
      targetMuscles: z.string().optional(),
      exercises: z.array(z.object({
        name: z.string(),
        muscleGroup: z.string(),
        sets: z.number(),
        reps: z.number(),
        weight: z.string(),
        restTime: z.number(),
        notes: z.string().optional(),
        status: z.string().default("pending")
      })),
      aiExplanation: z.string().describe("A brief explanation of why this workout was generated and how it helps.")
    });

    const aiResult = await callAI({
      system: `You are an elite AI personal trainer. 
Generate a comprehensive workout plan based on the user's prompt and profile.
Ensure to avoid or reduce volume for any muscle groups flagged as HIGH risk in the user's recovery flags.
If currentWorkoutId is provided, base it on the existing workout and make the requested changes.
Return a structured JSON.`,
      prompt: `Prompt: ${prompt}\n\nContext: ${JSON.stringify(userContext)}`,
      schema
    });

    if (!aiResult.ok || !aiResult.data) {
      console.error('[AI] Generation failed, using fallback:', aiResult.error);
      return res.json({
        title: "Fallback Full Body",
        duration: "30 mins",
        exercises: [
          { name: "Pushups", muscleGroup: "Chest", reps: 10, sets: 3, weight: "Bodyweight", restTime: 60, status: "pending", notes: "Fallback exercise" },
          { name: "Squats", muscleGroup: "Legs", reps: 15, sets: 3, weight: "Bodyweight", restTime: 60, status: "pending", notes: "Fallback exercise" }
        ],
        aiExplanation: "Generated using a safe fallback routine due to an AI service interruption."
      });
    }

    res.json(aiResult.data);
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
            weight: String(ex.weight), // fix 500: cast to string for prisma schema
            restTime: ex.restTime || 60,
            notes: ex.notes,
            setsData: ex.setsData ? JSON.stringify(ex.setsData) : null,
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
    const { sessionId, userId, workoutId, title, duration, caloriesBurned, notes, exercises } = req.body;
    
    let session;
    if (sessionId) {
      session = await prisma.workoutSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
          duration,
          caloriesBurned,
          notes
        }
      });
    } else {
      // Create session entirely from scratch since it was never fully started or synced
      session = await prisma.workoutSession.create({
        data: {
          userId,
          workoutId,
          title: title || 'Completed Workout',
          status: 'COMPLETED',
          endTime: new Date(),
          duration,
          caloriesBurned,
          notes
        }
      });
    }

    const actualSessionId = session.id;

    if (exercises && Array.isArray(exercises)) {
      // Clear out the pre-created exercises for this session (if any)
      await prisma.workoutSessionExercise.deleteMany({
        where: { sessionId: actualSessionId }
      });
      
      // Re-create them with the exact data performed by the user
      for (const [idx, ex] of exercises.entries()) {
        await prisma.workoutSessionExercise.create({
          data: {
            sessionId: actualSessionId,
            name: ex.name,
            order: idx,
            sets: {
              create: (ex.setsData || []).map((s: any, sIdx: number) => ({
                setNumber: sIdx + 1,
                reps: s.reps || ex.reps,
                weight: parseFloat(s.weight) || 0,
                isCompleted: s.completed === true
              }))
            }
          }
        });
      }
    }

    // ── AUTO: Award XP for completing workout ──
    let xpResult = null;
    let streakResult = null;
    try {
      xpResult = await awardXp(session.userId, 'workout_completed', `Completed: ${session.title}`);
      
      // Streak bonus for consecutive days
      streakResult = await updateStreak(session.userId);
      if (streakResult.streakContinued && streakResult.currentStreak > 1) {
        await awardXp(session.userId, 'workout_streak', `${streakResult.currentStreak} day streak!`);
      }
    } catch (xpErr) {
      console.warn('[XP/Streak] Non-critical error:', xpErr);
    }

    // ── AUTO: Update recovery score ──
    try {
      const vitals = await prisma.vitals.findUnique({ where: { userId: session.userId } });
      if (vitals) {
        await prisma.vitals.update({
          where: { userId: session.userId },
          data: {
            recoveryCor: Math.max(0.2, (vitals.recoveryCor || 0.5) - 0.08),
            bodyBattery: Math.max(0.1, (vitals.bodyBattery || 0.5) - 0.12),
          }
        });
      }
    } catch (recErr) {
      console.warn('[Recovery] Update error:', recErr);
    }

    // ── AUTO: Post to social feed ──
    try {
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      await prisma.feedItem.create({
        data: {
          userId: session.userId,
          type: 'workout',
          message: `Completed "${session.title}" workout · ${duration || '?'} min · 🔥`,
          timeStr: 'Just now',
        }
      });
    } catch (feedErr) {
      console.warn('[Feed] Error:', feedErr);
    }

    // Trigger Event-Driven Pipeline (Analytics, AI Recovery, etc)
    AppEvents.emit(EVENTS.WORKOUT_COMPLETED, { userId: session.userId, workoutId: session.workoutId, sessionId: session.id });

    res.json({
      session,
      xpAwarded: xpResult?.xpAwarded || 0,
      totalXp: xpResult?.totalXp || 0,
      level: xpResult?.level || 1,
      newBadge: xpResult?.newBadge || null,
      currentStreak: streakResult?.currentStreak || 0,
      streakContinued: streakResult?.streakContinued || false,
    });
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
    res.status(500).json({ error: 'Failed to record PR' })
  }
})

// POST /api/v1/workouts/manual
router.post('/manual', async (req, res) => {
  try {
    const { userId, title, duration, description, exercises } = req.body;
    
    // Deactivate previous current workouts
    await prisma.workout.updateMany({
      where: { userId, isCurrent: true },
      data: { isCurrent: false }
    });

    const newWorkout = await prisma.workout.create({
      data: {
        userId,
        title,
        duration,
        description,
        isCurrent: true,
        aiExplanation: "Manually created by user",
        exercises: {
          create: exercises.map((ex: any, i: number) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: String(ex.weight), // fix 500: cast to string
            restTime: ex.restTime,
            notes: ex.notes,
            muscleGroup: ex.muscleGroup,
            status: "pending",
            order: i
          }))
        }
      },
      include: { exercises: { orderBy: { order: 'asc' } } }
    });

    res.json(newWorkout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save manual workout' });
  }
});

// PATCH /api/v1/workouts/:id/exercises/:exId/status
router.patch('/:id/exercises/:exId/status', async (req, res) => {
  try {
    const { id, exId } = req.params;
    const { status } = req.body; // "done" | "skipped"

    const ex = await prisma.exercise.update({
      where: { id: exId, workoutId: id },
      data: { status }
    });

    // Check if all exercises are done or skipped
    const allExercises = await prisma.exercise.findMany({
      where: { workoutId: id }
    });

    const allCompleted = allExercises.every(e => e.status === 'done' || e.status === 'skipped');

    if (allCompleted) {
      // Find workout to get duration
      const w = await prisma.workout.findUnique({ where: { id } });
      const durationMins = w ? parseInt(w.duration) || 30 : 30;

      // Trigger streak evaluation in background via BullMQ
      AppEvents.emit(EVENTS.AI.PLAN_GENERATION_REQUESTED, {
        userId: w?.userId,
        action: 'evaluate_streak',
        durationMinutes: durationMins,
        scheduledDay: true
      });
    }

    res.json({ exercise: ex, allCompleted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update exercise status' });
  }
});

// PATCH /api/v1/workouts/:id/exercises/:exId
router.patch('/:id/exercises/:exId', async (req, res) => {
  try {
    const { id, exId } = req.params;
    const { name, sets, reps, weight, restTime, notes, muscleGroup } = req.body;

    const updatedExercise = await prisma.exercise.update({
      where: { id: exId, workoutId: id },
      data: {
        ...(name !== undefined && { name }),
        ...(sets !== undefined && { sets }),
        ...(reps !== undefined && { reps }),
        ...(weight !== undefined && { weight }),
        ...(restTime !== undefined && { restTime }),
        ...(notes !== undefined && { notes }),
        ...(muscleGroup !== undefined && { muscleGroup }),
      }
    });

    res.json(updatedExercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

export default router
