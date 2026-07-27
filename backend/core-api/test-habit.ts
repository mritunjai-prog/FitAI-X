import prisma from './src/db';
import { runStreakProtectionCheck } from './src/services/16-streak-protection/engine';

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) return;
  console.log(`Setting up streak test for user: ${user.id}`);

  // 1. Give them an active streak
  await prisma.user.update({
    where: { id: user.id },
    data: { currentStreak: 5 }
  });

  // 2. Delete any workouts from today to trigger the warning
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  await prisma.workout.deleteMany({
    where: {
      userId: user.id,
      createdAt: { gte: startOfDay }
    }
  });

  // 3. Run the engine
  console.log('Running Streak Protection Engine...');
  const result = await runStreakProtectionCheck(user.id);
  
  console.log('Engine Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
