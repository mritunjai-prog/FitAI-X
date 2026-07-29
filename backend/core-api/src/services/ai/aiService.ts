import prisma from '../../db';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const provider = process.env.AI_PROVIDER || 'groq'; // 'groq' or 'google'
const modelName = process.env.AI_MODEL || (provider === 'google' ? 'gemini-1.5-flash-latest' : 'llama-3.3-70b-versatile');

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY || '' });
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });

const getModel = () => {
  if (provider === 'google') return google(modelName);
  return groq(modelName);
};

export async function buildUserContext(userId: string) {
  const [
    user,
    nutritionPref,
    currentWorkout,
    sessions,
    nutritionToday,
    recoveryFlags,
    vitals,
    waterLogs,
    calendarEvents,
    mealPlans,
    prRecords
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.nutritionPreference.findUnique({ where: { userId } }),
    prisma.workout.findFirst({
      where: { userId, isCurrent: true, deletedAt: null },
      include: { exercises: { orderBy: { order: 'asc' } } }
    }),
    prisma.workoutSession.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      include: { exercises: { include: { sets: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.foodLog.findMany({
      where: {
        userId,
        loggedAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
      }
    }),
    prisma.recoveryFlag.findMany({
      where: { userId, expiresAt: { gt: new Date() } }
    }),
    prisma.vitals.findUnique({ where: { userId } }),
    prisma.waterLog.findMany({
      where: {
        userId,
        loggedAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
      }
    }),
    prisma.calendarEvent.findMany({
      where: { userId, deletedAt: null },
      orderBy: { dayIndex: 'asc' },
      take: 14,
    }),
    prisma.meal.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: new Date(new Date().setHours(0,0,0,0)) }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.workoutPR.findMany({
      where: { userId },
      orderBy: { dateAchieved: 'desc' },
      take: 10,
    })
  ]);

  if (!user) throw new Error('User not found');

  const todayCals = nutritionToday.reduce((sum, log) => sum + log.cals, 0);
  const todayProtein = nutritionToday.reduce((sum, log) => sum + (log.protein || 0), 0);
  const todayCarbs = nutritionToday.reduce((sum, log) => sum + (log.carbs || 0), 0);
  const todayFat = nutritionToday.reduce((sum, log) => sum + (log.fats || 0), 0);

  const totalWater = waterLogs.reduce((sum, log) => sum + log.amountMl, 0);
  const recoveryScore = vitals ? Math.round(vitals.recoveryCor * 100) : null;
  const bodyBattery = vitals ? Math.round(vitals.bodyBattery * 100) : null;

  return {
    profile: {
      name: user.name,
      email: user.email,
      goal: user.goal,
      experience: user.experience,
      gender: user.gender,
      diet: nutritionPref?.dietType || user.diet,
      allergies: nutritionPref?.allergies || user.allergies,
      dislikedFoods: nutritionPref?.dislikedFoods,
      favoriteFoods: nutritionPref?.favoriteFoods,
      cookingSkill: nutritionPref?.cookingSkill,
      weight: user.weight,
      height: user.height,
      age: user.age,
      injuries: user.currentInjuries || user.pastInjuries,
      medicalConditions: user.medicalConditions,
      physicalLimitations: user.physicalLimitations,
      medications: user.medications,
      equipment: user.equipment,
    },
    stats: {
      streak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      xpTotal: user.xpTotal || 0,
      xpLevel: Math.floor((user.xpTotal || 0) / 500) + 1,
      totalWorkouts: sessions.length,
    },
    vitals: vitals ? {
      bpm: vitals.bpm,
      hrv: vitals.hrv,
      recoveryCor: vitals.recoveryCor,
      recoveryUpr: vitals.recoveryUpr,
      bodyBattery: vitals.bodyBattery,
      waterProgress: vitals.waterProgress,
      recoveryScore,
      bodyBatteryPct: bodyBattery,
    } : null,
    currentWorkout: currentWorkout ? {
      id: currentWorkout.id,
      title: currentWorkout.title,
      description: currentWorkout.description,
      goal: currentWorkout.goal,
      difficulty: currentWorkout.difficulty,
      exercises: currentWorkout.exercises.map(e => ({
        id: e.id, name: e.name, sets: e.sets, reps: e.reps,
        weight: e.weight, muscleGroup: e.muscleGroup, restTime: e.restTime,
        notes: e.notes, status: e.status
      }))
    } : null,
    weeklyHistory: sessions.map(s => ({
      date: s.createdAt.toISOString().split('T')[0],
      title: s.title,
      duration: s.duration,
      status: s.status,
      caloriesBurned: s.caloriesBurned,
      exercises: s.exercises.length,
      volume: s.exercises.reduce((vol, ex) =>
        vol + ex.sets.reduce((sVol, set) => sVol + ((set.weight || 0) * (set.reps || 0)), 0), 0
      ),
    })),
    nutritionToday: {
      calories: todayCals,
      protein: todayProtein,
      carbs: todayCarbs,
      fat: todayFat,
      waterMl: totalWater,
    },
    nutritionPreference: nutritionPref ? {
      dietType: nutritionPref.dietType,
      allergies: nutritionPref.allergies,
      dislikedFoods: nutritionPref.dislikedFoods,
      favoriteFoods: nutritionPref.favoriteFoods,
      budget: nutritionPref.budget,
      cookingSkill: nutritionPref.cookingSkill,
    } : null,
    mealPlans: mealPlans.map(m => ({
      type: m.type,
      name: m.name,
      cals: m.cals,
      protein: m.protein,
      carbs: m.carbs,
      fats: m.fats,
    })),
    recoveryFlags: recoveryFlags.map(f => ({
      muscleGroup: f.muscleGroup,
      riskLevel: f.riskLevel,
      mitigation: f.mitigation,
      expiresAt: f.expiresAt,
    })),
    calendar: calendarEvents.map(e => ({
      dayIndex: e.dayIndex,
      title: e.title,
      type: e.type,
      intensity: e.intensity,
    })),
    personalRecords: prRecords.map(p => ({
      exercise: p.exerciseName,
      weight: p.weight,
      reps: p.reps,
      date: p.dateAchieved,
    })),
    weeklyWorkoutCount: sessions.filter(s => s.status === 'COMPLETED' || s.status === 'IN_PROGRESS').length,
  };
}

/**
 * AI Service — calls LLM with text or structured JSON output.
 * Uses generateText under the hood for maximum model compatibility
 * (avoids json_schema mode which many models don't support).
 */
export async function callAI({ system, prompt, schema, tools, maxSteps = 1, messages = [] }: any) {
  try {
    const input = messages.length > 0 ? { messages } : { prompt };

    if (schema) {
      // Use Zod 4's built-in toJSONSchema() method
      let schemaDescription = '{\n  "type": "object"\n}';
      try {
        if (typeof schema.toJSONSchema === 'function') {
          schemaDescription = JSON.stringify(schema.toJSONSchema(), null, 2);
        }
      } catch (e) {
        console.warn('[AI] Schema serialization failed, using generic', e);
      }
      const jsonSystem = `${system || ''}\n\nIMPORTANT: You MUST respond with ONLY valid JSON that matches this exact schema:\n${schemaDescription}\n\nDo NOT include markdown, backticks, or any text outside the JSON. Just output raw JSON.`;
      
      const result = await generateText({
        model: getModel(),
        system: jsonSystem,
        ...input,
        temperature: 0.3,
      });

      // Parse the response — strip any accidental markdown wrappers
      let cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      // Find first { and last }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(cleaned);
      return { ok: true, data: parsed };
    } else {
      // Free text / tool output
      const result = await generateText({
        model: getModel(),
        system,
        ...input,
        tools,
        maxSteps,
      });
      return { ok: true, text: result.text, toolResults: result.toolResults };
    }
  } catch (error: any) {
    console.error('[AI Service Error]', error.message);
    return { ok: false, error: error.message };
  }
}
