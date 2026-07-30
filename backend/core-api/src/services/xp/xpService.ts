/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FitAI X — XP & STREAK ENGINE
 *  Awards XP for workouts, streaks, nutrition, hydration, sleep.
 *  Updates automatically when events happen.
 * ════════════════════════════════════════════════════════════════════════════
 */
import prisma from '../../db';

export type XpEvent = 
  | 'workout_completed'
  | 'workout_streak'
  | 'meal_logged'
  | 'water_logged'
  | 'protein_goal_met'
  | 'sleep_goal_met'
  | 'personal_record'
  | 'goal_completed'
  | 'daily_login'
  | 'nutrition_adherence';

const XP_REWARDS: Record<XpEvent, number> = {
  workout_completed: 50,
  workout_streak: 25,    // bonus for consecutive days
  meal_logged: 10,
  water_logged: 5,
  protein_goal_met: 20,
  sleep_goal_met: 15,
  personal_record: 100,
  goal_completed: 200,
  daily_login: 10,
  nutrition_adherence: 30,
};

/** Calculate user level from total XP */
export function calculateLevel(totalXp: number): { level: number; currentXp: number; nextLevelXp: number } {
  const level = Math.floor(totalXp / 500) + 1;
  const currentXp = totalXp % 500;
  const nextLevelXp = 500;
  return { level, currentXp, nextLevelXp };
}

/** Award XP to a user and return updated totals */
export async function awardXp(userId: string, event: XpEvent, reason?: string): Promise<{
  xpAwarded: number;
  totalXp: number;
  level: number;
  newBadge?: string;
}> {
  const xpAmount = XP_REWARDS[event] || 10;
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const newTotal = (user.xpTotal || 0) + xpAmount;
  const oldLevel = Math.floor((user.xpTotal || 0) / 500) + 1;
  const newLevel = Math.floor(newTotal / 500) + 1;

  await prisma.user.update({
    where: { id: userId },
    data: { 
      xpTotal: newTotal,
      xpLastEarned: Date.now(),
      lastStreakReason: reason || event,
    }
  });

  // Level up badge check
  let newBadge: string | undefined;
  if (newLevel > oldLevel) {
    const badges = ['🥉 Iron', '🥈 Bronze', '🥇 Silver', '💎 Gold', '🔥 Platinum', '👑 Diamond', '⭐ Elite', '🌟 Legend'];
    const badgeIndex = Math.min(newLevel - 1, badges.length - 1);
    newBadge = badges[badgeIndex];
  }

  return {
    xpAwarded: xpAmount,
    totalXp: newTotal,
    level: newLevel,
    newBadge,
  };
}

/** Check and update streak after a workout */
export async function updateStreak(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  streakContinued: boolean;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if already worked out today (prevents double-counting)
  const todaySessions = await prisma.workoutSession.count({
    where: {
      userId,
      status: 'COMPLETED',
      createdAt: { gte: today },
    }
  });

  if (todaySessions > 1) {
    // Already counted for today
    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      streakContinued: true,
    };
  }

  // Check if last workout was yesterday (continuing streak)
  const lastSession = await prisma.workoutSession.findFirst({
    where: { userId, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    skip: todaySessions > 0 ? 1 : 0,
  });

  let newStreak = 1;
  if (lastSession) {
    const lastDate = new Date(lastSession.createdAt);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
    
    if (diffDays <= 1) {
      newStreak = user.currentStreak + 1;
    }
  }

  const newLongest = Math.max(newStreak, user.longestStreak || 0);

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
    }
  });

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    streakContinued: newStreak > (user.currentStreak || 0),
  };
}

/** Get full XP/stats for a user */
export async function getUserStats(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const { level, currentXp, nextLevelXp } = calculateLevel(user.xpTotal || 0);

  // Tier names
  const tiers = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Legend'];
  const tierIndex = Math.min(level - 1, tiers.length - 1);
  const tier = tiers[Math.max(0, tierIndex)];

  // Weekly XP
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const weeklySessions = await prisma.workoutSession.count({
    where: { userId, status: 'COMPLETED', createdAt: { gte: weekAgo } }
  });

  const totalWorkouts = await prisma.workoutSession.count({
    where: { userId, status: 'COMPLETED' }
  });

  // Today's earned XP
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySessions = await prisma.workoutSession.count({
    where: { userId, status: 'COMPLETED', createdAt: { gte: today } }
  });
  const todayXp = todaySessions * 50;

  return {
    totalXp: user.xpTotal || 0,
    level,
    tier,
    currentXp: currentXp,
    nextLevelXp,
    todayXp,
    currentLevelXp: currentXp, // maintain legacy key
    rankLabel: tierIndex <= 1 ? 'Top 100%' : tierIndex <= 3 ? 'Top 25%' : tierIndex <= 5 ? 'Top 10%' : 'Top 5%',
    streak: user.currentStreak || 0,
    longestStreak: user.longestStreak || 0,
    weeklyWorkouts: weeklySessions,
    totalWorkouts,
    xpProgressPct: Math.round((currentXp / nextLevelXp) * 100),
  };
}
