import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { setupSocket } from './realtime/socket'

// Routes
import authRoutes from './services/authentication/auth'
import dashboardRoutes from './services/analytics/dashboard'
import profileRoutes from './services/users/profile'
import onboardingRoutes from './services/users/onboarding'
import coachRoutes from './services/03-ai-decision-explanation/coach'
import transcribeRoutes from './services/03-ai-decision-explanation/transcribe'
import workoutRoutes from './services/01-adaptive-planning-engine/workouts'
import nutritionRoutes from './services/14-meal-planner-budget/nutrition'
import calendarRoutes from './services/17-smart-calendar/calendar'
import exerciseGraphRoutes from './services/09-ai-exercise-graph/index'
import injuryPredictorRoutes from './services/18-ai-injury-predictor/index'
import habitRoutes from './services/16-streak-protection/index'
import documentRoutes from './services/users/documents'
import versionRoutes from './services/02-workout-version-control/index'
import analyticsRoutes from './services/09-analytics/analytics'
import recoveryRoutes from './services/10-recovery/recovery'
import notificationRoutes from './services/notifications/index'
import path from 'path'

// Event Driven Architecture & Jobs
import { registerListeners } from './core/listeners'
import { startAiWorker } from './jobs/plan-generate.job'

const app = express()
const PORT = process.env.PORT || 4000
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
})

// Middleware
app.use(cors())
app.use(express.json())

// Serve uploaded documents statically
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

// Mount routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/profile', profileRoutes)
app.use('/api/v1/onboarding', onboardingRoutes)
app.use('/api/v1/coach/transcribe', transcribeRoutes)
app.use('/api/v1/coach', coachRoutes)
app.use('/api/v1/workouts', workoutRoutes)
app.use('/api/v1/nutrition', nutritionRoutes)
app.use('/api/v1/calendar', calendarRoutes)
app.use('/api/v1/exercise-graph', exerciseGraphRoutes)
app.use('/api/v1/injury-predictor', injuryPredictorRoutes)
app.use('/api/v1/habits', habitRoutes)
app.use('/api/v1/users', documentRoutes)
app.use('/api/v1/version-control', versionRoutes)
app.use('/api/v1/analytics', analyticsRoutes)
app.use('/api/v1/recovery', recoveryRoutes)
app.use('/api/v1/notifications', notificationRoutes)

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' })
})

// Setup Socket.io
setupSocket(io)

// Initialize Event Listeners & BullMQ Workers
try {
  registerListeners();
  startAiWorker();
} catch (error: any) {
  console.warn('Failed to start worker (Redis may not be running):', error.message);
}

httpServer.listen(PORT, () => {
  console.log(`Core API Server running on port ${PORT}`)
})
