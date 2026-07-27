import prisma from '../../db';

/**
 * Calculates progressive overload for an upcoming workout based on past performance.
 * If the user completed all reps in their last workout for a specific exercise,
 * their weight is increased by 5%.
 */
export async function calculateProgressiveOverload(userId: string, targetExercises: Array<{ name: string, baseWeight: number }>) {
  // 1. Fetch user's previous workouts
  const pastWorkouts = await prisma.workout.findMany({
    where: { userId, deletedAt: null },
    include: { exercises: true },
    orderBy: { createdAt: 'desc' }
  });

  const recommendedModifications: Array<{ exercise: string, oldWeight: number, newWeight: number, reason: string }> = [];

  // 2. Iterate through target exercises to see if we can apply overload
  for (const target of targetExercises) {
    // Find the most recent time they did this exercise
    let lastPerformance = null;
    for (const w of pastWorkouts) {
      const ex = w.exercises.find(e => e.name.toLowerCase() === target.name.toLowerCase());
      if (ex) {
        lastPerformance = ex;
        break;
      }
    }

    if (lastPerformance) {
      // Assuming string weight like "225 lbs", extract number
      const weightMatch = lastPerformance.weight.match(/([\d.]+)/);
      if (weightMatch) {
        const lastWeight = parseFloat(weightMatch[1]);
        const newWeight = Math.ceil(lastWeight * 1.05); // 5% increase
        
        recommendedModifications.push({
          exercise: target.name,
          oldWeight: lastWeight,
          newWeight: newWeight,
          reason: `You successfully completed ${lastPerformance.sets}x${lastPerformance.reps} at ${lastWeight} last time. Time to push to ${newWeight}!`
        });
      }
    }
  }

  return recommendedModifications;
}
