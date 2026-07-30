import { Router } from 'express'
import prisma from '../../db'
import { generateBudgetPlan } from '../13-scenario-planner/planner';
import { callAI, buildUserContext } from '../ai/aiService';
import { z } from 'zod';
import { getIo } from '../../realtime/socket';

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

    // Try to build context, gracefully fallback if user not found
    let userContext: any = { profile: { diet: 'None', allergies: 'None', dislikedFoods: 'None' } };
    try {
      userContext = await buildUserContext(userId);
    } catch (ctxErr) {
      console.warn('[Nutrition] buildUserContext failed, using defaults:', (ctxErr as any)?.message);
    }
    
    const pref = await prisma.nutritionPreference.findUnique({ where: { userId } });
    const calsGoal = 2500;

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
    
    let userContext: any = { profile: { diet: 'None', allergies: 'None' } };
    try {
      userContext = await buildUserContext(meal.userId);
    } catch (ctxErr) {
      console.warn('[Regen] User context failed:', (ctxErr as any)?.message);
    }

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

// POST /api/v1/nutrition/ai-scan — AI estimates macros from food description
router.post('/ai-scan', async (req, res) => {
  try {
    const { foodDescription } = req.body;
    if (!foodDescription) return res.status(400).json({ error: 'Missing food description' });

    const schema = z.object({
      name: z.string().describe("Standardized food/meal name"),
      cals: z.number().describe("Estimated total calories"),
      protein: z.number().describe("Protein in grams"),
      carbs: z.number().describe("Carbs in grams"),
      fats: z.number().describe("Fats in grams"),
      servingSize: z.string().optional().describe("Serving size"),
    });

    const aiResult = await callAI({
      system: 'You are a nutrition analysis AI. Estimate nutritional values from food description. Use Indian food knowledge. Return ONLY valid JSON.',
      prompt: `Food description: "${foodDescription}". Estimate realistic macros for a standard serving. Use Indian food knowledge.`,
      schema
    });

    if (!aiResult.ok || !aiResult.data) {
      return res.json({
        name: foodDescription, cals: 350, protein: 15, carbs: 40, fats: 12, servingSize: '1 serving'
      });
    }
    res.json(aiResult.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI scan failed' });
  }
});

// GET /api/v1/nutrition/foods/search — Search food database
router.get('/foods/search', async (req, res) => {
  try {
    const query = (req.query.q as string || '').toLowerCase().trim();
    if (!query) return res.json([]);

    const FOOD_DB = [
      { name: 'Rice (steamed)', cals: 206, protein: 4.2, carbs: 45, fats: 0.4, serving: '1 cup', category: 'Grains' },
      { name: 'Chapati / Roti', cals: 120, protein: 3.5, carbs: 22, fats: 2, serving: '1 medium', category: 'Grains' },
      { name: 'Dal (cooked)', cals: 150, protein: 9, carbs: 25, fats: 3, serving: '1 bowl', category: 'Legumes' },
      { name: 'Paneer (100g)', cals: 265, protein: 18, carbs: 1.2, fats: 20, serving: '100g', category: 'Dairy' },
      { name: 'Chicken breast (grilled)', cals: 165, protein: 31, carbs: 0, fats: 3.6, serving: '100g', category: 'Meat' },
      { name: 'Egg (whole)', cals: 70, protein: 6, carbs: 1, fats: 5, serving: '1 egg', category: 'Eggs' },
      { name: 'Curd / Yogurt', cals: 60, protein: 5, carbs: 4, fats: 3, serving: '100g', category: 'Dairy' },
      { name: 'Banana', cals: 105, protein: 1.3, carbs: 27, fats: 0.4, serving: '1 medium', category: 'Fruits' },
      { name: 'Idli', cals: 78, protein: 2, carbs: 15, fats: 0.5, serving: '1 idli', category: 'South Indian' },
      { name: 'Dosa', cals: 130, protein: 3, carbs: 25, fats: 3, serving: '1 dosa', category: 'South Indian' },
      { name: 'Sambhar (bowl)', cals: 120, protein: 6, carbs: 20, fats: 2, serving: '1 bowl', category: 'South Indian' },
      { name: 'Poha', cals: 180, protein: 4, carbs: 32, fats: 4, serving: '1 bowl', category: 'Breakfast' },
      { name: 'Oats (cooked)', cals: 150, protein: 5, carbs: 27, fats: 2.5, serving: '1 bowl', category: 'Grains' },
      { name: 'Chicken Curry (1 bowl)', cals: 320, protein: 25, carbs: 10, fats: 20, serving: '1 bowl', category: 'Curries' },
      { name: 'Fish Curry (1 bowl)', cals: 250, protein: 22, carbs: 8, fats: 15, serving: '1 bowl', category: 'Curries' },
      { name: 'Chole (Chickpea Curry)', cals: 250, protein: 10, carbs: 35, fats: 8, serving: '1 bowl', category: 'Curries' },
      { name: 'Whey Protein (1 scoop)', cals: 120, protein: 24, carbs: 3, fats: 1.5, serving: '1 scoop', category: 'Supplements' },
      { name: 'Mixed Vegetables (cooked)', cals: 120, protein: 4, carbs: 20, fats: 3, serving: '1 bowl', category: 'Vegetables' },
      { name: 'Salad (green)', cals: 50, protein: 2, carbs: 8, fats: 1, serving: '1 plate', category: 'Sides' },
      { name: 'Raita', cals: 60, protein: 3, carbs: 5, fats: 3, serving: '1 katori', category: 'Sides' },
    ];

    const results = FOOD_DB.filter(f => 
      f.name.toLowerCase().includes(query) || f.category.toLowerCase().includes(query)
    ).slice(0, 10);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// POST /api/v1/nutrition/log-food
router.post('/log-food', async (req, res) => {
  try {
    const { userId, name, cals, protein, carbs, fats } = req.body;
    if (!userId || !name) return res.status(400).json({ error: 'Missing userId or name' });
    
    const log = await prisma.foodLog.create({
      data: { userId, name: name.trim(), cals: Math.round(cals || 0), protein: parseFloat(protein || 0), carbs: parseFloat(carbs || 0), fats: parseFloat(fats || 0) }
    });
    
    // Socket notification for real-time update
    try {
      const io = getIo();
      if (io) io.to(userId).emit('nutrition_update', { type: 'food_logged', log });
    } catch (e) {}
    
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

// POST /api/v1/nutrition/meal/manual — Create a single manual meal entry
router.post('/meal/manual', async (req, res) => {
  try {
    const { userId, name, type, cals, protein, carbs, fats, date } = req.body;
    if (!userId || !name) return res.status(400).json({ error: 'Missing userId or name' });

    const mealDate = date ? new Date(date) : new Date();
    
    const meal = await prisma.meal.create({
      data: {
        userId,
        name: name.trim(),
        type: type || 'Meal',
        cals: Math.round(cals || 0),
        protein: parseFloat(protein || 0),
        carbs: parseFloat(carbs || 0),
        fats: parseFloat(fats || 0),
        cost: 0,
        date: mealDate,
        status: 'generated',
      }
    });

    const io = getIo();
    io?.to(userId).emit('nutrition_update', { type: 'meal_created', meal });
    
    res.json(meal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create meal' });
  }
});

// POST /api/v1/nutrition/meal-plan/manual — Create a full manual 7-day meal plan
router.post('/meal-plan/manual', async (req, res) => {
  try {
    const { userId, meals } = req.body;
    if (!userId || !Array.isArray(meals) || meals.length === 0) {
      return res.status(400).json({ error: 'Missing userId or meals array' });
    }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(todayStart); weekEnd.setDate(weekEnd.getDate() + 7);
    
    // Soft-delete existing meals in this window
    await prisma.meal.updateMany({
      where: { userId, date: { gte: todayStart, lt: weekEnd }, deletedAt: null },
      data: { deletedAt: new Date() }
    });

    const saved = [];
    for (const m of meals) {
      const dayDate = m.date ? new Date(m.date) : new Date(todayStart.getTime() + (m.dayIndex || 0) * 86400000);
      const meal = await prisma.meal.create({
        data: {
          userId,
          name: m.name || 'Meal',
          type: m.type || 'Meal',
          cals: Math.round(m.cals || m.calories || 0),
          protein: parseFloat(m.protein || 0),
          carbs: parseFloat(m.carbs || 0),
          fats: parseFloat(m.fats || m.fat || 0),
          cost: 0,
          date: dayDate,
          status: 'manual',
        }
      });
      saved.push(meal);
    }

    const io = getIo();
    io?.to(userId).emit('nutrition_update', { type: 'meal_plan_created' });
    
    res.json({ success: true, meals: saved, count: saved.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save manual meal plan' });
  }
});

export default router
