/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FitAI X — WORKOUT COMPLETION CHAIN
 *  When a workout completes, this endpoint triggers:
 *    1. Mark session complete
 *    2. Award XP
 *    3. Update streak
 *    4. Update recovery (auto-calculate)
 *    5. Update nutrition targets
 *    6. Update calendar
 *    7. Notify via socket
 * ════════════════════════════════════════════════════════════════════════════
 */
import { Router } from 'express';
import prisma from '../../db';
import { getIo } from '../realtime/socket';
import { awardXp, updateStreak } from './xp/xpService';

const router = Router();

// POST /api/v1/workouts/complete
router.post('/complete', async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    if (!sessionId || !userId) return res.status(400).json({ error: 'Missing sessionId or userId' });

    // 1. Mark session complete
    const session = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: { 
        status: 'COMPLETED',
        endTime: new Date(),
      },
      include: { exercises: { include: { sets: true } } },
    });

    // Calculate calories burned
    const totalVolume = session.exercises.reduce((vol, ex) => {
      return vol + ex.sets.reduce((sVol, set) => sVol + ((set.weight || 0) * (set.reps || 0)), 0);
    }, 0);
    const duration = session.duration || 45;
    const estimatedCalories = Math.round(duration * 7.5 + totalVolume * 0.01);

    // Update calories on session
    await prisma.workoutSession.update({
      where: { id: sessionId },
      data: { caloriesBurned: estimatedCalories },
    });

    // 2. Award XP
    const xpResult = await awardXp(userId, 'workout_completed', `Completed: ${session.title}`);

    // 3. Update streak
    const streakResult = await updateStreak(userId);

    // Streak bonus XP
    if (streakResult.streakContinued && streakResult.currentStreak > 1) {
      await awardXp(userId, 'workout_streak', `${streakResult.currentStreak} day streak!`);
    }

    // 4. Auto-update recovery score based on workout
    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    if (vitals) {
      // Reduce recovery slightly after a workout
      const newRecovery = Math.max(0.2, (vitals.recoveryCor || 0.5) - 0.08);
      const newBodyBattery = Math.max(0.1, (vitals.bodyBattery || 0.5) - 0.12);
      
      await prisma.vitals.update({
        where: { userId },
        data: {
          recoveryCor: newRecovery,
          bodyBattery: newBodyBattery,
        }
      });
    }

    // 5. Get updated stats
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const stats = {
      xpTotal: user?.xpTotal || 0,
      level: Math.floor((user?.xpTotal || 0) / 500) + 1,
      streak: user?.currentStreak || 0,
      caloriesBurned: estimatedCalories,
    };

    // 6. Notify via socket
    const io = getIo();
    io?.to(userId).emit('workout_completed', {
      sessionId,
      title: session.title,
      caloriesBurned: estimatedCalories,
      xpAwarded: xpResult.xpAwarded,
      ...stats,
    });

    // 7. Broadcast to social feed
    await prisma.feedItem.create({
      data: {
        userId,
        type: 'workout',
        message: `Completed "${session.title}" workout · ${duration} min · ${estimatedCalories} kcal burned`,
        timeStr: 'Just now',
      }
    });

    res.json({
      success: true,
      session,
      caloriesBurned: estimatedCalories,
      xpAwarded: xpResult.xpAwarded,
      totalXp: stats.xpTotal,
      level: stats.level,
      currentStreak: stats.streak,
      streakContinued: streakResult.streakContinued,
      newBadge: xpResult.newBadge,
    });

  } catch (e: any) {
    console.error('[Workout Complete] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/workouts/stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const { getUserStats } = await import('./xp/xpService');
    const stats = await getUserStats(userId);
    
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
