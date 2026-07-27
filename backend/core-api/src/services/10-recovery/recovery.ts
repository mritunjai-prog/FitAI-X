import { Router } from 'express';
import prisma from '../../db';
import Groq from 'groq-sdk';

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── GET /api/v1/recovery/overview ─────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    res.json({
      recoveryStatus: vitals ? vitals.recoveryCor > 0.7 ? 'Ready to Train' : vitals.recoveryCor > 0.4 ? 'Recovery Needed' : 'Rest Day' : 'Unknown',
      bodyBattery: vitals ? Math.round(vitals.bodyBattery * 100) : 100,
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
    
    // Convert float to 0-100 score
    const score = vitals ? Math.round(vitals.recoveryCor * 100) : 85;
    
    res.json({
      score,
      status: score >= 80 ? 'Optimal' : score >= 50 ? 'Moderate' : 'Low',
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
    
    // Simulate sleep based on vitals.bodyBattery
    const bb = vitals?.bodyBattery || 0.8;
    const currentSleep = 4 + (bb * 5); // 4 to 9 hours
    
    // Generate 7 day sleep chart
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = dayLabels.map((d, i) => ({
      label: d,
      value: i === 6 ? currentSleep / 10 : (4 + Math.random() * 5) / 10, 
      raw: i === 6 ? currentSleep : 4 + Math.random() * 5
    }));

    res.json({
      totalHours: currentSleep.toFixed(1),
      quality: bb > 0.8 ? 'Excellent' : bb > 0.5 ? 'Good' : 'Poor',
      chartData,
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
    
    res.json({
      currentBpm: vitals?.bpm || 72,
      restingBpm: Math.max(50, (vitals?.bpm || 72) - 15),
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
    
    const progress = vitals?.waterProgress || 0.5;
    const dailyGoal = 3000; // ml
    
    res.json({
      currentIntake: Math.round(progress * dailyGoal),
      dailyGoal,
      progress,
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
    
    // Simulate stress (inversely proportional to recoveryUpr)
    const stressScore = vitals ? Math.round((1 - vitals.recoveryUpr) * 100) : 30;
    
    res.json({
      score: stressScore,
      status: stressScore < 40 ? 'Relaxed' : stressScore < 70 ? 'Moderate' : 'High',
      recommendation: stressScore > 60 ? 'Consider meditation or deep breathing' : 'Keep up the good balance',
      progress: stressScore / 100,
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
    const base = vitals ? vitals.recoveryCor : 0.6;
    
    res.json({
      today: Math.round(base * 100),
      tomorrow: Math.round(Math.min(base + 0.15, 1) * 100),
      next2Days: Math.round(Math.min(base + 0.3, 1) * 100),
      fullRecovery: base > 0.9 ? 'Today' : base > 0.7 ? 'Tomorrow' : '2 Days',
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
    
    const prompt = `You are Rachel AI, a fitness coach. The user's recovery score is ${Math.round((vitals?.recoveryCor || 0) * 100)}/100, body battery is ${Math.round((vitals?.bodyBattery || 0) * 100)}%, and resting HR is ${Math.max(50, (vitals?.bpm || 72) - 15)} bpm.
Provide brief recovery advice. Respond EXACTLY in this JSON format:
{
  "summary": "1 sentence overview",
  "recommendation": "1 actionable tip"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let insights;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      insights = {
        summary: `Your recovery score is ${Math.round((vitals?.recoveryCor || 0.8) * 100)}, meaning you are well rested.`,
        recommendation: "Keep hydrating and maintain your sleep schedule.",
      };
    }

    res.json(insights);
  } catch (e: any) {
    console.error('[Recovery AI] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
