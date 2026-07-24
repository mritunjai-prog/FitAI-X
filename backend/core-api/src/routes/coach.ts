import { Router } from 'express'
import prisma from '../db'

const router = Router()

router.get('/messages', async (req, res) => {
  try {
    const messages = await prisma.coachMessage.findMany({ take: 10 })
    res.json(messages)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coach messages' })
  }
})

export default router
