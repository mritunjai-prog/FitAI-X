// Shared TypeScript Data Transfer Objects (DTOs) and Interfaces

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

export interface MemoryEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  timestamp: Date | string;
  deletedAt?: Date | string | null;
}

export interface Vitals {
  id: string;
  userId: string;
  bpm: number;
  recoveryUpr: number;
  recoveryLwr: number;
  recoveryCor: number;
  recoveryCrd: number;
  bodyBattery: number;
  moveProgress: number;
  waterProgress: number;
  trainProgress: number;
  loadM: number;
  loadT: number;
  loadW: number;
  loadTh: number;
  loadF: number;
  loadSa: number;
  loadSu: number;
}

export interface FeedItem {
  id: string;
  userId: string;
  type: string;
  message: string;
  timeStr: string;
  likes?: number | null;
  bpm?: number | null;
  deletedAt?: Date | string | null;
}

export interface Workout {
  id: string;
  userId: string;
  title: string;
  duration: string;
  parentVersionId?: string | null;
  versionNumber: number;
  isCurrent: boolean;
  aiExplanation?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  exercises?: Exercise[];
}

export interface Exercise {
  id: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: number;
  weight: string;
  deletedAt?: Date | string | null;
}

export interface CoachMessage {
  id: string;
  userId: string;
  role: string;
  content: string;
  createdAt: Date | string;
}

export interface Meal {
  id: string;
  userId: string;
  type: string;
  name: string;
  cals: number;
  cost: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  dayIndex: number;
  type: string;
  title: string;
  intensity?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}
