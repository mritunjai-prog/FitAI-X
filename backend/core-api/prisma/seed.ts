import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with demo data...')

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@fitaix.com' },
    update: {},
    create: {
      email: 'demo@fitaix.com',
      password: 'demo123',
      name: 'Demo User',
      avatar: 'https://i.pravatar.cc/150?img=11',
      age: 28,
      weight: 75,
      height: 178,
      gender: 'Male',
      experience: 'Intermediate',
      goal: 'Build Muscle',
      equipment: 'Full Gym',
      diet: 'Non-Vegetarian',
      currentStreak: 3,
      longestStreak: 12,
      xpTotal: 450,
    },
  });
  console.log(`✅ Created demo user: ${user.id}`);

  // Create vitals for the user
  await prisma.vitals.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      bpm: 68,
      recoveryUpr: 0.85,
      recoveryLwr: 0.72,
      recoveryCor: 0.78,
      recoveryCrd: 0.64,
      bodyBattery: 82,
      moveProgress: 0.75,
      waterProgress: 0.6,
      trainProgress: 0.4,
      loadM: 0.3,
      loadT: 0.7,
      loadW: 0.5,
      loadTh: 0.9,
      loadF: 0.4,
      loadSa: 0.6,
      loadSu: 0.2,
    },
  });
  console.log('✅ Created vitals');

  // Create a current workout with exercises
  const workout = await prisma.workout.create({
    data: {
      userId: user.id,
      title: 'Upper Body Power',
      duration: '50',
      description: 'Chest and shoulders focus with progressive overload',
      goal: 'Build Muscle',
      difficulty: 'Intermediate',
      equipment: 'Full Gym',
      isCurrent: true,
      versionNumber: 1,
      aiExplanation: 'Chest is fully recovered (92%). Pushing volume raised +8% and bench load +2.5 kg versus your last logged session.',
      exercises: {
        create: [
          { name: 'Barbell Bench Press', muscleGroup: 'Chest', sets: 4, reps: 10, weight: '80', restTime: 90, order: 0 },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 3, reps: 10, weight: '50', restTime: 60, order: 1 },
          { name: 'Lateral Raises', muscleGroup: 'Shoulders', sets: 3, reps: 15, weight: '12', restTime: 45, order: 2 },
          { name: 'Tricep Pushdown', muscleGroup: 'Triceps', sets: 3, reps: 12, weight: '25', restTime: 45, order: 3 },
        ],
      },
    },
    include: { exercises: true },
  });
  console.log(`✅ Created workout: ${workout.id} (${workout.exercises.length} exercises)`);

  // Create a completed workout session for history
  const session = await prisma.workoutSession.create({
    data: {
      userId: user.id,
      workoutId: workout.id,
      title: 'Upper Body Power',
      startTime: new Date(Date.now() - 86400000), // yesterday
      endTime: new Date(Date.now() - 82800000), // ~1 hour later
      duration: 52,
      caloriesBurned: 380,
      status: 'COMPLETED',
      notes: 'Felt strong on bench press. Hit all reps.',
    },
  });
  console.log('✅ Created completed session');

  // Create some feed items
  await prisma.feedItem.createMany({
    data: [
      { userId: user.id, type: 'workout', message: 'Just crushed Upper Body Power! 380 kcal burned 🔥', timeStr: '30m ago', likes: 12, bpm: 148 },
      { userId: user.id, type: 'milestone', message: 'Hit a new PR on Bench Press! 85kg x 8 💪', timeStr: '2h ago', likes: 24, bpm: null },
      { userId: user.id, type: 'ai', message: 'Rachel: Great session! Your recovery is optimal for tomorrow.', timeStr: '15m ago', likes: 5, bpm: null },
    ],
  });
  console.log('✅ Created feed items');

  // Create coach messages
  await prisma.coachMessage.createMany({
    data: [
      { userId: user.id, role: 'user', content: 'Hey Rachel, what workout should I do today?' },
      { userId: user.id, role: 'ai', content: 'Good morning! Your recovery score is 82% — you\'re ready for an Upper Body Power session. I\'ve prepared a Push-focused workout with progressive overload on Bench Press. Ready to start? 💪' },
    ],
  });
  console.log('✅ Created coach messages');

  // Create calendar events for the week
  const today = new Date().getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const events = [
    { title: 'Upper Body Power', intensity: 'High' },
    { title: 'Rest Day', intensity: 'Rest' },
    { title: 'Lower Body Strength', intensity: 'High' },
    { title: 'Active Recovery', intensity: 'Low' },
    { title: 'Push Day', intensity: 'Moderate' },
    { title: 'Full Body HIIT', intensity: 'High' },
    { title: 'Rest Day', intensity: 'Rest' },
  ];

  for (let i = 0; i < 7; i++) {
    const dayIndex = (today + i) % 7;
    await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        dayIndex,
        type: 'workout',
        title: events[dayIndex].title,
        intensity: events[dayIndex].intensity,
      },
    });
  }
  console.log('✅ Created weekly calendar');

  // Create nutrition preferences
  await prisma.nutritionPreference.create({
    data: {
      userId: user.id,
      dietType: 'Non-Vegetarian',
      budget: 75,
      cookingSkill: 'Intermediate',
    },
  });
  console.log('✅ Created nutrition preferences');

  // Create some meals
  await prisma.meal.createMany({
    data: [
      { userId: user.id, name: 'Protein Oatmeal', type: 'Breakfast', cals: 450, protein: 32, carbs: 55, fats: 12, cost: 3.5 },
      { userId: user.id, name: 'Grilled Chicken Bowl', type: 'Lunch', cals: 650, protein: 48, carbs: 45, fats: 18, cost: 8.0 },
      { userId: user.id, name: 'Salmon & Sweet Potato', type: 'Dinner', cals: 720, protein: 42, carbs: 50, fats: 22, cost: 12.0 },
    ],
  });
  console.log('✅ Created meals');

  // Create memory events
  await prisma.memoryEvent.createMany({
    data: [
      { userId: user.id, title: 'Started Fitness Journey', description: 'Began training with FitAI X to build muscle and improve overall fitness.', timestamp: new Date(Date.now() - 90 * 86400000) },
      { userId: user.id, title: 'First PR: Bench Press 60kg', description: 'Finally hit the 60kg milestone on bench press after 6 weeks of consistent training.', timestamp: new Date(Date.now() - 60 * 86400000) },
      { userId: user.id, title: 'Shoulder Injury Note', description: 'Reported minor shoulder discomfort during overhead press. AI adjusted programming accordingly.', timestamp: new Date(Date.now() - 30 * 86400000) },
    ],
  });
  console.log('✅ Created memory timeline events');

  console.log('\n🎉 Seed completed! Demo user ready to use:');
  console.log('   Email: demo@fitaix.com');
  console.log('   Password: demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
