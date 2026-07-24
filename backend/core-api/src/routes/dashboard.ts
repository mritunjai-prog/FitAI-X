import { Router } from 'express'
import prisma from '../db'

const router = Router()

router.get('/feed', async (req, res) => {
  try {
    const feed = await prisma.feedItem.findMany({ take: 10 })
    res.json(feed.map(f => ({
      id: f.id,
      type: f.type,
      user: 'User', // Placeholder since relation might not be loaded
      avatar: 'https://i.pravatar.cc/100',
      msg: f.message,
      time: f.timeStr,
      likes: f.likes,
      bpm: f.bpm || undefined
    })))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed' })
  }
})

router.get('/active-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ take: 5 })
    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      img: u.avatar || 'https://i.pravatar.cc/100',
      isLive: true
    })))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active users' })
  }
})

router.get('/vitals', async (req, res) => {
  try {
    const vitals = await prisma.vitals.findFirst()
    if (vitals) {
      res.json(vitals)
    } else {
      res.json({
        id: '1',
        bpm: 72,
        recoveryUpr: 0.5,
        recoveryLwr: 0.9,
        recoveryCor: 0.8,
        recoveryCrd: 0.6,
        bodyBattery: 85
      })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vitals' })
  }
})

export default router
