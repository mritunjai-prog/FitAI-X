import { Router } from 'express';
import { branchWorkout } from './engine';

const router = Router();

// POST /api/v1/version-control/branch/:workoutId
router.post('/branch/:workoutId', async (req, res) => {
  try {
    const { workoutId } = req.params;
    const modifications = req.body; // Expects { exercises: [...] }
    
    if (!modifications || !modifications.exercises) {
      return res.status(400).json({ error: 'Modifications required to branch workout' });
    }

    const newVersion = await branchWorkout(workoutId, modifications);
    res.json({ message: 'Workout branched successfully', workout: newVersion });
  } catch (error) {
    console.error('Error branching workout:', error);
    res.status(500).json({ error: 'Failed to branch workout' });
  }
});

export default router;
