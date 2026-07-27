import { Router } from 'express'
import prisma from '../../db'
import { generateBudgetPlan } from '../13-scenario-planner/planner';

const router = Router()

// GET /api/v1/nutrition
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const meals = await prisma.meal.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { versions: { where: { isCurrent: true } } }
    });
    res.json(meals)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch nutrition data' })
  }
})

// GET /api/v1/nutrition/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // Fetch vitals for water progress
    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    
    // Fetch today's food logs
    const today = new Date();
    today.setHours(0,0,0,0);
    const logs = await prisma.foodLog.findMany({
      where: { userId, loggedAt: { gte: today } }
    });

    // Aggregate macros
    const calories = logs.reduce((sum, log) => sum + log.cals, 0);
    const protein = logs.reduce((sum, log) => sum + (log.protein || 0), 0);
    const carbs = logs.reduce((sum, log) => sum + (log.carbs || 0), 0);
    const fat = logs.reduce((sum, log) => sum + (log.fats || 0), 0);

    res.json({
      calories,
      protein,
      carbs,
      fat,
      waterProgress: vitals?.waterProgress || 0,
      dailyWaterMl: vitals?.dailyWaterMl || 0,
      waterGoalMl: vitals?.waterGoalMl || 2500,
      score: 85, // Mock score for now
      recommendation: {
        text: 'Increase protein intake',
        reason: 'Yesterday\'s workout burned 920 kcal. Recovery score 58%.'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// GET /api/v1/nutrition/budget-plan
router.get('/budget-plan', async (req, res) => {
  try {
    const budgetStr = req.query.budget as string;
    const budget = budgetStr ? parseFloat(budgetStr) : 75;
    const calsStr = req.query.cals as string;
    const cals = calsStr ? parseInt(calsStr) : 2500;
    const plan = generateBudgetPlan(budget, cals);
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate budget plan' });
  }
});

// POST /api/v1/nutrition/regenerate
router.post('/regenerate', async (req, res) => {
  try {
    const { mealId } = req.body;
    if (!mealId) return res.status(400).json({ error: 'Missing mealId' });

    // Mock AI regeneration
    const meal = await prisma.meal.findUnique({ where: { id: mealId }, include: { versions: true } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });

    // Mark previous versions as not current
    await prisma.mealVersion.updateMany({
      where: { mealId },
      data: { isCurrent: false }
    });

    const newVersionNum = meal.versions.length + 1;
    const newVersion = await prisma.mealVersion.create({
      data: {
        mealId,
        versionNumber: newVersionNum,
        name: `${meal.name} (v${newVersionNum})`,
        cals: meal.cals + Math.floor(Math.random() * 100 - 50),
        cost: meal.cost,
        aiExplanation: 'Regenerated based on recent high-intensity workout and available budget.',
        isCurrent: true
      }
    });

    res.json({ success: true, version: newVersion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Regeneration failed' });
  }
});

// GET /api/v1/nutrition/version-history
router.get('/version-history', async (req, res) => {
  try {
    const mealId = req.query.mealId as string;
    if (!mealId) return res.status(400).json({ error: 'Missing mealId' });
    const versions = await prisma.mealVersion.findMany({
      where: { mealId },
      orderBy: { versionNumber: 'desc' }
    });
    res.json(versions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// POST /api/v1/nutrition/log-food
router.post('/log-food', async (req, res) => {
  try {
    const { userId, name, cals, protein, carbs, fats } = req.body;
    const log = await prisma.foodLog.create({
      data: { userId, name, cals, protein, carbs, fats }
    });
    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log food' });
  }
});

// POST /api/v1/nutrition/water
router.post('/water', async (req, res) => {
  try {
    const { userId, amountMl } = req.body;
    
    // Log the water entry
    const log = await prisma.waterLog.create({
      data: { userId, amountMl }
    });

    // Update daily progress in Vitals
    const vitals = await prisma.vitals.findUnique({ where: { userId } });
    if (vitals) {
      // Calculate today's total water
      const today = new Date();
      today.setHours(0,0,0,0);
      const allLogs = await prisma.waterLog.findMany({
        where: { userId, loggedAt: { gte: today } }
      });
      const totalWater = allLogs.reduce((sum, l) => sum + l.amountMl, 0);
      const progress = Math.min(totalWater / vitals.waterGoalMl, 1);
      
      await prisma.vitals.update({
        where: { userId },
        data: { waterProgress: progress, dailyWaterMl: totalWater }
      });
    }

    res.json({ success: true, log });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log water' });
  }
});

// GET /api/v1/nutrition/history
router.get('/history', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    
    // Get food logs for past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const logs = await prisma.foodLog.findMany({
      where: { userId, loggedAt: { gte: thirtyDaysAgo } },
      orderBy: { loggedAt: 'desc' }
    });
    
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/v1/nutrition/grocery
router.get('/grocery', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    let lists = await prisma.groceryList.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Auto-generate a list if user has none
    if (lists.length === 0) {
      const newList = await prisma.groceryList.create({
        data: {
          userId,
          name: "Weekly Groceries",
          items: {
            create: [
              { name: "Chicken Breast", quantity: "2 lbs", cost: 12.00 },
              { name: "Brown Rice", quantity: "1 bag", cost: 3.50 },
              { name: "Broccoli", quantity: "2 heads", cost: 4.00 },
              { name: "Eggs", quantity: "1 dozen", cost: 5.00 },
              { name: "Almond Milk", quantity: "1 carton", cost: 3.99 },
              { name: "Oats", quantity: "1 container", cost: 4.50 },
            ]
          }
        },
        include: { items: true }
      });
      lists = [newList];
    }
    
    res.json(lists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch grocery lists' });
  }
});

// POST /api/v1/nutrition/preferences
router.post('/preferences', async (req, res) => {
  try {
    const { userId, dietType, allergies, dislikedFoods, budget } = req.body;
    const pref = await prisma.nutritionPreference.upsert({
      where: { userId },
      update: { dietType, allergies, dislikedFoods, budget },
      create: { userId, dietType, allergies, dislikedFoods, budget }
    });
    res.json(pref);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

export default router
