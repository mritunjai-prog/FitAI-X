import prisma from '../db';
import { callAI, buildUserContext } from '../services/ai/aiService';
import { z } from 'zod';

export async function generateWeeklyRecommendations() {
  console.log('[Jobs] Running weekly AI recommendations...');
  
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    // 1. Get all completed workouts in the last 7 days
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        createdAt: { gte: weekStart }
      },
      include: {
        exercises: true
      }
    });

    if (sessions.length === 0) continue; // Skip if no workouts

    // 2. Aggregate muscle volume
    const muscleVolume: Record<string, number> = {};
    sessions.forEach(s => {
      s.exercises.forEach(ex => {
        // Since we don't have muscleGroup strictly on session exercise, we can infer it or we fetch the original workout exercises.
        // Assuming the prompt expects a simple count:
        const group = ex.name.split(' ')[0]; // Fallback if muscleGroup not stored directly on SessionEx
        muscleVolume[group] = (muscleVolume[group] || 0) + 1;
      });
    });

    // 3. Call AI
    const userContext = await buildUserContext(user.id);
    const schema = z.object({
      undertrainedMuscles: z.array(z.string()),
      overtrainedMuscles: z.array(z.string()),
      suggestions: z.array(z.object({
        name: z.string(),
        reason: z.string()
      }))
    });

    const aiResult = await callAI({
      system: `You are Rachel, an AI fitness coach. Analyze the user's weekly muscle volume and context. Identify overtrained and undertrained muscles. Provide corrective exercise suggestions.`,
      prompt: `User Context: ${JSON.stringify(userContext)}\n\nWeekly Muscle Volume (Exercise Counts): ${JSON.stringify(muscleVolume)}`,
      schema
    });

    if (aiResult.ok && aiResult.data) {
      await prisma.aiRecommendation.create({
        data: {
          userId: user.id,
          weekStart,
          weekEnd: now,
          undertrainedMuscles: JSON.stringify(aiResult.data.undertrainedMuscles),
          overtrainedMuscles: JSON.stringify(aiResult.data.overtrainedMuscles),
          suggestions: JSON.stringify(aiResult.data.suggestions)
        }
      });
    }
  }
}
