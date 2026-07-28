import AppEvents, { EVENTS } from './events';
import prisma from '../db';
import { aiQueue } from '../jobs/queue';

export const registerListeners = () => {
  AppEvents.on(EVENTS.WORKOUT_COMPLETED, async (payload) => {
    console.log(`[EventListener] Received WORKOUT_COMPLETED for user: ${payload.userId}`);
    
    // Simulate updating analytics (FR-026)
    setTimeout(() => {
      console.log(`[EventListener] Analytics updated for workout ${payload.workoutId}`);
    }, 1000);

    // Trigger streak logic via AI Worker
    try {
      const session = await prisma.workoutSession.findUnique({ where: { id: payload.sessionId } });
      const duration = session?.duration || 30;
      await aiQueue.add('evaluate_streak', { 
        userId: payload.userId, 
        durationMinutes: duration, 
        scheduledDay: true 
      });
      console.log(`[EventListener] Queued evaluate_streak for user ${payload.userId}`);
    } catch (error) {
      console.error('[EventListener] Failed to queue evaluate_streak', error);
    }
  });
  
  console.log('[Core] Registered Event Listeners');
};
