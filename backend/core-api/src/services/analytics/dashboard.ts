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

    // Get current streak from user
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currentStreak: true, xpTotal: true } });

    res.json({
      bpm: vitals.bpm,
      restingBpm: vitals.bpm - 10,
      bpmDelta: null,
      hrv: null,
      spo2: null,
      respiratoryRate: null,
      bodyBattery: Math.round(vitals.bodyBattery * 100),
      bodyBatteryDelta: null,
      bodyBatteryTrend: null,
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
      caloriesRemaining: null,
      caloriesConsumed: null,
      caloriesGoal: null,
      protein: null,
      proteinGoal: null,
      carbs: null,
      carbsGoal: null,
      fat: null,
      fatGoal: null,
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
