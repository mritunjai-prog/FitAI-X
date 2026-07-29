/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FitAI X — AI MEAL PLAN GENERATOR
 * ════════════════════════════════════════════════════════════════════════════
 */
import { Router } from 'express';
import prisma from '../../db';
import { callAI } from '../ai/aiService';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCurrentTimeSlot(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

const MEAL_TIME_SLOTS: Record<string, string> = {
  Breakfast: '7:00 AM – 9:00 AM',
  Lunch: '12:00 PM – 2:00 PM',
  Dinner: '7:00 PM – 9:00 PM',
};

/** Returns meals whose meal time hasn't passed yet. */
function filterRelevantMeals(meals: any[]): any[] {
  const slot = getCurrentTimeSlot();
  const slotOrder = ['Breakfast', 'Lunch', 'Dinner'];
  const slotCutoff: Record<string, number> = { Breakfast: 0, Lunch: 1, Dinner: 2 };
  const cutoff = slotCutoff[slot === 'morning' ? 'Breakfast' : slot === 'afternoon' ? 'Lunch' : 'Dinner'] ?? 0;
  return meals.filter((m) => {
    const idx = slotOrder.indexOf(m.type);
    return idx >= cutoff;
  });
}

function buildMealPrompt(user: any, pref: any, targets: { calories: number; protein: number; carbs: number; fat: number }, dayLabel: string): string {
  const dietType = pref?.dietType || user?.diet || 'Non-Vegetarian';
  const allergies = pref?.allergies || user?.allergies || 'None';
  const disliked = pref?.dislikedFoods || 'None';
  const favorites = pref?.favoriteFoods || 'None';
  const goal = user?.goal || 'General fitness';
  const medicalConditions = user?.medicalConditions || 'None';

  const dietRules: Record<string, string> = {
    'Vegetarian': 'ABSOLUTELY NO meat, fish, chicken, eggs, or any animal flesh. Dairy and plant foods are allowed.',
    'Vegan': 'ABSOLUTELY NO animal products whatsoever — no meat, fish, eggs, dairy (milk, cheese, butter, yogurt), honey, or any animal-derived ingredients.',
    'Eggetarian': 'Eggs ARE allowed. NO meat, fish, or chicken. Dairy is allowed.',
    'Non-Vegetarian': 'All food types are allowed — meat, fish, chicken, eggs, dairy.',
    'Keto': 'Very low carb (under 20g net carbs per meal). High fat, moderate protein. NO grains, sugars, or starchy vegetables.',
    'High Protein': 'Every meal must be protein-focused. Minimum 30g protein per main meal.',
    'Low Carb': 'Reduced carbohydrates. No rice, pasta, bread, or sugary foods. Focus on vegetables and protein.',
    'Paleo': 'No grains, legumes, dairy, refined sugar, or processed foods. Meat, fish, vegetables, fruits, nuts, seeds only.',
    'Mediterranean': 'Focus on olive oil, fish, vegetables, legumes, whole grains, moderate dairy. Limited red meat.',
  };

  const dietRule = dietRules[dietType] || `Follow ${dietType} diet strictly.`;

  return `You are an expert Indian AI nutritionist creating a personalized meal plan.

USER PROFILE:
- Age: ${user?.age || 'Unknown'}
- Gender: ${user?.gender || 'Unknown'}
- Height: ${user?.height || 'Unknown'} cm
- Weight: ${user?.weight || 'Unknown'} kg
- Goal: ${goal}
- Diet Preference: ${dietType}

DIETARY RULES — YOU MUST FOLLOW THESE STRICTLY:
${dietRule}

RESTRICTIONS:
- Allergies: ${allergies}
- Disliked Foods: ${disliked}
- Favorite Foods: ${favorites}
- Medical Conditions: ${medicalConditions}

NUTRITION TARGETS (per day):
- Calories: ~${targets.calories} kcal
- Protein: ~${targets.protein}g
- Carbs: ~${targets.carbs}g
- Fat: ~${targets.fat}g

Generate a meal plan for ${dayLabel} with exactly 3 meals:
1. Breakfast (7:00 AM – 9:00 AM) — ~25% of daily calories
2. Lunch (12:00 PM – 2:00 PM) — ~35% of daily calories
3. Dinner (7:00 PM – 9:00 PM) — ~30% of daily calories

IMPORTANT: Use INDIAN cuisine and locally available Indian ingredients (e.g., rice, chapati, dal, paneer, vegetables, spices). Use metric units (grams, ml). 

CRITICAL RULES:
- Every meal MUST respect the diet preference (${dietType}) — no violations allowed
- Every meal MUST avoid listed allergies
- Meals must be realistic, practical, and use commonly available Indian ingredients
- Provide varied meals — don't repeat the same meals across the day
- Each meal should have clear, simple preparation instructions (2-3 steps max)
- Match calorie targets across the day
- Never suggest the same meal plan twice — vary the dishes

Return valid JSON ONLY (no markdown, no backticks) with this exact schema:
{
  "meals": [
    {
      "type": "Breakfast" | "Lunch" | "Dinner",
      "name": "Meal Name (e.g., Masala Dosa, Paneer Butter Masala with Roti)",
      "calories": number (kcal),
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "servingSize": "e.g., 2 pieces, 1 bowl, 1 plate",
      "prepTime": number (minutes),
      "ingredients": ["ingredient 1 with Indian measurement", "ingredient 2 with quantity"],
      "preparation": "Short step-by-step preparation (2-3 steps)"
    }
  ]
}`;
}

/** Calculate approximate daily targets based on user profile. */
function calculateTargets(user: any): { calories: number; protein: number; carbs: number; fat: number } {
  const weight = user?.weight || 70;
  const goal = user?.goal || 'Maintenance';
  const age = user?.age || 30;
  const gender = user?.gender || 'Male';

  let bmr: number;
  if (gender === 'Female') {
    bmr = 10 * weight + 6.25 * (user?.height || 170) - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * (user?.height || 175) - 5 * age + 5;
  }

  const activityMultiplier = 1.55;
  let tdee = Math.round(bmr * activityMultiplier);

  if (goal?.toLowerCase().includes('loss') || goal?.toLowerCase().includes('lose')) {
    tdee = Math.round(tdee * 0.8);
  } else if (goal?.toLowerCase().includes('gain') || goal?.toLowerCase().includes('build') || goal?.toLowerCase().includes('muscle')) {
    tdee = Math.round(tdee * 1.15);
  }

  const protein = Math.round(weight * 2.0);
  const fat = Math.round(tdee * 0.25 / 9);
  const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);

  return { calories: tdee, protein, carbs, fat };
}

