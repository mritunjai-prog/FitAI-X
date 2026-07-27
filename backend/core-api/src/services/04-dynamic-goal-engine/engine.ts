import prisma from '../../db';

/**
 * Checks a user's progress toward their stated goals.
 * If they are stagnating, Rachel recommends shifting the goal to prevent burnout.
 */
export async function evaluateDynamicGoal(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.goal) return { status: 'no_goal' };

  // In a full implementation, we would query a historical weight log table.
  // Here we mock the detection of a "weight loss plateau".
  
  if (user.goal.toLowerCase() === 'lose weight') {
    // Simulate detecting a 3-week plateau
    const hasPlateau = true;

    if (hasPlateau) {
      await prisma.coachMessage.create({
        data: {
          userId,
          role: 'Rachel',
          content: "I noticed your weight has been stable for the last 3 weeks despite your 'Lose Weight' goal. It's totally normal to hit a plateau! Would you like me to shift your goal to 'Maintenance' for a few weeks to give your metabolism a diet break, or should we drop your daily calories by 200?"
        }
      });
      return { status: 'plateau_detected', action: 'message_sent' };
    }
  }

  return { status: 'on_track' };
}
