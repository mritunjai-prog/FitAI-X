import { Server, Socket } from 'socket.io'
import prisma from '../db'

let ioInstance: Server | null = null;

export function getIo() {
  return ioInstance;
}

export function setupSocket(io: Server) {
  ioInstance = io;
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`)

    socket.on('join_room', (userId: string) => {
      socket.join(userId);
      console.log(`Client ${socket.id} joined room ${userId}`);
    })

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })

    // Additional realtime events can be handled here
    // e.g., listening for client actions that should be broadcasted
  })

}
