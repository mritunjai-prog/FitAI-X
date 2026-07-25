import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3001';

export function useRealtimeSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [heartRate, setHeartRate] = useState<number>(145);
  const [friendsActive, setFriendsActive] = useState<number>(4);
  const [feedItems, setFeedItems] = useState<any[]>([]);

  useEffect(() => {
    // Connect to the backend realtime service
    const newSocket = io(SOCKET_SERVER_URL);

    newSocket.on('connect', () => {
      console.log('Connected to realtime service');
    });

    newSocket.on('initial_state', (data) => {
      setHeartRate(data.heartRate);
      setFriendsActive(data.friendsActive);
    });

    newSocket.on('heart_rate_update', (data) => {
      setHeartRate(data.bpm);
    });

    newSocket.on('feed_update', (data) => {
      setFeedItems((prev) => [data, ...prev].slice(0, 10)); // keep last 10
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return {
    socket,
    heartRate,
    friendsActive,
    feedItems,
  };
}
