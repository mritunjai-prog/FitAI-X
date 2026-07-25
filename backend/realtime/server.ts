import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

let clientsCount = 0;

// Base values for simulation
let currentHeartRate = 145;

io.on('connection', (socket) => {
  clientsCount++;
  console.log(`Client connected: ${socket.id}. Total: ${clientsCount}`);
  
  // Initial payload
  socket.emit('initial_state', {
    heartRate: currentHeartRate,
    friendsActive: 4,
  });

  socket.on('disconnect', () => {
    clientsCount--;
    console.log(`Client disconnected: ${socket.id}. Total: ${clientsCount}`);
  });
});

// Simulation Loop (runs every 1 second)
setInterval(() => {
  // Simulate natural heart rate fluctuation
  const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to +2
  currentHeartRate = Math.max(120, Math.min(180, currentHeartRate + fluctuation));
  
  io.emit('heart_rate_update', {
    bpm: currentHeartRate,
    timestamp: Date.now(),
  });
}, 1000);

// Feed Activity Simulation (every 10 seconds)
const activities = [
  { name: 'Sarah J.', action: 'completed a Heavy Deadlift session', time: 'Just now' },
  { name: 'Mike T.', action: 'hit a new PR on Bench Press', time: 'Just now' },
  { name: 'Emma W.', action: 'finished a 5k recovery run', time: 'Just now' },
  { name: 'David M.', action: 'started a hypertrophy leg day', time: 'Just now' },
];

setInterval(() => {
  const randomActivity = activities[Math.floor(Math.random() * activities.length)];
  io.emit('feed_update', {
    ...randomActivity,
    id: Math.random().toString(36).substring(7),
  });
}, 10000);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Realtime service running on http://localhost:${PORT}`);
});
