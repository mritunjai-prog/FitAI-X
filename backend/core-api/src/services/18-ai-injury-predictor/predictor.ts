import { calculateMuscleFatigue, MuscleGroup } from '../09-ai-exercise-graph/graph';
import prisma from '../../db';

export interface InjuryRisk {
  muscle: MuscleGroup;
  riskScore: number; // 0 to 100
  status: 'cleared' | 'elevated' | 'warning';
}

/**
 * Calculates injury risk for all muscle groups.
 * Formula: (Muscle Fatigue * 0.6) + ((1 - Systemic Recovery) * 0.4)
 * @param userId The ID of the user
 */
export async function calculateInjuryRisks(userId: string): Promise<InjuryRisk[]> {
  // 1. Fetch user's vitals for systemic recovery
  const vitals = await prisma.vitals.findUnique({ where: { userId } });
  
  // Default to 1.0 (100% recovered) if no vitals exist
  const systemicRecovery = vitals ? vitals.recoveryCor : 1.0; 

  // 2. Fetch user's recent exercises for localized fatigue
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const recentWorkouts = await prisma.workout.findMany({
    where: { userId, createdAt: { gte: seventyTwoHoursAgo }, deletedAt: null },
    include: { exercises: true }
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

  // 3. Calculate isolated muscle fatigue (0-100 scale)
  const fatigueMap = calculateMuscleFatigue(recentExercises, new Date());

  const risks: InjuryRisk[] = [];

  // 4. Combine into final Risk Score
  for (const [muscle, fatigue] of Object.entries(fatigueMap)) {
    // Convert fatigue (0-100) to a 0-1 scale
    const normalizedFatigue = fatigue / 100;
    
    // Formula: (Fatigue * 0.6) + ((1 - Recovery) * 0.4)
    const riskScoreDecimal = (normalizedFatigue * 0.6) + ((1 - systemicRecovery) * 0.4);
    const riskScore = Math.min(100, Math.round(riskScoreDecimal * 100));

    let status: 'cleared' | 'elevated' | 'warning' = 'cleared';
    if (riskScore >= 75) status = 'warning';
    else if (riskScore >= 50) status = 'elevated';

    risks.push({
      muscle: muscle as MuscleGroup,
      riskScore,
      status
    });
  }

  return risks;
}
