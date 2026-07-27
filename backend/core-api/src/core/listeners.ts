import AppEvents, { EVENTS } from './events';

export const registerListeners = () => {
  AppEvents.on(EVENTS.WORKOUT_COMPLETED, (payload) => {
    console.log(`[EventListener] Received WORKOUT_COMPLETED for user: ${payload.userId}`);
    
    // Simulate updating analytics (FR-026)
    setTimeout(() => {
      console.log(`[EventListener] Analytics updated for workout ${payload.workoutId}`);
    }, 1000);

    // Simulate streak logic
    setTimeout(() => {
      console.log(`[EventListener] Streak incremented for user ${payload.userId}`);
    }, 1500);
  });
  
  console.log('[Core] Registered Event Listeners');
};
