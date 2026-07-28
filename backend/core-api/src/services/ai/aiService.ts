import prisma from '../../db';
import { generateText, generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const provider = process.env.AI_PROVIDER || 'groq'; // 'groq' or 'google'
const modelName = process.env.AI_MODEL || (provider === 'google' ? 'gemini-1.5-flash' : 'llama-3.1-8b-instant');

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
    recoveryFlags
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
    })
  ]);

  if (!user) throw new Error('User not found');

  const todayCals = nutritionToday.reduce((sum, log) => sum + log.cals, 0);
  const todayProtein = nutritionToday.reduce((sum, log) => sum + (log.protein || 0), 0);
  const todayCarbs = nutritionToday.reduce((sum, log) => sum + (log.carbs || 0), 0);
  const todayFat = nutritionToday.reduce((sum, log) => sum + (log.fats || 0), 0);

  return {
    profile: {
      name: user.name,
      goal: user.goal,
      experience: user.experience,
      diet: nutritionPref?.dietType || user.diet,
      allergies: nutritionPref?.allergies,
      dislikedFoods: nutritionPref?.dislikedFoods,
      weight: user.weight,
      height: user.height,
      age: user.age,
      injuries: user.currentInjuries || user.pastInjuries
    },
    streak: {
      current: user.currentStreak,
      xpTotal: user.xpTotal,
      lastReason: user.lastStreakReason
    },
    currentWorkout: currentWorkout ? {
      id: currentWorkout.id,
      title: currentWorkout.title,
      exercises: currentWorkout.exercises.map(e => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup, status: e.status }))
    } : null,
    weeklyHistory: sessions.map(s => ({
      date: s.createdAt.toISOString().split('T')[0],
      duration: s.duration,
      status: s.status,
      exercises: s.exercises.length
    })),
    nutritionToday: { calories: todayCals, protein: todayProtein, carbs: todayCarbs, fat: todayFat },
    recoveryFlags: recoveryFlags.map(f => ({ muscleGroup: f.muscleGroup, riskLevel: f.riskLevel, mitigation: f.mitigation }))
  };
}

export async function callAI({ system, prompt, schema, tools, maxSteps = 1, messages = [] }: any) {
  try {
    const input = messages.length > 0 ? { messages } : { prompt };

    if (schema) {
      // Structured JSON output
      const result = await generateObject({
        model: getModel(),
        system,
        ...input,
        schema,
        mode: 'json',
      });
      return { ok: true, data: result.object };
    } else {
      // Free text / tool output
      const result = await generateText({
        model: getModel(),
        system,
        ...input,
        tools,
      });
      return { ok: true, text: result.text, toolResults: result.toolResults };
    }
  } catch (error: any) {
    console.error('[AI Service Error]', error.message);
    return { ok: false, error: error.message };
  }
}
