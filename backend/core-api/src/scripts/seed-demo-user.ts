import prisma from '../db';

async function main() {
  await prisma.user.upsert({
    where: { id: 'demo-user-id' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@example.com',
      password: 'dummy',
      name: 'Demo User'
    }
  });
  
  await prisma.workout.upsert({
    where: { id: 'mock-workout-id' },
    update: {},
    create: {
      id: 'mock-workout-id',
      userId: 'demo-user-id',
      title: 'Push Strength',
      isCurrent: true,
      duration: '45',
      difficulty: 'Intermediate',
      targetMuscles: 'Chest, Shoulders, Triceps',
      exercises: {
        create: [
          { name: 'Barbell Bench Press', sets: 4, reps: 8, weight: '80', order: 0, restTime: 90 },
          { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: '30', order: 1, restTime: 90 },
          { name: 'Overhead Press', sets: 3, reps: 10, weight: '45', order: 2, restTime: 90 },
          { name: 'Lateral Raises', sets: 4, reps: 15, weight: '12', order: 3, restTime: 60 },
          { name: 'Tricep Pushdown', sets: 3, reps: 12, weight: '25', order: 4, restTime: 60 }
        ]
      }
    }
  });

  console.log('Upserted demo-user-id and mock workout');
}

main().catch(console.error).finally(() => prisma.$disconnect());
