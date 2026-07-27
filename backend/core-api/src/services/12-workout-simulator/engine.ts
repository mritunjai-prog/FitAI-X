import { calculateFatigueCascade } from '../09-ai-exercise-graph/graph';
import prisma from '../../db';

/**
 * Predicts how a theoretical workout will impact the user's fatigue tomorrow.
 */
export async function simulateWorkoutImpact(userId: string, proposedExercises: Array<{ name: string, sets: number, reps: number, weight: string }>) {
  // 1. Get current vitals
  const vitals = await prisma.vitals.findUnique({ where: { userId } });
  const currentBattery = vitals ? vitals.bodyBattery : 0.8;

  // 2. Mock a temporary workout to run through the graph
  const mockWorkout = {
    exercises: proposedExercises.map(e => ({ name: e.name }))
  };

  // 3. Calculate fatigue from this theoretical workout
  const predictedFatigue = calculateFatigueCascade([mockWorkout as any]);

  // 4. Estimate Body Battery impact
  // Roughly 2% drain per set
  const totalSets = proposedExercises.reduce((sum, ex) => sum + ex.sets, 0);
  const batteryDrain = (totalSets * 0.02);
  const predictedBattery = Math.max(0, currentBattery - batteryDrain);

  return {
    predictedBattery: parseFloat(predictedBattery.toFixed(2)),
    predictedMuscleFatigue: predictedFatigue,
    message: `This workout will drop your Body Battery by ${(batteryDrain * 100).toFixed(0)}%. High fatigue expected in ${Object.keys(predictedFatigue).join(', ')}.`
  };
}
