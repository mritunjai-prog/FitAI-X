import { Server, Socket } from 'socket.io'
import prisma from '../db'

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`)

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })

    // Additional realtime events can be handled here
    // e.g., listening for client actions that should be broadcasted
  })

  // Simulated live updates for the dashboard
  // In a real app, this would be triggered by domain events (e.g. from BullMQ)
  setInterval(async () => {
    try {
      // Find a random user to simulate activity
      const users = await prisma.user.findMany()
      if (users.length > 0) {
        const randomUser = users[Math.floor(Math.random() * users.length)]
        
        io.emit('feed_update', {
          id: Date.now().toString(),
          type: 'workout',
          user: randomUser?.name || 'Unknown User',
          msg: `Simulated live update for ${randomUser?.name || 'Unknown User'}: Activity detected.`,
          time: 'Just now'
        })
      }
    } catch (e) {
      console.error('Error emitting live update:', e)
    }
  }, 12000)
}
