import { apiClient } from './client';

export const transcribeAudio = async (audioUri: string): Promise<string> => {
  const formData = new FormData();
  
  // Extract filename from URI
  const filename = audioUri.split('/').pop() || 'recording.m4a';
  
  // React Native requires this format for file uploads via FormData
  formData.append('audio', {
    uri: audioUri,
    name: filename,
    type: 'audio/m4a'
  } as any);

  const { data } = await apiClient.post('/coach/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data.text;
};
