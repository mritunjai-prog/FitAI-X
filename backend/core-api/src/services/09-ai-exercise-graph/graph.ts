/**
 * AI Exercise Graph & Dependency Engine (FR-009, FR-019)
 * 
 * Maps standard exercises to muscle groups and calculates cascading fatigue.
 */

export type MuscleGroup = 
  | 'Chest' | 'Back' | 'Shoulders' | 'Triceps' | 'Biceps' 
  | 'Core' | 'Quads' | 'Hamstrings' | 'Glutes' | 'Calves';

export interface ExerciseNode {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: Array<{ muscle: MuscleGroup; loadPercentage: number }>;
}

// 1. Core Exercise Dictionary / Graph
export const EXERCISE_GRAPH: Record<string, ExerciseNode> = {
  'bench_press': {
    id: 'bench_press',
    name: 'Barbell Bench Press',
    primaryMuscle: 'Chest',
    secondaryMuscles: [
      { muscle: 'Triceps', loadPercentage: 40 },
      { muscle: 'Shoulders', loadPercentage: 20 },
    ]
  },
  'squat': {
    id: 'squat',
    name: 'Barbell Back Squat',
    primaryMuscle: 'Quads',
    secondaryMuscles: [
      { muscle: 'Glutes', loadPercentage: 50 },
      { muscle: 'Hamstrings', loadPercentage: 20 },
      { muscle: 'Core', loadPercentage: 15 },
    ]
  },
  'deadlift': {
    id: 'deadlift',
    name: 'Barbell Deadlift',
    primaryMuscle: 'Hamstrings',
    secondaryMuscles: [
      { muscle: 'Glutes', loadPercentage: 60 },
      { muscle: 'Back', loadPercentage: 40 },
      { muscle: 'Core', loadPercentage: 30 },
    ]
  },
  'pullup': {
    id: 'pullup',
    name: 'Pull-up',
    primaryMuscle: 'Back',
    secondaryMuscles: [
      { muscle: 'Biceps', loadPercentage: 50 },
      { muscle: 'Core', loadPercentage: 10 },
    ]
  },
  'overhead_press': {
    id: 'overhead_press',
    name: 'Overhead Press',
    primaryMuscle: 'Shoulders',
    secondaryMuscles: [
      { muscle: 'Triceps', loadPercentage: 50 },
      { muscle: 'Core', loadPercentage: 20 },
    ]
  },
  'bicep_curl': {
    id: 'bicep_curl',
    name: 'Bicep Curl',
    primaryMuscle: 'Biceps',
    secondaryMuscles: []
  },
  'tricep_extension': {
    id: 'tricep_extension',
    name: 'Tricep Extension',
    primaryMuscle: 'Triceps',
    secondaryMuscles: []
  }
};

/**
 * Normalizes an exercise name to match our graph keys (fuzzy matching simulation).
 */
export function normalizeExerciseName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('bench') || lower.includes('chest press')) return 'bench_press';
  if (lower.includes('squat')) return 'squat';
  if (lower.includes('deadlift')) return 'deadlift';
  if (lower.includes('pull') && (lower.includes('up') || lower.includes('down'))) return 'pullup';
  if (lower.includes('overhead') || lower.includes('shoulder press') || lower.includes('military')) return 'overhead_press';
  if (lower.includes('curl')) return 'bicep_curl';
  if (lower.includes('extension') || lower.includes('pushdown')) return 'tricep_extension';
  return 'unknown';
}

/**
 * Calculates current fatigue (0-100) per muscle group based on recent exercises.
 * Simulates decay over time.
 * @param recentExercises List of exercises performed in the last 72 hours.
 * @param now Current timestamp for decay calculation.
 */
export function calculateMuscleFatigue(
  recentExercises: Array<{ name: string; sets: number; reps: number; weight: string; completedAt: Date }>,
  now: Date = new Date()
): Record<MuscleGroup, number> {
  const fatigueMap: Record<string, number> = {
    'Chest': 0, 'Back': 0, 'Shoulders': 0, 'Triceps': 0, 'Biceps': 0,
    'Core': 0, 'Quads': 0, 'Hamstrings': 0, 'Glutes': 0, 'Calves': 0
  };

  for (const ex of recentExercises) {
    const nodeKey = normalizeExerciseName(ex.name);
    const node = EXERCISE_GRAPH[nodeKey];
    if (!node) continue;

    // Calculate hours passed to determine recovery decay
    // Standard rule: 100% recovery after 72 hours. Linear decay for simplicity in v1.
    const hoursPassed = (now.getTime() - ex.completedAt.getTime()) / (1000 * 60 * 60);
    if (hoursPassed > 72 || hoursPassed < 0) continue; // Fully recovered or invalid time

    const recoveryFactor = Math.max(0, 1 - (hoursPassed / 72));

    // Base impact: sets * 5 (arbitrary load unit per set for v1)
    const baseImpact = ex.sets * 5 * recoveryFactor;

    // Primary muscle takes 100% of the base impact
    fatigueMap[node.primaryMuscle] += baseImpact;

    // Secondary muscles take their percentage of the base impact
    for (const secondary of node.secondaryMuscles) {
      fatigueMap[secondary.muscle] += baseImpact * (secondary.loadPercentage / 100);
    }
  }

  // Cap at 100%
  for (const muscle in fatigueMap) {
    fatigueMap[muscle] = Math.min(100, Math.round(fatigueMap[muscle]));
  }

  return fatigueMap as Record<MuscleGroup, number>;
}
