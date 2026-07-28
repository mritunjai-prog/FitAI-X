import prisma from '../db';
import { aiQueue } from '../jobs/queue';
import { buildUserContext, callAI } from '../services/ai/aiService';
import AppEvents, { EVENTS } from '../core/events';
import { registerListeners } from '../core/listeners';

async function runTestJourney() {
  console.log('--- STARTING DUMMY USER JOURNEY TEST ---');

  // 1. Create a dummy user
  const email = `dummy_${Date.now()}@example.com`;
  console.log(`Creating dummy user: ${email}`);
  const user = await prisma.user.create({
    data: {
      email,
      password: 'password123',
      name: 'Test Journey User',
      goal: 'Build Muscle',
      experience: 'Beginner',
      diet: 'Any',
      weight: 70,
      height: 175,
      age: 25,
    }
  });
  console.log(`User created with ID: ${user.id}`);

  // 2. Add an old workout session to give them some history
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const oldWorkout = await prisma.workout.create({
    data: {
      userId: user.id,
      title: 'Old Dummy Workout',
      duration: '45 mins',
      aiExplanation: 'Old workout',
    }
  });

  await prisma.workoutSession.create({
    data: {
      userId: user.id,
      workoutId: oldWorkout.id,
      duration: 45,
      status: 'completed',
      createdAt: threeDaysAgo,
      title: 'Old Dummy Workout'
    }
  });
  
  // Also create an active RecoveryFlag to test the context builder
  await prisma.recoveryFlag.create({
    data: {
      userId: user.id,
      muscleGroup: 'Shoulders',
      riskLevel: 'HIGH',
      mitigation: 'Avoid heavy overhead presses.',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  // 3. Trigger Workout Generation (via aiService)
  console.log('\n--- Testing aiService buildUserContext ---');
  const context = await buildUserContext(user.id);
  console.log('User Context Built:', JSON.stringify(context, null, 2));
  
  console.log('\n--- Testing Workout Generation (Fallback expected due to API issues) ---');
  const genResponse = await fetch('http://localhost:4000/api/v1/workouts/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
    body: JSON.stringify({ prompt: "I want a beginner leg day" })
  });
  
  const genData = await genResponse.json();
  console.log('Generate Response:', JSON.stringify(genData, null, 2));

  // 4. Save a workout manually to simulate generating one
  console.log('\n--- Creating Workout ---');
  const workout = await prisma.workout.create({
    data: {
      userId: user.id,
      title: genData.title || 'Leg Day',
      duration: genData.duration || '30 mins',
      aiExplanation: genData.aiExplanation || 'Generated plan',
      isCurrent: true,
      exercises: {
        create: (genData.exercises || []).map((e: any, i: number) => ({
          name: e.name,
          muscleGroup: e.muscleGroup,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          restTime: e.restTime,
          order: i,
          status: 'pending'
        }))
      }
    },
    include: { exercises: true }
  });
  
  console.log(`Created Workout ID: ${workout.id}`);

  // 5. Start a session
  console.log('\n--- Starting Workout Session ---');
  const session = await prisma.workoutSession.create({
    data: {
      userId: user.id,
      workoutId: workout.id,
      duration: 35, // 35 minutes
      status: 'active',
      title: workout.title
    }
  });
  console.log(`Session ID: ${session.id}`);
  
  // 6. Complete exercises and finish session
  console.log('\n--- Completing Exercises and Triggering Event ---');
  for (const ex of workout.exercises) {
    await prisma.exercise.update({ where: { id: ex.id }, data: { status: 'done' } });
  }
  
  // Emit event manually to simulate what workouts.ts does
  registerListeners(); // Attach the listeners
  
  AppEvents.emit(EVENTS.WORKOUT_COMPLETED, {
    userId: user.id,
    workoutId: workout.id,
    sessionId: session.id
  });
  
  console.log('Event emitted. Waiting 5 seconds for BullMQ to process streak evaluation...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 7. Check DB for user streak updates
  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('\n--- Streak Evaluation Results ---');
  console.log(`Current Streak: ${updatedUser?.currentStreak}`);
  console.log(`Total XP: ${updatedUser?.xpTotal}`);
  console.log(`Last XP Earned: ${updatedUser?.xpLastEarned}`);
  console.log(`Last Streak Reason: ${updatedUser?.lastStreakReason}`);

  console.log('\n--- Cleaning up dummy user ---');
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Done.');
  process.exit(0);
}

runTestJourney().catch(console.error);
