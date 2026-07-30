import { Router } from 'express'
import prisma from '../../db'

const router = Router()

// Helper to get userId from query or fallback to first user
const getUserId = async (req: any) => {
  if (req.query.userId) return String(req.query.userId);
  const firstUser = await prisma.user.findFirst();
  return firstUser?.id;
}

router.get('/feed', async (req, res) => {
  try {
    const feed = await prisma.feedItem.findMany({ 
      take: 20,
      include: { user: true },
      orderBy: { id: 'desc' }
    })
    res.json(feed.map(f => ({
      id: f.id,
      type: f.type,
      user: f.user?.name || 'FitAI User',
      avatar: f.user?.avatar || null,
      msg: f.message,
      time: f.timeStr,
      likes: f.likes || 0,
      bpm: f.bpm || undefined
    })))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed' })
  }
})

router.get('/active-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ take: 5 })
    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      img: u.avatar || null,
      isLive: false
    })))
  } catch (error) {
    res.json([])
  }
})

router.get('/vitals', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.json(null);

    const vitals = await prisma.vitals.findUnique({
      where: { userId }
    });
    if (!vitals) return res.json(null);

    // Get user data for nutrition calculations
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currentStreak: true, xpTotal: true, weight: true, goal: true } });
    
    // Calculate nutrition from today's food logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const logs = await prisma.foodLog.findMany({ where: { userId, loggedAt: { gte: today } } });
    const caloriesConsumed = logs.reduce((sum, log) => sum + log.cals, 0);
    const protein = logs.reduce((sum, log) => sum + (log.protein || 0), 0);
    const carbs = logs.reduce((sum, log) => sum + (log.carbs || 0), 0);
    const fat = logs.reduce((sum, log) => sum + (log.fats || 0), 0);
    
    const weight = user?.weight || 70;
    const baseCals = Math.round(weight * 28);
    const calorieGoal = user?.goal?.toLowerCase().includes('loss') ? Math.round(baseCals * 0.8)
      : user?.goal?.toLowerCase().includes('gain') ? Math.round(baseCals * 1.15) : baseCals;
    const proteinGoal = Math.round(weight * 2);
    const carbGoal = Math.round((calorieGoal - proteinGoal * 4) * 0.5 / 4);
    const fatGoal = Math.round((calorieGoal - proteinGoal * 4) * 0.25 / 9);

    res.json({
      bpm: vitals.bpm,
      restingBpm: vitals.bpm - 10,
      bodyBattery: Math.round(vitals.bodyBattery * 100),
      moveProgress: vitals.moveProgress,
      moveCurrent: Math.round(vitals.moveProgress * 500),
      moveGoal: 500,
      waterProgress: vitals.waterProgress,
      waterCurrent: Math.round(vitals.waterProgress * vitals.waterGoalMl),
      waterGoal: vitals.waterGoalMl,
      trainProgress: vitals.trainProgress,
      trainCurrent: Math.round(vitals.trainProgress * 60),
      trainGoal: 60,
      recoveryUpper: vitals.recoveryUpr,
      recoveryLower: vitals.recoveryLwr,
      recoveryCore: vitals.recoveryCor,
      recoveryCardio: vitals.recoveryCrd,
      loadM: vitals.loadM,
      loadT: vitals.loadT,
      loadW: vitals.loadW,
      loadTh: vitals.loadTh,
      loadF: vitals.loadF,
      loadSa: vitals.loadSa,
      loadSu: vitals.loadSu,
      loadTodayIndex: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
      currentStreak: user?.currentStreak || 0,
      xpTotal: user?.xpTotal || 0,
      caloriesRemaining: Math.max(0, calorieGoal - caloriesConsumed),
      caloriesConsumed,
      caloriesGoal: calorieGoal,
      protein,
      proteinGoal,
      carbs,
      carbsGoal: carbGoal,
      fat,
      fatGoal,
    })
  } catch (error) {
    res.json(null)
  }
})

router.get('/weekly-plan', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.json([]);

    const calendarEvents = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { dayIndex: 'asc' }
    });
    res.json(calendarEvents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly plan' });
  }
});

router.get('/insights', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.json(null);

    const latestMessage = await prisma.coachMessage.findFirst({
      where: { userId, role: 'ai' },
      orderBy: { createdAt: 'desc' }
    });
    res.json({
      message: latestMessage?.content || "You're doing great! Keep up the good work."
    });
  } catch (error) {
    res.json(null);
  }
});

router.get('/current-workout', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) return res.json(null);

    const workout = await prisma.workout.findFirst({
      where: { userId, isCurrent: true },
      include: { exercises: { orderBy: { order: 'asc' } } }
    });
    res.json(workout);
  } catch (error) {
    res.json(null);
  }
});

export default router
