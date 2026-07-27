import prisma from '../../db';

/**
 * Scans the calendar for upcoming high-intensity non-workout events (like a Marathon or Soccer match).
 * If a conflict is detected, it returns a warning.
 */
export async function detectWorkoutConflicts(userId: string, proposedWorkoutType: string) {
  // 1. Get upcoming calendar events in the next 3 days
  const today = new Date();
  const next3Days = new Date();
  next3Days.setDate(today.getDate() + 3);

  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: {
      userId,
      createdAt: { gte: today, lte: next3Days } // Rough approximation of "upcoming" for demo
    }
  });

  const highIntensityEvents = upcomingEvents.filter(e => 
    e.title.toLowerCase().includes('marathon') || 
    e.title.toLowerCase().includes('race') || 
    e.title.toLowerCase().includes('match') ||
    e.intensity === 'High'
  );

  if (highIntensityEvents.length > 0 && proposedWorkoutType.toLowerCase().includes('leg')) {
    return {
      hasConflict: true,
      message: `Warning: You have a high-intensity event "${highIntensityEvents[0].title}" coming up soon. A heavy leg day might impair your performance. Consider switching to upper body or active recovery.`
    };
  }

  return { hasConflict: false, message: 'Schedule looks clear.' };
}
