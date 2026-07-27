import { Router } from 'express';
import { runStreakProtectionCheck } from './engine';

const router = Router();

// POST /api/v1/habits/check-streak/:userId
router.post('/check-streak/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await runStreakProtectionCheck(userId);
    res.json(result);
  } catch (error) {
    console.error('Error running streak protection check:', error);
    res.status(500).json({ error: 'Failed to run streak protection' });
  }
});

export default router;
