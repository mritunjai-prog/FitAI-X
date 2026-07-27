import { Router } from 'express';
import prisma from '../../db';
import { aiQueue, aiQueueEvents } from '../../jobs/queue';

const router = Router();

// POST /api/v1/onboarding/complete
router.post('/complete', async (req, res) => {
  try {
    const { userId, age, weight, height, goal, equipment, diet } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // 1. Save user preferences
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        age: parseInt(age) || null,
        weight: parseFloat(weight) || null,
        height: parseFloat(height) || null,
        goal,
        equipment,
        diet,
      },
    });

    // 2. Dispatch BullMQ job to generate initial neural model and workout/meal plans
    const job = await aiQueue.add('generate_onboarding_plan', {
      userId,
      goal,
      equipment,
      diet,
    });

    // 3. Wait for AI to finish (Usually takes 2-4 seconds)
    await job.waitUntilFinished(aiQueueEvents);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Onboarding Error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;
