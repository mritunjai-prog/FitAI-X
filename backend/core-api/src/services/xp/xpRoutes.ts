import { Router } from 'express';
import { getUserStats, awardXp } from './xpService';

const router = Router();

// GET /api/v1/xp/stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const stats = await getUserStats(userId);
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v1/xp/award
router.post('/award', async (req, res) => {
  try {
    const { userId, event, reason } = req.body;
    if (!userId || !event) return res.status(400).json({ error: 'Missing userId or event' });
    const result = await awardXp(userId, event, reason);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
