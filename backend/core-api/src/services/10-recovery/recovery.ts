import { Router } from 'express';
import prisma from '../../db';
import { callAI, buildUserContext } from '../ai/aiService';
import { z } from 'zod';

const router = Router();

// ─── GET /api/v1/recovery/overview ─────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    if (!vitals) {
      return res.json({ recoveryStatus: null, description: null });
    }
    
    res.json({
      recoveryStatus: vitals.recoveryCor > 0.7 ? 'Ready to Train' : vitals.recoveryCor > 0.4 ? 'Recovery Needed' : 'Rest Day',
      description: `Your body battery is at ${Math.round(vitals.bodyBattery * 100)}%`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/recovery/score ────────────────────────────────────────────
router.get('/score', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    if (!vitals) {
      return res.json({ score: null, status: null, delta: null, headline: null, summary: null, contributors: [] });
    }
    
    const score = Math.round(vitals.recoveryCor * 100);
    
    res.json({
      score,
      status: score >= 80 ? 'Optimal' : score >= 50 ? 'Moderate' : 'Low',
      delta: null,
      headline: score >= 80 ? 'You\'re fully recovered' : score >= 50 ? 'Moderate recovery' : 'Take it easy today',
      summary: score >= 80 ? 'Your body is primed for peak performance.' : score >= 50 ? 'You can train, but listen to your body.' : 'Prioritise rest and recovery today.',
      updatedAt: vitals.updatedAt?.toISOString().split('T')[0],
      contributors: [
        { key: 'sleep', label: 'Sleep', value: Math.round((vitals.bodyBattery || 0) * 100), weight: 0.4, positive: (vitals.bodyBattery || 0) > 0.6 },
        { key: 'heart', label: 'Heart Rate', value: Math.round((1 - (Math.min(vitals.bpm || 70, 100) - 50) / 50) * 100), weight: 0.3, positive: (vitals.bpm || 70) < 75 },
        { key: 'stress', label: 'Stress', value: Math.round((1 - vitals.recoveryUpr) * 100), weight: 0.2, positive: vitals.recoveryUpr > 0.6 },
        { key: 'water', label: 'Hydration', value: Math.round((vitals.waterProgress || 0) * 100), weight: 0.1, positive: (vitals.waterProgress || 0) > 0.6 },
      ],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/recovery/sleep ────────────────────────────────────────────
router.get('/sleep', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    if (!vitals) {
      return res.json({ totalMinutes: null, totalHours: null, quality: null, qualityScore: null, bedtime: null, wakeTime: null });
    }
    
    const bb = vitals.bodyBattery;
    const currentHours = 4 + (bb * 5);
    const totalMinutes = Math.round(currentHours * 60);
    
    res.json({
      totalMinutes,
      totalHours: currentHours.toFixed(1),
      quality: currentHours >= 7.5 ? 'Excellent' : currentHours >= 6 ? 'Good' : 'Fair',
      qualityScore: Math.round(Math.min(100, (currentHours / 9) * 100)),
      bedtime: '22:30',
      wakeTime: '06:30',
      efficiency: Math.round(Math.min(95, 70 + bb * 25)),
      latencyMinutes: Math.round(Math.max(5, 25 - bb * 20)),
      debtHours: Math.max(0, (8 - currentHours).toFixed(1)),
      summary: currentHours >= 7 ? 'Good sleep duration and quality.' : 'Consider going to bed earlier tonight.',
      deltaMinutes: Math.round((currentHours - 7) * 60),
      stages: [
        { name: 'Deep', minutes: Math.round(totalMinutes * 0.2), percent: 20, target: '15–25%' },
        { name: 'REM', minutes: Math.round(totalMinutes * 0.25), percent: 25, target: '20–25%' },
        { name: 'Light', minutes: Math.round(totalMinutes * 0.45), percent: 45, target: '40–50%' },
        { name: 'Awake', minutes: Math.round(totalMinutes * 0.1), percent: 10, target: '<10%' },
      ],
      hypnogram: [
        { stage: 'Light', minutes: 25 }, { stage: 'Deep', minutes: 40 }, { stage: 'Light', minutes: 20 },
        { stage: 'REM', minutes: 30 }, { stage: 'Light', minutes: 15 }, { stage: 'Deep', minutes: 35 },
        { stage: 'REM', minutes: 25 }, { stage: 'Light', minutes: 20 }, { stage: 'REM', minutes: 15 },
      ],
      consistency: [
        { label: 'Mon', value: 72 }, { label: 'Tue', value: 78 }, { label: 'Wed', value: 65 },
        { label: 'Thu', value: 82 }, { label: 'Fri', value: 70 }, { label: 'Sat', value: 88 },
        { label: 'Sun', value: 80 },
      ],
      consistencyNote: 'Your sleep consistency is stable. Try to maintain a fixed bedtime.',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/recovery/heart-rate ───────────────────────────────────────
router.get('/heart-rate', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    if (!vitals || !vitals.bpm) {
      return res.json({ currentBpm: null, restingBpm: null, hrv: null, hrvCaption: null, hrvTrend: null, trend: null, respiratoryRate: null, respiratoryTrend: null });
    }
    
    res.json({
      currentBpm: vitals.bpm,
      restingBpm: Math.max(50, vitals.bpm - 15),
      hrv: vitals.hrv || null,
      hrvCaption: vitals.hrv ? `${vitals.hrv} ms` : null,
      hrvTrend: vitals.hrv ? [vitals.hrv - 5, vitals.hrv - 2, vitals.hrv + 3, vitals.hrv] : null,
      trend: [vitals.bpm + 5, vitals.bpm + 2, vitals.bpm - 3, vitals.bpm],
      respiratoryRate: vitals.respiratoryRate || null,
      respiratoryTrend: vitals.respiratoryRate ? [vitals.respiratoryRate - 1, vitals.respiratoryRate, vitals.respiratoryRate + 0.5] : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/recovery/water ────────────────────────────────────────────
router.get('/water', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    if (!vitals || !vitals.waterProgress) {
      return res.json({ currentIntake: null, dailyGoal: null, progress: null, trend: null });
    }
    
    const dailyGoal = 3000;
    
    res.json({
      currentIntake: Math.round(vitals.waterProgress * dailyGoal),
      dailyGoal,
      progress: vitals.waterProgress,
      trend: [0.3, 0.45, 0.5, 0.55, 0.6, 0.65, vitals.waterProgress],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/recovery/stress ───────────────────────────────────────────
router.get('/stress', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    if (!vitals) {
      return res.json({ score: null, status: null, trend: null });
    }
    
    const stressScore = Math.round((1 - vitals.recoveryUpr) * 100);
    
    res.json({
      score: stressScore,
      status: stressScore < 40 ? 'Relaxed' : stressScore < 70 ? 'Moderate' : 'High',
      trend: [55, 50, 42, 38, 45, 40, stressScore],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/recovery/timeline ─────────────────────────────────────────
router.get('/timeline', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    if (!vitals) {
      return res.json({ today: null, tomorrow: null, next2Days: null });
    }
    
    const base = vitals.recoveryCor;
    
    res.json({
      today: Math.round(base * 100),
      tomorrow: Math.round(Math.min(base + 0.15, 1) * 100),
      next2Days: Math.round(Math.min(base + 0.3, 1) * 100),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/recovery/ai-insights ──────────────────────────────────────
router.get('/ai-insights', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    if (!vitals) {
      return res.json({ headline: null, details: [], protocol: [] });
    }
    
    const userContext = await buildUserContext(userId);
    
    const schema = z.object({
      summary: z.string().describe("1 sentence overview"),
      recommendation: z.string().describe("1 actionable tip")
    });

    const promptStr = `You are Rachel AI, a fitness coach. 
User's recovery score is ${Math.round((vitals?.recoveryCor || 0) * 100)}/100.
Body battery is ${Math.round((vitals?.bodyBattery || 0) * 100)}%.
Resting HR is ${Math.max(50, (vitals?.bpm || 72) - 15)} bpm.

Additional Context:
Diet: ${userContext.profile.diet}
Recent Workout History: ${JSON.stringify(userContext.weeklyHistory)}
Injuries: ${userContext.profile.injuries}

Provide brief, personalized recovery advice based on this data.`;

    const aiResult = await callAI({
      system: 'You are Rachel AI, a fitness coach providing recovery advice.',
      prompt: promptStr,
      schema
    });

    if (!aiResult.ok || !aiResult.data) {
      throw new Error('AI generation failed');
    }

    res.json({
      headline: aiResult.data.summary,
      details: [{ title: 'Recommendation', body: aiResult.data.recommendation }],
      protocol: [],
    });
  } catch (e: any) {
    console.error('[Recovery AI] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
