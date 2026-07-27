import { Router } from 'express';
import prisma from '../../db';
import Groq from 'groq-sdk';

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper: parse period query param → days integer
function parsePeriod(period: string | undefined): number {
  switch (period) {
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 7; // 7d
  }
}

// Helper: get start date from days
function startDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: estimate calories from duration string (e.g. "45 mins")
function estimateCalories(durationStr: string): number {
  const match = durationStr?.match(/\d+/);
  const mins = match ? parseInt(match[0]) : 45;
  return Math.round(mins * 7.5);
}

// Helper: Generate exact buckets for charts
function generateBuckets(days: number, from: Date) {
  const buckets: { label: string, date: Date, value: number, count: number }[] = [];
  
  if (days === 7) {
    // 7 days -> 7 bars
    for (let i = 0; i < 7; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      buckets.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d, value: 0, count: 0 });
    }
  } else if (days === 30) {
    // 30 days -> roughly 4-5 weeks, let's do 5 buckets (Week 1, Week 2...)
    for (let i = 0; i < 5; i++) {
      buckets.push({ label: `W${i+1}`, date: new Date(from.getTime() + (i * 6 * 24 * 60 * 60 * 1000)), value: 0, count: 0 });
    }
  } else if (days === 90) {
    // 90 days -> 3 months or 12 weeks. Let's do 6 buckets (every 2 weeks)
    for (let i = 0; i < 6; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + (i * 15));
      buckets.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), date: d, value: 0, count: 0 });
    }
  } else if (days === 365) {
    // 1 year -> 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(from);
      d.setMonth(d.getMonth() + i);
      buckets.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), date: d, value: 0, count: 0 });
    }
  }
  
  return buckets;
}

// Map a date to a bucket index
function getBucketIndex(date: Date, buckets: any[]) {
  const t = date.getTime();
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (t >= buckets[i].date.getTime()) return i;
  }
  return 0;
}

