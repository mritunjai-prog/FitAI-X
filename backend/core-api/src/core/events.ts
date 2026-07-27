import { EventEmitter } from 'events';

// Create a singleton event emitter for the application
const AppEvents = new EventEmitter();

// Define Event Constants
export const EVENTS = {
  WORKOUT_COMPLETED: 'WORKOUT_COMPLETED',
  GOAL_CHANGED: 'GOAL_CHANGED',
  INJURY_REPORTED: 'INJURY_REPORTED'
};

export default AppEvents;