/** Generate meals via AI and save to DB */
async function generateAndSaveMeals(userId: string, user: any, pref: any, targets: any, dietType: string, targetDate: Date, dayLabel: string): Promise<any[]> {
  const prompt = buildMealPrompt(user, pref, targets, dayLabel);
  
  const aiResult = await callAI({
    system: 'You are an AI nutritionist. Return ONLY valid JSON. No markdown, no backticks, no explanations.',
    prompt,
    temperature: 0.7,
  });

  if (!aiResult.ok || !aiResult.text) {
    throw new Error('AI generation failed: ' + (aiResult.error || 'unknown error'));
  }

  let text = aiResult.text.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) text = text.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(text);

  const meals: any[] = [];
  if (parsed.meals && Array.isArray(parsed.meals)) {
    for (const m of parsed.meals) {
      const meal = await prisma.meal.create({
        data: {
          userId,
          type: m.type,
          name: m.name,
          cals: Math.round(m.calories || m.cals || 0),
          protein: m.protein || 0,
          carbs: m.carbs || 0,
          fats: m.fat || m.fats || 0,
          cost: 0,
          date: targetDate,
          ingredients: JSON.stringify(m.ingredients || []),
          preparation: m.preparation || '',
          servingSize: m.servingSize || '',
          prepTime: m.prepTime || 15,
          nutritionPrefUsed: dietType,
          status: 'generated',
        }
      });
      meals.push(meal);
    }
  }
  return meals;
}

// ─── GET /api/v1/nutrition/meal-plan ──────────────────────────────────────
router.get('/meal-plan', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { nutritionPref: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const targets = calculateTargets(user);
    const pref = user.nutritionPref;
    const dietType = pref?.dietType || user.diet || 'Non-Vegetarian';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000);

    const [todayMeals, tomorrowMeals] = await Promise.all([
      prisma.meal.findMany({
        where: { userId, date: { gte: todayStart, lt: todayEnd }, deletedAt: null },
        orderBy: [{ type: 'asc' }]
      }),
      prisma.meal.findMany({
        where: { userId, date: { gte: tomorrowStart, lt: tomorrowEnd }, deletedAt: null },
        orderBy: [{ type: 'asc' }]
      })
    ]);

    const results: any = { today: [], tomorrow: [], targets };

    if (todayMeals.length === 0) {
      try {
        results.today = await generateAndSaveMeals(userId, user, pref, targets, dietType, todayStart, 'today');
      } catch (e: any) {
        console.error('[MealPlan] AI generation for today failed:', e.message);
      }
    } else {
      results.today = todayMeals;
    }

    if (tomorrowMeals.length === 0) {
      try {
        results.tomorrow = await generateAndSaveMeals(userId, user, pref, targets, dietType, tomorrowStart, 'tomorrow');
      } catch (e: any) {
        console.error('[MealPlan] AI generation for tomorrow failed:', e.message);
      }
    } else {
      results.tomorrow = tomorrowMeals;
    }

    const relevantToday = filterRelevantMeals(results.today);

    res.json({
      today: relevantToday,
      tomorrow: results.tomorrow,
      targets,
      timeSlot: getCurrentTimeSlot(),
      dietType,
      mealTimeSlots: MEAL_TIME_SLOTS,
      totalMeals: results.today.length + results.tomorrow.length,
    });
  } catch (e: any) {
    console.error('[MealPlan] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/nutrition/regenerate-plan ───────────────────────────────
router.post('/regenerate-plan', async (req, res) => {
  try {
    const { userId, day } = req.body;
    if (!userId || !day) return res.status(400).json({ error: 'Missing userId or day' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { nutritionPref: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const targets = calculateTargets(user);
    const pref = user.nutritionPref;
    const dietType = pref?.dietType || user.diet || 'Non-Vegetarian';

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const targetDate = day === 'today' ? todayStart : new Date(todayStart.getTime() + 86400000);
    const dayEnd = new Date(targetDate.getTime() + 86400000);

    // Soft delete old meals
    await prisma.meal.updateMany({
      where: { userId, date: { gte: targetDate, lt: dayEnd }, deletedAt: null },
      data: { deletedAt: new Date() }
    });

    // Generate new meals
    const dayLabel = day === 'today' ? 'today' : 'tomorrow';
    const meals = await generateAndSaveMeals(userId, user, pref, targets, dietType, targetDate, dayLabel);

    res.json({ success: true, meals, day, targets });
  } catch (e: any) {
    console.error('[Regenerate Plan] Error:', e.message);
    // Send proper error message
    res.status(500).json({ error: e.message || 'Failed to regenerate meal plan' });
  }
});

export default router;
