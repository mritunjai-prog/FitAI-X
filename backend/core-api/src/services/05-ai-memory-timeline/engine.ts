import prisma from '../../db';

/**
 * Periodically scans the user's workout history to detect milestones and creates "Memory Events".
 */
export async function generateMemoryTimeline(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { workouts: { include: { exercises: true } } } });
  if (!user || user.workouts.length === 0) return { generated: 0 };

  const newMemories = [];

  // Example Logic 1: 100th Workout Milestone
  if (user.workouts.length === 100) {
    const existing = await prisma.memoryEvent.findFirst({ where: { userId, title: 'Century Club!' } });
    if (!existing) {
      const memory = await prisma.memoryEvent.create({
        data: {
          userId,
          title: 'Century Club!',
          description: 'You just logged your 100th workout. That takes serious dedication and consistency. Incredible work!'
        }
      });
      newMemories.push(memory);
    }
  }

  // Example Logic 2: Heavy Bench Press milestone
  const heavyBench = user.workouts.some(w => 
    w.exercises.some(e => e.name.toLowerCase().includes('bench press') && parseInt(e.weight) >= 225)
  );
  
  if (heavyBench) {
    const existing = await prisma.memoryEvent.findFirst({ where: { userId, title: 'Two Plates!' } });
    if (!existing) {
      const memory = await prisma.memoryEvent.create({
        data: {
          userId,
          title: 'Two Plates!',
          description: 'You joined the 225lb Bench Press club. You are officially pushing serious weight.'
        }
      });
      newMemories.push(memory);
    }
  }

  return { generated: newMemories.length, memories: newMemories };
}
