import { Router } from 'express'
import prisma from '../../db'
import { calculateInjuryRisks } from '../18-ai-injury-predictor/predictor'

const router = Router()

// GET /api/v1/profile
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    let vitals = null;
    let memoryEvents = [];
    try {
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

    // Dynamic telemetry
    const telemetry = [];
    if (vitals) {
      telemetry.push({
        name: 'Oura Ring Gen 3',
        status: 'Connected',
        battery: Math.floor(vitals.bodyBattery * 100),
        icon: 'watch',
        details: { HRV: '45ms', Sleep: Math.floor(vitals.recoveryCor * 100).toString() }
      });
    } else {
      telemetry.push({
        name: 'No Device Detected',
        status: 'Searching...',
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

    // Mock Profile Data based on BRD
    const profileData = {
      identity: {
        name: 'Alex Mercer',
        email: 'alex.mercer@elite.fit',
        avatar: 'https://i.pravatar.cc/150?img=11',
        totalWorkouts: 142,
        currentStreak: 24,
      },
      fitnessProfile: {
        height: 185, // cm
        weight: 82,  // kg
        age: 29,
        goals: ['Hypertrophy', 'Endurance', 'Power', 'Lean Mass'],
        activeGoals: ['Hypertrophy'] // Selected goals
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
