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
  targetMuscles?: string;
  aiExplanation?: string;
}

export const fetchCurrentWorkout = async (userId: string): Promise<Workout | null> => {
  try {
    const { data } = await apiClient.get(`/workouts/current?userId=${userId}`);
    return data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) { return null; }
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

export const saveWorkoutAsVersion = async (workoutId: string, payload: any) => {
  const { data } = await apiClient.post(`/workouts/${workoutId}/save-as`, payload);
  return data;
};

export const generateWorkout = async (prompt: string, currentWorkoutId?: string, userId?: string) => {
  const { data } = await apiClient.post('/workouts/generate', { prompt, currentWorkoutId, userId });
  return data;
};

export const generateInitialWorkout = async (userId: string) => {
  const { data } = await apiClient.post('/workouts/generate-initial', { userId });
  return data;
};

export const regenerateWorkout = async (userId: string, workoutId?: string, prompt?: string) => {
  const { data } = await apiClient.post('/workouts/regenerate', { userId, workoutId, prompt });
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

export const fetchWorkoutHistory = async (userId: string) => {
  const { data } = await apiClient.get(`/workouts/history?userId=${userId}`);
  return data;
};

export const updateExerciseStatus = async (workoutId: string, exId: string, status: string) => {
  const { data } = await apiClient.patch(`/workouts/${workoutId}/exercises/${exId}/status`, { status });
  return data;
};

export const deleteWorkout = async (workoutId: string) => {
  const { data } = await apiClient.delete(`/workouts/${workoutId}`);
  return data;
};

export const updateWorkout = async (workoutId: string, payload: any) => {
  const { data } = await apiClient.patch(`/workouts/${workoutId}`, payload);
  return data;
};

export const renameWorkout = async (workoutId: string, title: string) => {
  const { data } = await apiClient.patch(`/workouts/${workoutId}/rename`, { title });
  return data;
};

export const duplicateWorkout = async (workoutId: string) => {
  const { data } = await apiClient.post(`/workouts/${workoutId}/duplicate`);
  return data;
};

export const fetchPersonalRecords = async (userId: string) => {
  const { data } = await apiClient.get(`/workouts/prs?userId=${userId}`);
  return data;
};

export const fetchWorkoutFeedback = async (userId: string, sessionId: string) => {
  const { data } = await apiClient.post('/workouts/feedback', { userId, sessionId });
  return data;
};
