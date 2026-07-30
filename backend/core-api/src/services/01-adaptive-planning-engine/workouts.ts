import { Router } from 'express'
import prisma from '../../db'
import AppEvents, { EVENTS } from '../../core/events'
import { z } from 'zod'
import { callAI, buildUserContext } from '../ai/aiService'
import { awardXp, updateStreak } from '../xp/xpService'
import { getIo } from '../../realtime/socket'

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
            weight: String(ex.weight),
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

// POST /api/v1/workouts/session/complete — Enhanced with PR tracking & detailed stats
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

    // Track completed exercises for PR detection and stats
    const completedExercises: Array<{
      name: string;
      maxWeight: number;
      totalReps: number;
      totalSets: number;
      completedSets: number;
      volume: number;
    }> = [];

    if (exercises && Array.isArray(exercises)) {
      await prisma.workoutSessionExercise.deleteMany({
        where: { sessionId: actualSessionId }
      });
      
      for (const [idx, ex] of exercises.entries()) {
        const setsData = (ex.setsData || []);
        const completedSetsData = setsData.filter((s: any) => s.completed === true);
        const maxWeight = completedSetsData.length > 0 
          ? Math.max(...completedSetsData.map((s: any) => parseFloat(s.weight) || 0))
          : 0;
        const totalReps = completedSetsData.reduce((sum: number, s: any) => sum + (s.reps || 0), 0);
        const volume = completedSetsData.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 0) * (s.reps || 0), 0);

        completedExercises.push({
          name: ex.name,
          maxWeight,
          totalReps,
          totalSets: setsData.length,
          completedSets: completedSetsData.length,
          volume,
        });

        await prisma.workoutSessionExercise.create({
          data: {
            sessionId: actualSessionId,
            name: ex.name,
            order: idx,
            sets: {
              create: setsData.map((s: any, sIdx: number) => ({
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

    // ── Calculate workout stats ──
    const totalVolume = completedExercises.reduce((sum, ex) => sum + ex.volume, 0);
    const totalCompletedSets = completedExercises.reduce((sum, ex) => sum + ex.completedSets, 0);
    const totalPlannedSets = completedExercises.reduce((sum, ex) => sum + ex.totalSets, 0);
    const completionPct = totalPlannedSets > 0 ? Math.round((totalCompletedSets / totalPlannedSets) * 100) : 100;
    const actualCalories = caloriesBurned || Math.round((duration || 30) * 7.5 + totalVolume * 0.01);

    // Update session with calculated calories
    if (actualCalories) {
      await prisma.workoutSession.update({
        where: { id: actualSessionId },
        data: { caloriesBurned: actualCalories }
      });
    }

    // ── AUTO: Detect and save Personal Records ──
    let newPrs: Array<{ exercise: string; weight: number; reps: number }> = [];
    for (const ex of completedExercises) {
      if (ex.maxWeight > 0) {
        const existingPR = await prisma.workoutPR.findFirst({
          where: { userId, exerciseName: ex.name }
        });
        const avgReps = Math.round(ex.totalReps / Math.max(ex.completedSets, 1));
        if (!existingPR || ex.maxWeight > existingPR.weight) {
          if (existingPR) {
            await prisma.workoutPR.update({
              where: { id: existingPR.id },
              data: { weight: ex.maxWeight, reps: avgReps, dateAchieved: new Date() }
            });
          } else {
            await prisma.workoutPR.create({
              data: { userId, exerciseName: ex.name, weight: ex.maxWeight, reps: avgReps, dateAchieved: new Date() }
            });
          }
          newPrs.push({ exercise: ex.name, weight: ex.maxWeight, reps: avgReps });
        }
      }
    }

    // ── AUTO: Award XP ──
    let xpResult = null;
    let streakResult = null;
    try {
      xpResult = await awardXp(session.userId, 'workout_completed', `Completed: ${session.title}`);
      if (newPrs.length > 0) {
        await awardXp(session.userId, 'personal_record', `New PR: ${newPrs.map(p => p.exercise).join(', ')}`);
      }
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
      await prisma.feedItem.create({
        data: {
          userId: session.userId,
          type: 'workout',
          message: `Completed "${session.title}" · ${duration || '?'}min · ${actualCalories} kcal · ${newPrs.length > 0 ? `🏆 ${newPrs.length} PR!` : '💪'}`,
          timeStr: 'Just now',
        }
      });
    } catch (feedErr) {
      console.warn('[Feed] Error:', feedErr);
    }

    // Trigger Event-Driven Pipeline
    AppEvents.emit(EVENTS.WORKOUT_COMPLETED, { userId: session.userId, workoutId: session.workoutId, sessionId: session.id });

    // ── Socket notification ──
    try {
      const io = getIo();
      if (io) {
        io.to(session.userId).emit('workout_completed', {
          sessionId: actualSessionId,
          title: session.title,
          duration: duration || 0,
          caloriesBurned: actualCalories,
          xpAwarded: xpResult?.xpAwarded || 0,
          newPrs,
          streak: streakResult?.currentStreak || 0,
          totalXp: xpResult?.totalXp || 0,
          level: xpResult?.level || 1,
        });
      }
    } catch (socketErr) {
      console.warn('[Socket] Notification error:', socketErr);
    }

    res.json({
      session,
      stats: {
        duration: duration || 0,
        caloriesBurned: actualCalories,
        volume: totalVolume,
        completedSets: totalCompletedSets,
        totalSets: totalPlannedSets,
        completionPercentage: completionPct,
        exercises: completedExercises.length,
      },
      newPrs,
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

// POST /api/v1/workouts/manual — Create a fresh manual workout, deactivate old ones
router.post('/manual', async (req, res) => {
  try {
    const { userId, title, duration, description, exercises } = req.body;
    
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
            weight: String(ex.weight),
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
    const { status } = req.body;

    const ex = await prisma.exercise.update({
      where: { id: exId, workoutId: id },
      data: { status }
    });

    const allExercises = await prisma.exercise.findMany({
      where: { workoutId: id }
    });

    const allCompleted = allExercises.every(e => e.status === 'done' || e.status === 'skipped');

    if (allCompleted) {
      const w = await prisma.workout.findUnique({ where: { id } });
      const durationMins = w ? parseInt(w.duration) || 30 : 30;
      AppEvents.emit(EVENTS.AI ? (EVENTS as any).AI.PLAN_GENERATION_REQUESTED : 'PLAN_GENERATION_REQUESTED', {
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

// PATCH /api/v1/workouts/:id/exercises/:exId — Update individual exercise
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

// DELETE /api/v1/workouts/:id — Soft delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.workout.update({
      where: { id },
      data: { deletedAt: new Date(), isCurrent: false }
    });
    await prisma.workoutSession.updateMany({
      where: { workoutId: id },
      data: { status: 'CANCELLED' }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// POST /api/v1/workouts/generate-initial — Rachel AI generates from onboarding data
router.post('/generate-initial', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userContext = await buildUserContext(userId);

    const schema = z.object({
      title: z.string(),
      duration: z.string(),
      targetMuscles: z.string().optional(),
      description: z.string().optional(),
      aiExplanation: z.string().describe("Why this workout was generated based on user profile"),
      exercises: z.array(z.object({
        name: z.string(),
        muscleGroup: z.string(),
        sets: z.number(),
        reps: z.number(),
        weight: z.string(),
        restTime: z.number(),
        notes: z.string().optional(),
      })),
    });

    const aiResult = await callAI({
      system: `You are Rachel AI, an elite personal trainer. Generate a single personalized workout for TODAY.

CRITICAL RULES:
- Base the workout STRICTLY on profile data: goal, experience, age, weight, equipment, injuries.
- BEGINNER: 4-6 exercises, bodyweight/light weight, simple movements, 2-3 sets of 8-12 reps.
- INJURIES: Avoid injured areas entirely. Provide safe alternatives.
- NO EQUIPMENT: Bodyweight only (pushups, squats, lunges, planks, burpees).
- EQUIPMENT AVAILABLE: Use dumbbells, bands, barbell etc. as appropriate.
- Match difficulty to experience level and goal.
- Use string weights (e.g. "Bodyweight", "10kg", "20kg").
- NEVER use hardcoded responses. Generate dynamically.`,
      prompt: `User Profile: ${JSON.stringify(userContext.profile, null, 2)}
Today: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Stats: ${JSON.stringify(userContext.stats)}
Readiness: ${JSON.stringify(userContext.vitals)}
Recovery Flags: ${JSON.stringify(userContext.recoveryFlags)}`,
      schema
    });

    if (!aiResult.ok || !aiResult.data) {
      console.error('[AI] Initial gen failed, using profile-based fallback:', aiResult.error);
      const isBeginner = user.experience === 'beginner';
      const hasEquipment = user.equipment && !['none', 'yoga_mat'].includes(user.equipment);
      
      const fallbackExercises = isBeginner ? [
        { name: 'Bodyweight Squats', muscleGroup: 'Legs', sets: 3, reps: 12, weight: 'Bodyweight', restTime: 60, notes: 'Keep chest up' },
        { name: 'Push-ups', muscleGroup: 'Chest', sets: 3, reps: 10, weight: 'Bodyweight', restTime: 60, notes: 'Modified on knees if needed' },
        { name: 'Glute Bridges', muscleGroup: 'Glutes', sets: 3, reps: 15, weight: 'Bodyweight', restTime: 45, notes: 'Squeeze at top' },
        { name: 'Plank', muscleGroup: 'Core', sets: 3, reps: 20, weight: 'Bodyweight', restTime: 45, notes: 'Hold 20 seconds' },
      ] : hasEquipment ? [
        { name: 'Dumbbell Bench Press', muscleGroup: 'Chest', sets: 4, reps: 10, weight: '12kg', restTime: 60, notes: '' },
        { name: 'Bent Over Rows', muscleGroup: 'Back', sets: 4, reps: 10, weight: '15kg', restTime: 60, notes: '' },
        { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', sets: 3, reps: 12, weight: '10kg', restTime: 60, notes: '' },
        { name: 'Goblet Squats', muscleGroup: 'Legs', sets: 3, reps: 12, weight: '16kg', restTime: 60, notes: '' },
      ] : [
        { name: 'Bodyweight Squats', muscleGroup: 'Legs', sets: 3, reps: 15, weight: 'Bodyweight', restTime: 60 },
        { name: 'Push-ups', muscleGroup: 'Chest', sets: 3, reps: 12, weight: 'Bodyweight', restTime: 60 },
        { name: 'Reverse Lunges', muscleGroup: 'Legs', sets: 3, reps: 10, weight: 'Bodyweight', restTime: 60 },
        { name: 'Plank Hold', muscleGroup: 'Core', sets: 3, reps: 1, weight: 'Bodyweight', restTime: 45 },
        { name: 'Glute Bridges', muscleGroup: 'Glutes', sets: 3, reps: 15, weight: 'Bodyweight', restTime: 45 },
      ];

      const goalLabel = user.goal ? user.goal.charAt(0).toUpperCase() + user.goal.slice(1).replace('_', ' ') : 'Full Body';
      const title = `${goalLabel} Workout`;
      const duration = isBeginner ? '30 mins' : '45 mins';
      const targetMuscles = [...new Set(fallbackExercises.map(e => e.muscleGroup))].join(', ');
      const aiExplanation = `I've created this ${isBeginner ? 'beginner-friendly' : 'personalized'} workout based on your profile. ${user.goal ? `Targeting ${user.goal.replace('_', ' ')}.` : ''}`;

      // Auto-save fallback workout to DB
      await prisma.workout.updateMany({
        where: { userId, isCurrent: true },
        data: { isCurrent: false }
      });
      await prisma.workout.create({
        data: {
          userId, title, duration, targetMuscles, aiExplanation, isCurrent: true,
          exercises: { create: fallbackExercises.map((ex, idx) => ({ ...ex, weight: String(ex.weight), order: idx })) }
        }
      });

      return res.json({ title, duration, targetMuscles, aiExplanation, exercises: fallbackExercises });
    }

    const data = aiResult.data;
    const highRiskMuscles = (userContext.recoveryFlags || [])
      .filter((f: any) => f.riskLevel === 'HIGH')
      .map((f: any) => f.muscleGroup?.toLowerCase());

    let safeExercises = data.exercises || [];
    if (highRiskMuscles.length > 0) {
      safeExercises = safeExercises.filter((ex: any) => {
        const muscle = (ex.muscleGroup || '').toLowerCase();
        return !highRiskMuscles.some((risk: string) => muscle.includes(risk));
      });
    }

    // Auto-save AI-generated workout to DB
    await prisma.workout.updateMany({
      where: { userId, isCurrent: true },
      data: { isCurrent: false }
    });
    await prisma.workout.create({
      data: {
        userId,
        title: data.title,
        duration: data.duration,
        targetMuscles: data.targetMuscles,
        aiExplanation: data.aiExplanation || `Tailored to your ${user.goal?.replace('_', ' ') || 'fitness'} goals.`,
        isCurrent: true,
        exercises: { create: safeExercises.map((ex: any, idx: number) => ({ name: ex.name, sets: ex.sets, reps: ex.reps, weight: String(ex.weight), restTime: ex.restTime || 60, notes: ex.notes || '', muscleGroup: ex.muscleGroup, order: idx })) }
      }
    });

    // Emit socket notification
    try {
      const io = getIo();
      io?.to(userId).emit('workout_update', { refresh: true });
    } catch (e) {}

    res.json({
      title: data.title,
      duration: data.duration,
      targetMuscles: data.targetMuscles,
      aiExplanation: data.aiExplanation || `Tailored to your ${user.goal?.replace('_', ' ') || 'fitness'} goals.`,
      exercises: safeExercises,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate initial workout' });
  }
});

// PATCH /api/v1/workouts/:id/rename
router.patch('/:id/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const workout = await prisma.workout.update({
      where: { id },
      data: { title: title.trim() },
    });
    res.json(workout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to rename workout' });
  }
});

// POST /api/v1/workouts/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const source = await prisma.workout.findUnique({
      where: { id },
      include: { exercises: { orderBy: { order: 'asc' } } }
    });
    if (!source) return res.status(404).json({ error: 'Workout not found' });

    const workout = await prisma.workout.create({
      data: {
        userId: source.userId,
        title: `${source.title} (Copy)`,
        duration: source.duration,
        description: source.description,
        goal: source.goal,
        difficulty: source.difficulty,
        equipment: source.equipment,
        targetMuscles: source.targetMuscles,
        isCurrent: true,
        aiExplanation: source.aiExplanation,
        exercises: {
          create: source.exercises.map((ex, idx) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restTime: ex.restTime,
            notes: ex.notes,
            muscleGroup: ex.muscleGroup,
            setsData: ex.setsData,
            status: 'pending',
            order: idx,
          }))
        }
      },
      include: { exercises: { orderBy: { order: 'asc' } } }
    });

    res.json(workout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to duplicate workout' });
  }
});

// GET /api/v1/workouts/prs
router.get('/prs', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const prs = await prisma.workoutPR.findMany({
      where: { userId },
      orderBy: { dateAchieved: 'desc' },
    });
    res.json(prs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch PRs' });
  }
});

// POST /api/v1/workouts/:id/save-as — Save builder state as new version
router.post('/:id/save-as', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, duration, targetMuscles, exercises } = req.body;

    const source = await prisma.workout.findUnique({ where: { id } });
    if (!source) return res.status(404).json({ error: 'Workout not found' });

    await prisma.workout.updateMany({
      where: { userId: source.userId, isCurrent: true },
      data: { isCurrent: false }
    });

    const newVersionNumber = (source.versionNumber || 0) + 1;

    const workout = await prisma.workout.create({
      data: {
        userId: source.userId,
        title: title || source.title,
        duration: duration || source.duration,
        description: source.description,
        goal: source.goal,
        difficulty: source.difficulty,
        equipment: source.equipment,
        targetMuscles: targetMuscles || source.targetMuscles,
        isCurrent: true,
        aiExplanation: `Modified version ${newVersionNumber} of "${source.title}"`,
        versionNumber: newVersionNumber,
        parentVersionId: source.parentVersionId || source.id,
        exercises: {
          create: (exercises || []).map((ex: any, idx: number) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: String(ex.weight),
            restTime: ex.restTime || 60,
            notes: ex.notes,
            muscleGroup: ex.muscleGroup,
            setsData: ex.setsData ? JSON.stringify(ex.setsData) : null,
            status: 'pending',
            order: idx,
          }))
        }
      },
      include: { exercises: { orderBy: { order: 'asc' } } }
    });

    res.json(workout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save workout version' });
  }
});

// POST /api/v1/workouts/regenerate — AI regeneration with context
router.post('/regenerate', async (req, res) => {
  try {
    const { userId, workoutId, prompt } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const userContext = await buildUserContext(userId);
    
    let currentWorkoutData = null;
    if (workoutId) {
      currentWorkoutData = await prisma.workout.findUnique({
        where: { id: workoutId },
        include: { exercises: { orderBy: { order: 'asc' } } }
      });
    }

    const schema = z.object({
      title: z.string(),
      duration: z.string(),
      targetMuscles: z.string().optional(),
      aiExplanation: z.string().describe("Brief explanation of changes"),
      exercises: z.array(z.object({
        name: z.string(),
        muscleGroup: z.string(),
        sets: z.number(),
        reps: z.number(),
        weight: z.string(),
        restTime: z.number(),
        notes: z.string().optional(),
      })),
    });

    const aiResult = await callAI({
      system: `Modify the user's workout based on their request. Consider profile, recovery state. Replace injured-area exercises with safe alternatives.`,
      prompt: `Request: ${prompt || 'Optimize'}\nProfile: ${JSON.stringify(userContext.profile)}\nCurrent: ${JSON.stringify(currentWorkoutData)}\nRecovery: ${JSON.stringify(userContext.recoveryFlags)}`,
      schema
    });

    if (!aiResult.ok || !aiResult.data) {
      return res.status(500).json({ error: 'AI regeneration failed' });
    }

    res.json(aiResult.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to regenerate workout' });
  }
});

// POST /api/v1/workouts/feedback — Rachel AI generates feedback for a completed session
router.post('/feedback', async (req, res) => {
  try {
    const { userId, sessionId } = req.body;
    if (!userId || !sessionId) return res.status(400).json({ error: 'Missing userId or sessionId' });

    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: { exercises: { include: { sets: true } } }
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const userContext = await buildUserContext(userId);
    const totalVolume = session.exercises.reduce((vol, ex) => vol + ex.sets.reduce((sVol, set) => sVol + ((set.weight || 0) * (set.reps || 0)), 0), 0);
    const completedSets = session.exercises.reduce((count, ex) => count + ex.sets.filter(s => s.isCompleted).length, 0);
    const totalSets = session.exercises.reduce((count, ex) => count + ex.sets.length, 0);

    const schema = z.object({
      overallFeedback: z.string().describe("1-2 sentence general feedback on the workout"),
      highlights: z.array(z.string()).describe("Key highlights of this session (2-3 bullet points)"),
      improvement: z.string().describe("One actionable tip for next session"),
      recoveryAdvice: z.string().describe("Recovery advice for the next 24 hours"),
      nextSessionSuggestion: z.string().describe("What to focus on in the next workout"),
    });

    const aiResult = await callAI({
      system: `You are Rachel AI, an elite personal trainer. Provide personalized, constructive feedback for this completed workout.
Be encouraging but specific. Base ALL feedback on the actual session data provided.`,
      prompt: `Session: ${session.title}, Duration: ${session.duration || 0}min, Volume: ${(totalVolume / 1000).toFixed(1)}t
Completed: ${completedSets}/${totalSets} sets
Exercises: ${JSON.stringify(session.exercises.map(e => ({ name: e.name, sets: e.sets.length, completed: e.sets.filter(s => s.isCompleted).length })))}
User Profile: ${JSON.stringify(userContext.profile)}
Recovery: ${JSON.stringify(userContext.vitals)}`,
      schema
    });

    if (!aiResult.ok || !aiResult.data) {
      return res.json({
        overallFeedback: `Great session! You completed ${completedSets} of ${totalSets} sets with ${(totalVolume / 1000).toFixed(1)}t total volume.`,
        highlights: [`Completed ${session.title}`, `${completedSets} sets logged`, `${session.duration || 0} minutes`],
        improvement: 'Focus on progressive overload in your next session.',
        recoveryAdvice: 'Stay hydrated, get 7-9 hours of sleep, and consider light stretching.',
        nextSessionSuggestion: 'Continue with your current program and aim to increase weight or reps where possible.',
      });
    }

    res.json(aiResult.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate feedback' });
  }
});

export default router
