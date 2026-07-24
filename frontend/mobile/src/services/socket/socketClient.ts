import { io } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Connected to realtime server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from realtime server');
});
