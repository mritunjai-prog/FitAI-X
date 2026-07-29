import { Router } from 'express'
import prisma from '../../db'
import { generateBudgetPlan } from '../13-scenario-planner/planner';
import { callAI, buildUserContext } from '../ai/aiService';
import { z } from 'zod';

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
      },
      macroSplit: { protein: 32, carbs: 44, fat: 24 },
      adherence: { logged: 33, total: 35 },
      topProtein: [
        { name: 'Chicken breast', grams: 412, share: 0.34 },
        { name: 'Greek yogurt', grams: 248, share: 0.20 },
        { name: 'Whey protein', grams: 196, share: 0.16 },
        { name: 'Salmon', grams: 154, share: 0.13 },
      ],
      spend: { week: 68.4, day: 9.77, meal: 1.95 }
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
    const diet = req.query.diet as string;
    const plan = generateBudgetPlan(budget, cals, diet);
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate budget plan' });
  }
});

// POST /api/v1/nutrition/generate-plan
router.post('/generate-plan', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const userContext = await buildUserContext(userId);
    const pref = await prisma.nutritionPreference.findUnique({ where: { userId } });
    const calsGoal = 2500; // In a real app, calculate from TDEE

    const schema = z.object({
      meals: z.array(z.object({
        name: z.string(),
        type: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
        cals: z.number(),
        cost: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fats: z.number(),
        aiExplanation: z.string()
      }))
    });

    const promptStr = `You are an expert AI nutritionist. The user needs a daily meal plan.
Goal Calories: ~${calsGoal} kcal.
IMPORTANT DIETARY RESTRICTIONS:
Diet Type: ${pref?.dietType || userContext.profile.diet || 'None'}
Allergies: ${pref?.allergies || userContext.profile.allergies || 'None'}
Disliked Foods: ${pref?.dislikedFoods || userContext.profile.dislikedFoods || 'None'}
Budget: $${pref?.budget || 75} per week.

Create 3 to 5 meals that STRICTLY adhere to the dietary restrictions (e.g. if Vegetarian, NO MEAT. If Eggetarian, NO MEAT but eggs are allowed).`;

    const aiResult = await callAI({
      system: 'You are an AI nutrition expert. Output ONLY raw JSON. No markdown, no backticks, no explanations. Just valid JSON matching this schema: { meals: [{ name, type: "Breakfast"|"Lunch"|"Dinner"|"Snack", cals, cost, protein, carbs, fats, aiExplanation }] }',
      prompt: promptStr
    });

    if (!aiResult.ok || !aiResult.text) {
      throw new Error('AI generation failed: ' + aiResult.error);
    }

    let parsedData;
    try {
      const text = aiResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(text);
    } catch (err) {
      throw new Error('AI returned invalid JSON: ' + aiResult.text);
    }
    
    // Override aiResult.data to match expected format
    aiResult.data = parsedData;

    // Save meals
    const savedMeals = [];
    for (const m of aiResult.data.meals) {
      const meal = await prisma.meal.create({
        data: {
          userId,
          name: m.name,
          type: m.type,
          cals: m.cals,
          cost: m.cost,
          versions: {
            create: {
              versionNumber: 1,
              name: m.name,
              cals: m.cals,
              cost: m.cost,
              protein: m.protein,
              carbs: m.carbs,
              fats: m.fats,
              aiExplanation: m.aiExplanation,
              isCurrent: true
            }
          }
        },
        include: { versions: true }
      });
      savedMeals.push(meal);
    }

    res.json({ success: true, meals: savedMeals });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to generate plan' });
  }
});

// POST /api/v1/nutrition/regenerate
router.post('/regenerate', async (req, res) => {
  try {
    const { mealId } = req.body;
    if (!mealId) return res.status(400).json({ error: 'Missing mealId' });

    const meal = await prisma.meal.findUnique({ where: { id: mealId }, include: { versions: true } });
    if (!meal) return res.status(404).json({ error: 'Meal not found' });
    
    const userContext = await buildUserContext(meal.userId);

    let newData: any = null;
    try {
      const schema = z.object({
        name: z.string(),
        cals: z.number(),
        cost: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fats: z.number(),
        aiExplanation: z.string()
      });
      const aiResult = await callAI({
        system: 'You are an AI nutrition expert returning a single modified meal option in JSON.',
        prompt: `The user wants to regenerate this meal: "${meal.name}" (${meal.cals} kcal). 
Provide a NEW alternative meal of the same type (${meal.type}) that STRICTLY adheres to their diet: ${userContext.profile.diet}, Allergies: ${userContext.profile.allergies}.`,
        schema
      });
      if (aiResult.ok && aiResult.data) {
        newData = aiResult.data;
      }
    } catch (aiErr) {
      console.warn('[Regenerate] AI failed, using fallback:', aiErr);
    }

    // Fallback if AI fails
    if (!newData) {
      const alternatives: Record<string, string[]> = {
        'Breakfast': ['Masala Oats', 'Vegetable Poha', 'Moong Dal Chilla', 'Fruit Smoothie Bowl', 'Stuffed Paratha'],
        'Lunch': ['Dal Rice', 'Vegetable Pulao', 'Chickpea Curry', 'Paneer Wrap', 'Bisi Bele Bath'],
        'Dinner': ['Chapati & Dal', 'Vegetable Biryani', 'Khichdi', 'Stuffed Paratha', 'Roti & Paneer'],
        'Snack': ['Fruit Bowl', 'Mixed Nuts', 'Smoothie', 'Sprouts Salad', 'Roasted Makhana'],
      };
      const options = alternatives[meal.type] || ['Alternative Meal'];
      const randomName = options[Math.floor(Math.random() * options.length)];
      newData = {
        name: randomName,
        cals: Math.round(meal.cals * (0.85 + Math.random() * 0.3)),
        cost: meal.cost || 0,
        protein: Math.round((meal.protein || 20) * (0.8 + Math.random() * 0.4)),
        carbs: Math.round((meal.carbs || 30) * (0.8 + Math.random() * 0.4)),
        fats: Math.round((meal.fats || 15) * (0.8 + Math.random() * 0.4)),
        aiExplanation: 'Generated as a fallback alternative.',
      };
    }

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
        name: newData.name,
        cals: newData.cals,
        cost: newData.cost || 0,
        protein: newData.protein || 0,
        carbs: newData.carbs || 0,
        fats: newData.fats || 0,
        aiExplanation: newData.aiExplanation,
        isCurrent: true
      }
    });
    
    await prisma.meal.update({
      where: { id: mealId },
      data: { name: newData.name, cals: newData.cals, cost: newData.cost || 0 }
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
    
    // Return empty if user has no lists — no hardcoded fallback items
    if (lists.length === 0) {
      return res.json([]);
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
