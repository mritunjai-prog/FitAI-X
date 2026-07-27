import prisma from './src/db';

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  console.log(`Injecting dummy data for user: ${user.id}`);

  // 1. Inject poor vitals (low systemic recovery)
  await prisma.vitals.upsert({
    where: { userId: user.id },
    update: {
      recoveryCor: 0.3, // 30% recovery -> 70% unrecovered -> Adds a lot of risk
      bodyBattery: 0.25,
      bpm: 85,
    },
    create: {
      userId: user.id,
      recoveryCor: 0.3,
      bodyBattery: 0.25,
      bpm: 85,
      recoveryUpr: 0.5,
      recoveryLwr: 0.5,
      recoveryCrd: 0.5,
      moveProgress: 0.8,
      waterProgress: 0.6,
      trainProgress: 0.4,
    }
  });

  // 2. Inject heavy workout yesterday to spike muscle fatigue
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  const workout = await prisma.workout.create({
    data: {
      userId: user.id,
      title: 'Heavy Push Day',
      duration: '65 min',
      createdAt: yesterday,
      exercises: {
        create: [
          { name: 'Barbell Bench Press', sets: 5, reps: 5, weight: '225 lbs' },
          { name: 'Overhead Press', sets: 4, reps: 8, weight: '135 lbs' },
          { name: 'Tricep Extension', sets: 4, reps: 12, weight: '60 lbs' }
        ]
      }
    }
  });

  console.log(`Injected Heavy Push Workout!`);
  console.log(`User now has high fatigue in Chest, Shoulders, and Triceps.`);
  console.log(`Combined with 30% Systemic Recovery, this should trigger an Injury Warning!`);
}

main().catch(console.error);
