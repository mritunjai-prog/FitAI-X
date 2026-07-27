import { Router } from 'express'
import prisma from '../../db'
import { aiQueue, aiQueueEvents } from '../../jobs/queue';

const router = Router()

// GET /api/v1/coach/messages
router.get('/messages', async (req, res) => {
  try {
    const messages = await prisma.coachMessage.findMany({
      orderBy: { id: 'asc' }, 
    })
    
    const formatted = messages.map(m => ({
      id: m.id,
      sender: m.role,
      text: m.content
    }))
    
    res.json(formatted)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coach messages' })
  }
})

// POST /api/v1/coach/messages
router.post('/messages', async (req, res) => {
  try {
    const { text, userId } = req.body;
    
    // Auto-recreate user if missing (useful for dev/demo when DB is wiped)
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: userId,
          email: `demo-${userId}@fitaix.com`,
          name: 'Demo User',
          password: 'dummy'
        }
      });
    }
    
    // 1. Save user message immediately (Optimistic UI)
    const userMsg = await prisma.coachMessage.create({
      data: { userId, role: 'user', content: text }
    });

    // 2. Dispatch a background job (FR-030)
    const job = await aiQueue.add('generate_coach_response', {
      userId,
      text
    });

    // 3. Wait for job completion to return the AI message.
    const result = await job.waitUntilFinished(aiQueueEvents);

    res.json({ userMessage: userMsg, aiMessage: result.aiMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to queue message generation' });
  }
})

export default router
