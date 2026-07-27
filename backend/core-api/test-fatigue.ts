import prisma from './src/db';
import { calculateMuscleFatigue } from './src/services/09-ai-exercise-graph/graph';

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  console.log(`Testing for user: ${user.id}`);

  // Fetch from the API by fetching from DB to simulate the route
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  
  const recentWorkouts = await prisma.workout.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: seventyTwoHoursAgo },
      deletedAt: null
    },
    include: {
      exercises: true
    }
  });

  const recentExercises = recentWorkouts.flatMap(w => 
    w.exercises.map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      completedAt: w.createdAt
    }))
  );

  const fatigue = calculateMuscleFatigue(recentExercises, new Date());
  console.log('Fatigue Map:', JSON.stringify(fatigue, null, 2));
}

main().catch(console.error);
