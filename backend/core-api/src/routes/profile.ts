import { Router } from 'express'
import prisma from '../db'

const router = Router()

// GET /api/v1/profile
router.get('/', async (req, res) => {
  try {
    const vitals = await prisma.vitals.findFirst()
    
    if (!vitals) {
      return res.status(404).json({ error: 'Profile vitals not found' })
    }
    
    // Transform for radar chart expectations
    const recoveryData = [
      { label: 'UPR', value: vitals.recoveryUpr },
      { label: 'LWR', value: vitals.recoveryLwr },
      { label: 'COR', value: vitals.recoveryCor },
      { label: 'CRD', value: vitals.recoveryCrd }
    ]
    
    res.json({
      radarChart: recoveryData,
      consistency: [
        { label: 'M', value: 0.2 },
        { label: 'T', value: 0.8 },
        { label: 'W', value: 0.5 },
        { label: 'T', value: 0.9 },
        { label: 'F', value: 0.4 },
        { label: 'S', value: 0.1 },
        { label: 'S', value: 0.0 }
      ]
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

export default router
