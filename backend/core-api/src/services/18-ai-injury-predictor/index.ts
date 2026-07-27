import { Router } from 'express';
import { calculateInjuryRisks } from './predictor';

const router = Router();

// GET /api/v1/injury-predictor/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const risks = await calculateInjuryRisks(userId);
    res.json(risks);
  } catch (error) {
    console.error('Error calculating injury risks:', error);
    res.status(500).json({ error: 'Failed to calculate injury risks' });
  }
});

export default router;
