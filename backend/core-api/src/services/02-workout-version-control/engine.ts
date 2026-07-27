import prisma from '../../db';

/**
 * Workout Version Control Engine (FR-002)
 * 
 * Creates a new "branch" of an existing workout (e.g. if the user modifies an AI-generated workout).
 * It preserves the original workout history while incrementing the version number.
 */
export async function branchWorkout(originalWorkoutId: string, modifications: { exercises: Array<{ name: string, sets: number, reps: number, weight: string }> }) {
  const original = await prisma.workout.findUnique({
    where: { id: originalWorkoutId },
    include: { exercises: true }
  });

  if (!original) throw new Error('Original workout not found');

  // Mark original as no longer the current version
  await prisma.workout.update({
    where: { id: originalWorkoutId },
    data: { isCurrent: false }
  });

  // Create the new branched version
  const newVersion = await prisma.workout.create({
    data: {
      userId: original.userId,
      title: `${original.title} (v${original.versionNumber + 1})`,
      duration: original.duration,
      parentVersionId: original.id,
      versionNumber: original.versionNumber + 1,
      isCurrent: true,
      aiExplanation: 'User modified this workout branch.',
      exercises: {
        create: modifications.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight
        }))
      }
    },
    include: { exercises: true }
  });

  return newVersion;
}
