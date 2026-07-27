import { Router } from 'express'
import prisma from '../../db'

const router = Router()

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body
    
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    const user = await prisma.user.create({
      data: {
        email,
        password, // Not hashed for demo simplicity
        name: name || 'New User',
        avatar: `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70)}`
      }
    })

    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Signup failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

export default router
