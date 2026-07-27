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

// Heart rate simulation removed (Real data should be pushed by connected devices)

// Feed Activity Simulation removed (Real feed should come from DB)

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Realtime service running on http://localhost:${PORT}`);
});
