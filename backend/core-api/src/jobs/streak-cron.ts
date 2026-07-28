import prisma from '../db';
import { getIo } from '../realtime/socket';

export async function checkDailyStreaks() {
  console.log('[Jobs] Running daily streak calculation...');
  
  // Yesterday's bounds
  const now = new Date();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const users = await prisma.user.findMany();
  
  for (const user of users) {
    const workoutsYesterday = await prisma.workoutSession.count({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        createdAt: {
          gte: yesterdayStart,
          lte: yesterdayEnd
        }
      }
    });

    if (workoutsYesterday > 0) {
      // User worked out yesterday, increment streak
      const newStreak = user.currentStreak + 1;
      const newLongest = Math.max(newStreak, user.longestStreak);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { currentStreak: newStreak, longestStreak: newLongest }
      });

      const io = getIo();
      if (io) {
        io.to(user.id).emit('streak:update', { currentStreak: newStreak, longestStreak: newLongest });
      }
    } else {
      // Streak broken
      if (user.currentStreak > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { currentStreak: 0 }
        });
        const io = getIo();
        if (io) {
          io.to(user.id).emit('streak:update', { currentStreak: 0, longestStreak: user.longestStreak });
        }
      }
    }
  }
}
