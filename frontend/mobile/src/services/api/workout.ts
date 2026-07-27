import { apiClient } from './client';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: string;
}

export interface Workout {
  id: string;
  title: string;
  duration: string;
  exercises: Exercise[];
  versionNumber?: number;
  parentVersionId?: string;
  isCurrent?: boolean;
}

export const fetchCurrentWorkout = async (userId: string = 'demo-user-id'): Promise<Workout | null> => {
  try {
    const { data } = await apiClient.get(`/workouts/current?userId=${userId}`);
    return data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

export const fetchWorkoutVersions = async (workoutId: string): Promise<Workout[]> => {
  const { data } = await apiClient.get(`/workouts/versions/${workoutId}`);
  return data;
};

export const saveWorkout = async (workoutData: any) => {
  const { data } = await apiClient.post('/workouts', workoutData);
  return data;
};

export const generateWorkout = async (prompt: string, currentWorkoutId?: string) => {
  const { data } = await apiClient.post('/workouts/generate', { prompt, currentWorkoutId });
  return data;
};

export const startSession = async (sessionData: any) => {
  const { data } = await apiClient.post('/workouts/session/start', sessionData);
  return data;
};

export const completeSession = async (sessionData: any) => {
  const { data } = await apiClient.post('/workouts/session/complete', sessionData);
  return data;
};

export const fetchWorkoutHistory = async (userId: string = 'demo-user-id') => {
  const { data } = await apiClient.get(`/workouts/history?userId=${userId}`);
  return data;
};