// ─── GET /api/v1/analytics/overview ──────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const totalWorkouts = await prisma.workout.count({ where: { userId } });
    const totalMessages = await prisma.coachMessage.count({ where: { userId } });

    res.json({
      name: user.name,
      goal: user.goal,
      weight: user.weight,
      height: user.height,
      totalWorkouts,
      totalAiMessages: totalMessages,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/analytics/fitness-score ─────────────────────────────────────
router.get('/fitness-score', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const vitals = await prisma.vitals.findUnique({ where: { userId } });

    const recentWorkouts = await prisma.workout.count({
      where: { userId, createdAt: { gte: startDate(30) } },
    });

    const streak = user?.currentStreak ?? 0;
    const consistencyScore = Math.min(recentWorkouts * 10, 40); 
    const streakScore = Math.min(streak * 5, 30); 
    const recoveryScore = vitals ? Math.round((vitals.recoveryCor + vitals.recoveryUpr) / 2 * 30) : 15; 
    const fitnessScore = Math.min(consistencyScore + streakScore + recoveryScore, 100);

    const motivations = [
      "You're crushing it! Keep the momentum going 🔥",
      "Every rep counts. Stay consistent!",
      "Your dedication is paying off. Don't stop now!",
      "Champion mindset — keep showing up!",
      "Progress over perfection. You're doing great!",
    ];

    res.json({
      score: fitnessScore,
      consistencyScore: Math.round(consistencyScore / 40 * 100),
      recoveryScore: Math.round(recoveryScore / 30 * 100),
      streakScore: Math.round(streakScore / 30 * 100),
      streak,
      weeklyCompletion: Math.min(recentWorkouts / 4 * 100, 100), 
      motivation: motivations[Math.floor(Math.random() * motivations.length)],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/analytics/workouts?period=7d ────────────────────────────────
router.get('/workouts', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const days = parsePeriod(req.query.period as string);
    const from = startDate(days);

    const sessions = await prisma.workoutSession.findMany({
      where: { userId, status: 'COMPLETED', endTime: { gte: from } },
      include: { exercises: { include: { sets: true } } },
      orderBy: { endTime: 'asc' },
    });

    const total = sessions.length;
    
    // Exactly group by period
    const buckets = generateBuckets(days, from);
    sessions.forEach(s => {
      const idx = getBucketIndex(new Date(s.endTime!), buckets);
      
      // We can calculate total volume lifted or simply count workouts. Let's do workout count for the bar height, but also aggregate volume.
      let sessionVolume = 0;
      s.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.weight && set.reps) {
            sessionVolume += set.weight * set.reps;
          }
        });
      });
      
      buckets[idx].value += 1;
      buckets[idx].count += 1;
    });

    const maxVal = Math.max(...buckets.map(b => b.value), 1);
    const chartData = buckets.map(b => ({
      label: b.label,
      value: b.value / maxVal,
      raw: b.value,
    }));

    // For 30d+, calculate targets dynamically
    const targetPerWeek = 4;
    const weeks = Math.max(days / 7, 1);
    const targetTotal = Math.round(weeks * targetPerWeek);
    
    const completed = total;
    const missed = Math.max(targetTotal - completed, 0);
    const skipped = 0; 

    res.json({
      total,
      completed,
      missed,
      skipped,
      completionPct: total > 0 ? Math.min(Math.round(completed / targetTotal * 100), 100) : 0,
      chartData,
      workouts: sessions.slice(-5).map(s => ({
        id: s.id,
        title: s.title,
        duration: s.duration?.toString() || '45',
        exerciseCount: s.exercises.length,
        date: s.endTime,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/analytics/calories?period=7d ───────────────────────────────
router.get('/calories', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const days = parsePeriod(req.query.period as string);
    const from = startDate(days);
    
    const sessions = await prisma.workoutSession.findMany({
      where: { userId, status: 'COMPLETED', endTime: { gte: from } },
      orderBy: { endTime: 'asc' },
    });

    const totalCalories = sessions.reduce((sum, s) => sum + (s.caloriesBurned || estimateCalories(s.duration?.toString() || '45')), 0);
    const avgPerSession = sessions.length > 0 ? Math.round(totalCalories / sessions.length) : 0;

    // Exact bucketing
    const buckets = generateBuckets(days, from);
    sessions.forEach(s => {
      const idx = getBucketIndex(new Date(s.endTime!), buckets);
      const cals = s.caloriesBurned || estimateCalories(s.duration?.toString() || '45');
      buckets[idx].value += cals;
      buckets[idx].count += cals;
    });

    const maxCal = Math.max(...buckets.map(b => b.value), 100);
    const chartData = buckets.map(b => ({
      label: b.label,
      value: b.value / maxCal,
      raw: b.value,
    }));

    res.json({
      total: totalCalories,
      dailyAvg: avgPerSession,
      weeklyAvg: Math.round(totalCalories / Math.max(days / 7, 1)),
      chartData,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/analytics/weight ────────────────────────────────────────────
router.get('/weight', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const currentWeight = user?.weight ?? 0;

    // We don't have body_metrics table populated, so we return exact flat data
    // to reflect reality, avoiding fake data.
    const trend = Array.from({ length: 7 }).map((_, i) => ({
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      value: currentWeight,
    }));

    res.json({
      current: currentWeight,
      change: 0,
      unit: 'kg',
      trend,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/analytics/strength ──────────────────────────────────────────
router.get('/strength', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // EXACT data parsing from existing user workouts
    const workouts = await prisma.workout.findMany({
      where: { userId },
      include: { exercises: true },
    });

    const allExercises = workouts.flatMap(w => w.exercises);

    const findMax = (names: string[]) => {
      const matches = allExercises.filter(e =>
        names.some(n => e.name.toLowerCase().includes(n.toLowerCase()))
      );
      if (matches.length === 0) return 0; // Exactly 0 if no data
      const maxWeight = Math.max(...matches.map(e => {
        const w = parseFloat(e.weight || '0');
        return isNaN(w) ? 0 : w;
      }));
      return maxWeight > 0 ? maxWeight : 0;
    };

    const bench = findMax(['bench', 'chest press', 'push']);
    const squat = findMax(['squat', 'leg press']);
    const deadlift = findMax(['deadlift', 'dead lift', 'rdl']);
    const pullup = findMax(['pull', 'chin']);
    const ohp = findMax(['overhead', 'ohp', 'shoulder press', 'military']);

    // If no data is logged at all, we'll return 0s so the UI can show empty state
    if (bench === 0 && squat === 0 && deadlift === 0 && pullup === 0 && ohp === 0) {
      return res.json({
        benchPress: 0, squat: 0, deadlift: 0, pullUps: 0, overheadPress: 0,
        radarData: null
      });
    }

    const maxLift = Math.max(bench, squat, deadlift, pullup, ohp, 10); // cap at 10 to avoid div0

    res.json({
      benchPress: bench,
      squat,
      deadlift,
      pullUps: pullup,
      overheadPress: ohp,
      radarData: [
        { label: 'Bench', value: bench / maxLift },
        { label: 'Squat', value: squat / maxLift },
        { label: 'Deadlift', value: deadlift / maxLift },
        { label: 'Pull-ups', value: pullup / maxLift },
        { label: 'OHP', value: ohp / maxLift },
      ],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/analytics/streak ────────────────────────────────────────────
router.get('/streak', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const workouts = await prisma.workout.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDays = new Set(
      workouts.map(w => new Date(w.createdAt).toDateString())
    );

    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (workoutDays.has(d.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    res.json({
      currentStreak: streak,
      longestStreak: Math.max(streak, user?.currentStreak ?? 0),
      totalWorkouts: workouts.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/analytics/ai-insights ───────────────────────────────────────
router.get('/ai-insights', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const workoutCount = await prisma.workout.count({
      where: { userId, createdAt: { gte: startDate(7) } },
    });

    // We shouldn't invoke AI if there are 0 workouts logged
    if (workoutCount === 0) {
      return res.json({
        weeklySummary: "You haven't logged any workouts this week.",
        performanceTrend: "No data available to analyze trends.",
        recoverySuggestion: "Start your week strong by logging a new session.",
        recommendation: "Plan your first workout today!"
      });
    }

    const prompt = `You are Rachel AI fitness coach. Based on this user's data, provide brief analytics insights.
User: ${user.name}, Goal: ${user.goal || 'General Fitness'}, Workouts this week: ${workoutCount}
Respond in this exact JSON format (no markdown):
{
  "weeklySummary": "2 sentences about their week",
  "performanceTrend": "1 sentence trend observation",
  "recoverySuggestion": "1 sentence recovery tip",
  "recommendation": "1 specific actionable recommendation"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    let insights;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      insights = {
        weeklySummary: `You completed ${workoutCount} workouts this week. Keep pushing!`,
        performanceTrend: 'Your consistency is building a strong foundation.',
        recoverySuggestion: 'Prioritize 7-8 hours of sleep for optimal muscle recovery.',
        recommendation: `Aim for ${4 - workoutCount > 0 ? 4 - workoutCount : 1} more sessions this week to hit your goal.`,
      };
    }

    res.json(insights);
  } catch (e: any) {
    console.error('[Analytics AI] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
