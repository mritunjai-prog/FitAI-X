import { Router } from 'express'
import prisma from '../../db'

const router = Router()

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
    const vitals = await prisma.vitals.findFirst()
    if (!vitals) return res.json(null)

    res.json({
      bpm: vitals.bpm,
      restingBpm: Math.max(50, vitals.bpm - 15),
      bpmDelta: null,
      hrv: vitals.hrv || null,
      spo2: null,
      respiratoryRate: null,
      bodyBattery: Math.round(vitals.bodyBattery * 100),
      bodyBatteryDelta: null,
      bodyBatteryTrend: null,
      moveProgress: vitals.moveProgress,
      moveCurrent: Math.round(vitals.moveProgress * 500),
      moveGoal: 500,
      waterProgress: vitals.waterProgress,
      waterCurrent: Math.round(vitals.waterProgress * 2500),
      waterGoal: 2500,
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

export default router
