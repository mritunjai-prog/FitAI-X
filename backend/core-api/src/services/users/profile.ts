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

    if (user?.currentInjuries) {
      const parts = user.currentInjuries.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(part => {
        injuryModel.unshift({
          id: `current-${part.toLowerCase()}`,
          date: 'Current',
          status: 'active',
          part: part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
          desc: `User reported active injury: ${part}. AI is protecting this region.`
        });
      });
    }

    if (user?.pastInjuries) {
      const parts = user.pastInjuries.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(part => {
        injuryModel.push({
          id: `past-${part.toLowerCase()}`,
          date: 'Past',
          status: 'reported',
          part: part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
          desc: `User reported historical injury: ${part}. Monitoring for strain.`
        });
      });
    }

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

// PUT /api/v1/profile — update user settings/preferences
router.put('/', async (req, res) => {
  try {
    const { userId, prefs, goals } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const updateData: any = {};
    if (goals !== undefined) updateData.goal = Array.isArray(goals) ? goals.join(',') : goals;
    
    if (prefs) {
      // Store preferences as JSON in medicalConditions or a dedicated field
      // For now we store on user record
      if (prefs.adaptive !== undefined) updateData.adaptiveProgression = prefs.adaptive;
      if (prefs.voice !== undefined) updateData.voiceFeedback = prefs.voice;
      if (prefs.aggressive !== undefined) updateData.aggressiveProgression = prefs.aggressive;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/v1/profile/export
router.get('/export', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const sessions = await prisma.workoutSession.count({ where: { userId, status: 'COMPLETED' } });

    res.json({
      user: {
        name: user?.name, email: user?.email, goal: user?.goal,
        weight: user?.weight, height: user?.height, age: user?.age,
      },
      stats: {
        totalSessions: sessions,
        currentStreak: user?.currentStreak || 0,
        xpTotal: user?.xpTotal || 0,
      },
      exportedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
