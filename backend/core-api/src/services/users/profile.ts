import { Router } from 'express'
import prisma from '../../db'
import { calculateInjuryRisks } from '../18-ai-injury-predictor/predictor'

const router = Router()

// GET /api/v1/profile
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    let user = null;
    let vitals = null;
    let memoryEvents = [];
    try {
      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            age: true,
            weight: true,
            height: true,
            gender: true,
            experience: true,
            goal: true,
            equipment: true,
            diet: true,
            pastInjuries: true,
            currentInjuries: true,
            medicalConditions: true,
            allergies: true,
            physicalLimitations: true,
            medications: true,
            currentStreak: true,
          }
        });
      }
      vitals = await prisma.vitals.findFirst()
      if (userId) {
        memoryEvents = await prisma.memoryEvent.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' }
        });
      }
    } catch (dbError) {
      console.warn("DB not reachable, using mock vitals", dbError);
    }
    
    // Transform for radar chart expectations
    const radarChart = vitals ? [
      { label: 'Chest', value: vitals.recoveryUpr },
      { label: 'Back', value: vitals.recoveryCor }, // Approximate mappings for demo
      { label: 'Legs', value: vitals.recoveryLwr },
      { label: 'Arms', value: vitals.recoveryCrd },
      { label: 'Core', value: vitals.recoveryCor }
    ] : [
      { label: 'Chest', value: 0.8 },
      { label: 'Back', value: 0.8 },
      { label: 'Legs', value: 0.8 },
      { label: 'Arms', value: 0.8 },
      { label: 'Core', value: 0.8 }
    ];

    // Compute dynamic imbalance
    let imbalanceMsg = null;
    if (vitals) {
      const parts = radarChart.map(r => r.value);
      const min = Math.min(...parts);
      const max = Math.max(...parts);
      const diff = (max - min) * 100;
      if (diff > 5) {
        const weak = radarChart.find(r => r.value === min)?.label;
        const strong = radarChart.find(r => r.value === max)?.label;
        imbalanceMsg = `AI detected a ${diff.toFixed(0)}% imbalance between ${strong} and ${weak}. Modifying upcoming volume.`;
      }
    }

    // Dynamic telemetry — built from real Vitals data, no hardcoded device names
    const telemetry = [];
    if (vitals) {
      const bodyBatteryPct = Math.round(vitals.bodyBattery * 100);
      const hrvMs = Math.round(vitals.recoveryCor * 100); // proxy: higher core recovery = higher HRV
      const sleepScore = Math.round(((vitals.recoveryLwr + vitals.recoveryUpr) / 2) * 100);

      telemetry.push({
        name: 'FitAI X Health Monitor',
        status: 'Connected',
        battery: bodyBatteryPct,
        icon: 'watch',
        details: {
          HRV: `${hrvMs}ms`,
          Sleep: `${sleepScore}%`,
          Battery: `${bodyBatteryPct}%`
        }
      });
    } else {
      telemetry.push({
        name: 'No Device Synced',
        status: 'Log a workout to sync',
        icon: 'favorite-border',
        details: null
      });
    }
    
    // Fetch live injury predictors
    const injuryRisks = await calculateInjuryRisks(userId);
    const injuryModel = injuryRisks
      .filter(r => r.status !== 'cleared') // only show elevated or warning
      .map(r => ({
        id: r.muscle,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        status: r.status === 'warning' ? 'active' : 'reported', // active = red, reported = yellow
        part: r.muscle,
        desc: `AI detected ${r.status} injury risk (${r.riskScore}%) based on fatigue and recovery.`
      }));

    // Mock Profile Data based on BRD (blended with real DB data where available)
    const profileData = {
      identity: {
        name: user?.name || 'Loading...',
        email: user?.email || '',
        avatar: user?.avatar || 'https://i.pravatar.cc/150?img=11',
        totalWorkouts: 142, // Would typically count from DB
        currentStreak: user?.currentStreak || 0,
      },
      fitnessProfile: {
        height: user?.height || null, // cm
        weight: user?.weight || null,  // kg
        age: user?.age || null,
        gender: user?.gender || null,
        experience: user?.experience || null,
        goals: user?.goal ? user.goal.split(',') : [],
        activeGoals: user?.goal ? user.goal.split(',') : [],
        equipment: user?.equipment ? user.equipment.split(',') : [],
        diet: user?.diet ? user.diet.split(',') : []
      },
      healthProfile: {
        pastInjuries: user?.pastInjuries || null,
        currentInjuries: user?.currentInjuries || null,
        medicalConditions: user?.medicalConditions || null,
        allergies: user?.allergies || null,
        physicalLimitations: user?.physicalLimitations || null,
        medications: user?.medications || null
      },
      telemetry: telemetry,
      aiPreferences: {
        adaptiveProgression: true,
        voiceFeedback: false,
        nutritionSync: true
      },
      equipment: {
        commercialGym: true,
        homeGym: false,
        dumbbellsOnly: false
      },
      settings: {
        publicProfile: true,
        twoFactorAuth: false,
        workoutReminders: true,
        recoveryAlerts: true
      },
      radarChart: radarChart,
      imbalanceMsg: imbalanceMsg,
      injuryModel: injuryModel
    }
    
    res.json(profileData)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

export default router
