import prisma from '../../db';
import { callAI, buildUserContext } from './aiService';
import { z } from 'zod';
import { getIo } from '../../realtime/socket';

export async function evaluateStreak(userId: string, durationMinutes: number, scheduledDay: boolean) {
  try {
    const userContext = await buildUserContext(userId);
    
    const schema = z.object({
      continues: z.boolean(),
      newStreak: z.number(),
      xpEarned: z.number(),
      reason: z.string()
    });

    const aiResult = await callAI({
      system: `You are evaluating a user's fitness streak.
The user just completed a workout.
Evaluate if their streak continues based on:
1. Did they train for at least 15 minutes? (If not, they can still keep the streak if it's a scheduled day but maybe less XP).
2. Was it a scheduled day?
Give XP based on difficulty and effort (max 100 XP per workout).
Return the updated streak count (current is ${userContext.streak.current}), XP earned, and a 1-sentence encouraging reason.`,
      prompt: `Duration: ${durationMinutes} minutes. Scheduled day: ${scheduledDay}.`,
      schema
    });

    if (!aiResult.ok || !aiResult.data) {
      console.error('Streak evaluation failed', aiResult.error);
      return;
    }

    const { continues, newStreak, xpEarned, reason } = aiResult.data;

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        xpTotal: { increment: xpEarned },
        xpLastEarned: xpEarned,
        lastStreakReason: reason
      }
    });

    const io = getIo();
    io.to(userId).emit('streak_updated', {
      continues,
      newStreak,
      xpEarned,
      reason
    });

  } catch (error) {
    console.error('Error in streak evaluation:', error);
  }
}
