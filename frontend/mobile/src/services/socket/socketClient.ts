import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const debuggerHost = Constants.expoConfig?.hostUri;
const localhost = debuggerHost?.split(':')[0] || 'localhost';

const SOCKET_BASE = Platform.OS === 'web' 
  ? 'http://localhost:4000' 
  : `http://${localhost}:4000`;

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || SOCKET_BASE;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Connected to realtime server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from realtime server');
});

export const joinUserRoom = (userId: string) => {
  if (socket.connected) {
    socket.emit('join_room', userId);
  } else {
    socket.once('connect', () => {
      socket.emit('join_room', userId);
    });
  }
};
