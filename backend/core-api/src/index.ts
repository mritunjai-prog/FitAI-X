import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dashboardRoutes from './routes/dashboard'
import profileRoutes from './routes/profile'
import coachRoutes from './routes/coach'
import workoutRoutes from './routes/workouts'
import { setupSocket } from './realtime/socket'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
})

app.use(cors())
app.use(express.json())

// Mount routes
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/profile', profileRoutes)
app.use('/api/v1/coach', coachRoutes)
app.use('/api/v1/workouts', workoutRoutes)

// Setup Socket.io
setupSocket(io)

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`Core API Server running on port ${PORT}`)
})
