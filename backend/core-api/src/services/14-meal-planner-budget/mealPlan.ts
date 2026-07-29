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

/** Generate meals via AI and save to DB — with fallback if AI fails */
async function generateAndSaveMeals(userId: string, user: any, pref: any, targets: any, dietType: string, targetDate: Date, dayLabel: string): Promise<any[]> {
  const prompt = buildMealPrompt(user, pref, targets, dayLabel);
  
  try {
    const aiResult = await callAI({
      system: 'You are an AI nutritionist. Return ONLY valid JSON. No markdown, no backticks, no explanations.',
      prompt,
      temperature: 0.7,
    });

    if (aiResult.ok && aiResult.text) {
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
        if (meals.length > 0) return meals;
      }
    }
  } catch (e: any) {
    console.warn('[MealPlan] AI generation failed, using fallback meals:', e.message);
  }

  // Fallback meals if AI fails
  const fallbackMeals = getFallbackMeals(dietType, targets, dayLabel);
  const meals: any[] = [];
  for (const m of fallbackMeals) {
    const meal = await prisma.meal.create({
      data: {
        userId,
        type: m.type,
        name: m.name,
        cals: m.calories || m.cals || 400,
        protein: m.protein || 20,
        carbs: m.carbs || 40,
        fats: m.fat || m.fats || 15,
        cost: 0,
        date: targetDate,
        ingredients: JSON.stringify(m.ingredients || []),
        preparation: m.preparation || 'Simple preparation',
        servingSize: m.servingSize || '1 plate',
        prepTime: m.prepTime || 20,
        nutritionPrefUsed: dietType,
        status: 'generated',
      }
    });
    meals.push(meal);
  }
  return meals;
}

/** Fallback meals when AI is unavailable — diet-aware for ALL 9 diet types */
function getFallbackMeals(dietType: string, targets: any, dayLabel: string) {
  const dt = dietType?.toLowerCase() || 'non-vegetarian';

  // ── NON-VEGETARIAN ──
  if (dt === 'non-vegetarian') {
    return [
      { type: 'Breakfast', name: 'Egg Bhurji with Toast',
        calories: Math.round(targets.calories * 0.25), protein: Math.round(targets.protein * 0.25),
        carbs: Math.round(targets.carbs * 0.2), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 plate', prepTime: 15,
        ingredients: ['Eggs - 3', 'Onion - 1 small', 'Tomato - 1 small', 'Bread slices - 2', 'Butter - 1 tsp', 'Spices'],
        preparation: '1. Sauté chopped onions and tomatoes in butter. 2. Add beaten eggs and scramble. 3. Season with salt, pepper. 4. Serve with toasted bread.' },
      { type: 'Lunch', name: 'Chicken Curry with Rice',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.4),
        carbs: Math.round(targets.carbs * 0.35), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 plate', prepTime: 35,
        ingredients: ['Chicken - 150g', 'Rice - 1 cup', 'Onion - 1', 'Tomato - 1', 'Ginger-garlic paste - 1 tsp', 'Spices'],
        preparation: '1. Sauté onions, add ginger-garlic paste. 2. Add chicken, cook till brown. 3. Add tomatoes and spices, simmer 15 min. 4. Serve with steamed rice.' },
      { type: 'Dinner', name: 'Grilled Fish with Salad',
        calories: Math.round(targets.calories * 0.3), protein: Math.round(targets.protein * 0.3),
        carbs: Math.round(targets.carbs * 0.15), fat: Math.round(targets.fat * 0.35),
        servingSize: '1 fillet + salad', prepTime: 20,
        ingredients: ['Fish fillet - 150g', 'Lemon juice - 1 tbsp', 'Mixed salad leaves', 'Olive oil - 1 tbsp', 'Salt and pepper'],
        preparation: '1. Marinate fish with lemon juice, salt, pepper. 2. Grill for 4-5 mins each side. 3. Toss salad with olive oil. 4. Serve fish with salad.' },
    ];
  }

  // ── EGGETARIAN ──
  if (dt === 'eggetarian') {
    return [
      { type: 'Breakfast', name: 'Vegetable Omelette with Toast',
        calories: Math.round(targets.calories * 0.25), protein: Math.round(targets.protein * 0.25),
        carbs: Math.round(targets.carbs * 0.2), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 plate', prepTime: 15,
        ingredients: ['Eggs - 3', 'Onion - 1 small', 'Capsicum - 1/2', 'Bread - 2 slices', 'Butter - 1 tsp'],
        preparation: '1. Beat eggs with chopped vegetables. 2. Pour on hot pan with butter. 3. Cook both sides. 4. Toast bread and serve.' },
      { type: 'Lunch', name: 'Paneer Butter Masala with Naan',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.35),
        carbs: Math.round(targets.carbs * 0.35), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 plate', prepTime: 25,
        ingredients: ['Paneer - 150g', 'Tomato puree - 1 cup', 'Cream - 2 tbsp', 'Butter - 1 tbsp', 'Naan - 2 pieces', 'Spices'],
        preparation: '1. Sauté spices in butter. 2. Add tomato puree, cook 10 min. 3. Add cubed paneer and cream. 4. Simmer 5 min. Serve with naan.' },
      { type: 'Dinner', name: 'Egg Curry with Rice',
        calories: Math.round(targets.calories * 0.3), protein: Math.round(targets.protein * 0.25),
        carbs: Math.round(targets.carbs * 0.3), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 plate', prepTime: 20,
        ingredients: ['Boiled eggs - 3', 'Onion - 1', 'Tomato - 1', 'Coconut milk - 1/2 cup', 'Rice - 1 cup', 'Spices'],
        preparation: '1. Sauté onions and spices. 2. Add tomato puree and coconut milk. 3. Halve boiled eggs and add to gravy. 4. Simmer 5 min. Serve with rice.' },
    ];
  }

  // ── VEGETARIAN ──
  if (dt === 'vegetarian') {
    return [
      { type: 'Breakfast', name: 'Masala Dosa with Chutney',
        calories: Math.round(targets.calories * 0.25), protein: Math.round(targets.protein * 0.2),
        carbs: Math.round(targets.carbs * 0.3), fat: Math.round(targets.fat * 0.2),
        servingSize: '2 dosas', prepTime: 20,
        ingredients: ['Dosa batter - 2 cups', 'Potato - 2 medium', 'Onion - 1', 'Coconut chutney', 'Spices'],
        preparation: '1. Make potato filling by sautéing onions and boiled mashed potatoes with spices. 2. Spread dosa batter on hot tawa. 3. Place filling, fold. 4. Serve with chutney.' },
      { type: 'Lunch', name: 'Dal Rice with Raita',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.35),
        carbs: Math.round(targets.carbs * 0.35), fat: Math.round(targets.fat * 0.25),
        servingSize: '1 plate', prepTime: 30,
        ingredients: ['Rice - 1 cup', 'Toor dal - 1/2 cup', 'Curd - 1/2 cup', 'Cucumber - 1/2', 'Tomato - 1', 'Spices'],
        preparation: '1. Cook dal with turmeric. 2. Prepare tadka with garlic and cumin. 3. Cook rice. 4. Make raita with curd and chopped cucumber. 5. Serve together.' },
      { type: 'Dinner', name: 'Chapati with Paneer Bhurji',
        calories: Math.round(targets.calories * 0.3), protein: Math.round(targets.protein * 0.3),
        carbs: Math.round(targets.carbs * 0.25), fat: Math.round(targets.fat * 0.35),
        servingSize: '2 chapatis + 1 bowl', prepTime: 25,
        ingredients: ['Whole wheat flour - 200g', 'Paneer - 150g', 'Capsicum - 1/2', 'Onion - 1', 'Spices'],
        preparation: '1. Knead dough and roll chapatis. 2. Cook on tawa. 3. Crumble paneer, sauté with vegetables and spices. 4. Serve paneer bhurji with chapatis.' },
    ];
  }

  // ── VEGAN ──
  if (dt === 'vegan') {
    return [
      { type: 'Breakfast', name: 'Fruit and Nut Oatmeal',
        calories: Math.round(targets.calories * 0.25), protein: Math.round(targets.protein * 0.2),
        carbs: Math.round(targets.carbs * 0.3), fat: Math.round(targets.fat * 0.2),
        servingSize: '1 bowl', prepTime: 10,
        ingredients: ['Oats - 50g', 'Banana - 1', 'Almonds - 5-6', 'Coconut milk - 1 cup', 'Dates - 2'],
        preparation: '1. Cook oats in coconut milk. 2. Slice banana and chop almonds. 3. Top oatmeal with fruits and nuts. 4. Sweeten with dates.' },
      { type: 'Lunch', name: 'Chickpea Curry with Brown Rice',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.35),
        carbs: Math.round(targets.carbs * 0.35), fat: Math.round(targets.fat * 0.25),
        servingSize: '1 plate', prepTime: 25,
        ingredients: ['Chickpeas - 1 cup cooked', 'Brown rice - 1 cup', 'Coconut oil - 1 tbsp', 'Tomato - 1', 'Spices'],
        preparation: '1. Sauté spices in coconut oil. 2. Add chopped tomatoes. 3. Add chickpeas and simmer 10 min. 4. Serve over brown rice.' },
      { type: 'Dinner', name: 'Vegetable Stir-fry with Quinoa',
        calories: Math.round(targets.calories * 0.3), protein: Math.round(targets.protein * 0.3),
        carbs: Math.round(targets.carbs * 0.25), fat: Math.round(targets.fat * 0.35),
        servingSize: '1 bowl', prepTime: 20,
        ingredients: ['Quinoa - 1/2 cup', 'Mixed vegetables - 200g', 'Tofu - 100g', 'Soy sauce - 1 tbsp', 'Coconut oil - 1 tbsp'],
        preparation: '1. Cook quinoa. 2. Sauté vegetables and cubed tofu in coconut oil. 3. Add soy sauce. 4. Serve vegetables over quinoa.' },
    ];
  }

  // ── KETO ──
  if (dt === 'keto') {
    return [
      { type: 'Breakfast', name: 'Egg and Avocado Bowl',
        calories: Math.round(targets.calories * 0.25), protein: Math.round(targets.protein * 0.25), carbs: 5, fat: Math.round(targets.fat * 0.35),
        servingSize: '1 bowl', prepTime: 10,
        ingredients: ['Eggs - 3', 'Avocado - 1/2', 'Butter - 1 tbsp', 'Salt', 'Pepper'],
        preparation: '1. Fry eggs in butter. 2. Slice avocado. 3. Serve eggs with avocado slices. Season with salt and pepper.' },
      { type: 'Lunch', name: 'Grilled Chicken with Cauliflower Rice',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.4), carbs: 8, fat: Math.round(targets.fat * 0.35),
        servingSize: '1 plate', prepTime: 25,
        ingredients: ['Chicken thigh - 200g', 'Cauliflower - 1 cup grated', 'Olive oil - 2 tbsp', 'Garlic', 'Spices'],
        preparation: '1. Season chicken with spices. 2. Grill chicken 6 min each side. 3. Sauté grated cauliflower with garlic in olive oil. 4. Serve together.' },
      { type: 'Dinner', name: 'Paneer Tikka with Salad',
        calories: Math.round(targets.calories * 0.3), protein: Math.round(targets.protein * 0.3), carbs: 6, fat: Math.round(targets.fat * 0.3),
        servingSize: '1 plate', prepTime: 20,
        ingredients: ['Paneer - 150g', 'Capsicum - 1', 'Olive oil - 2 tbsp', 'Lemon juice', 'Salad leaves'],
        preparation: '1. Cube paneer and capsicum. 2. Marinate with spices and oil. 3. Pan-fry until golden. 4. Serve over salad with lemon.' },
    ];
  }

  // ── HIGH PROTEIN ──
  if (dt === 'high protein') {
    return [
      { type: 'Breakfast', name: 'Egg White Omelette with Paneer',
        calories: Math.round(targets.calories * 0.25), protein: Math.round(targets.protein * 0.3),
        carbs: Math.round(targets.carbs * 0.15), fat: Math.round(targets.fat * 0.2),
        servingSize: '1 plate', prepTime: 15,
        ingredients: ['Egg whites - 4', 'Paneer - 50g crumbled', 'Spinach - handful', 'Spices'],
        preparation: '1. Sauté spinach. 2. Mix egg whites with crumbled paneer and spinach. 3. Cook as omelette. Serve hot.' },
      { type: 'Lunch', name: 'Grilled Chicken with Dal and Rice',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.4),
        carbs: Math.round(targets.carbs * 0.3), fat: Math.round(targets.fat * 0.25),
        servingSize: '1 plate', prepTime: 30,
        ingredients: ['Chicken breast - 150g', 'Moong dal - 1/2 cup', 'Rice - 1/2 cup', 'Spices'],
        preparation: '1. Grill seasoned chicken breast. 2. Cook dal with garlic tadka. 3. Serve with rice and sliced chicken.' },
      { type: 'Dinner', name: 'Soya Chunks Curry with Salad',
        calories: Math.round(targets.calories * 0.3), protein: Math.round(targets.protein * 0.3),
        carbs: Math.round(targets.carbs * 0.2), fat: Math.round(targets.fat * 0.2),
        servingSize: '1 bowl', prepTime: 20,
        ingredients: ['Soya chunks - 100g', 'Onion - 1', 'Tomato - 1', 'Mixed salad', 'Spices'],
        preparation: '1. Boil soya chunks. 2. Sauté onions and tomatoes with spices. 3. Add soya chunks and simmer. 4. Serve with fresh salad.' },
    ];
  }

  // ── LOW CARB ──
  if (dt === 'low carb') {
    return [
      { type: 'Breakfast', name: 'Paneer Stuffed Capsicum',
        calories: Math.round(targets.calories * 0.25), protein: Math.round(targets.protein * 0.25),
        carbs: Math.round(targets.carbs * 0.1), fat: Math.round(targets.fat * 0.3),
        servingSize: '2 stuffed capsicums', prepTime: 20,
        ingredients: ['Capsicum - 2', 'Paneer - 100g', 'Cheese - 30g', 'Spices'],
        preparation: '1. Cut capsicum tops and deseed. 2. Fill with spiced crumbled paneer and cheese. 3. Bake or pan-cook until done.' },
      { type: 'Lunch', name: 'Tandoori Chicken with Cucumber Salad',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.35),
        carbs: Math.round(targets.carbs * 0.08), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 plate', prepTime: 30,
        ingredients: ['Chicken legs - 2', 'Curd - 2 tbsp', 'Cucumber - 1', 'Spices'],
        preparation: '1. Marinate chicken with curd and spices. 2. Bake or grill 25 min. 3. Serve with sliced cucumber.' },
      { type: 'Dinner', name: 'Fish Curry without Rice',
        calories: Math.round(targets.calories * 0.3), protein: Math.round(targets.protein * 0.3),
        carbs: Math.round(targets.carbs * 0.08), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 bowl', prepTime: 20,
        ingredients: ['Fish - 150g', 'Coconut milk - 1/2 cup', 'Curry leaves', 'Spices'],
        preparation: '1. Sauté spices and curry leaves. 2. Add coconut milk. 3. Add fish pieces and simmer 10 min. Serve hot.' },
    ];
  }

  // ── PALEO ──
  if (dt === 'paleo') {
    return [
      { type: 'Breakfast', name: 'Banana Almond Pancakes',
        calories: Math.round(targets.calories * 0.25), protein: Math.round(targets.protein * 0.2),
        carbs: Math.round(targets.carbs * 0.25), fat: Math.round(targets.fat * 0.3),
        servingSize: '3 small pancakes', prepTime: 15,
        ingredients: ['Banana - 1', 'Eggs - 2', 'Almond flour - 2 tbsp', 'Coconut oil'],
        preparation: '1. Mash banana, mix with eggs and almond flour. 2. Cook in coconut oil. 3. Serve with fresh berries.' },
      { type: 'Lunch', name: 'Grilled Chicken with Sweet Potato',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.35),
        carbs: Math.round(targets.carbs * 0.3), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 plate', prepTime: 30,
        ingredients: ['Chicken breast - 150g', 'Sweet potato - 1 medium', 'Olive oil', 'Salad leaves', 'Spices'],
        preparation: '1. Season and grill chicken. 2. Roast sweet potato cubes with olive oil. 3. Serve chicken with sweet potato and salad.' },
      { type: 'Dinner', name: 'Fish Stew with Vegetables',
        calories: Math.round(targets.calories * 0.3), protein: Math.round(targets.protein * 0.3),
        carbs: Math.round(targets.carbs * 0.2), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 bowl', prepTime: 25,
        ingredients: ['Fish - 150g', 'Mixed vegetables - 200g', 'Coconut oil', 'Garlic', 'Herbs'],
        preparation: '1. Sauté garlic in coconut oil. 2. Add vegetables and water, simmer. 3. Add fish, cook 10 min. Season with herbs.' },
    ];
  }

  // ── MEDITERRANEAN ──
  if (dt === 'mediterranean') {
    return [
      { type: 'Breakfast', name: 'Greek Yogurt with Honey and Nuts',
        calories: Math.round(targets.calories * 0.2), protein: Math.round(targets.protein * 0.2),
        carbs: Math.round(targets.carbs * 0.2), fat: Math.round(targets.fat * 0.2),
        servingSize: '1 bowl', prepTime: 5,
        ingredients: ['Greek yogurt - 1 cup', 'Honey - 1 tbsp', 'Walnuts - 4-5', 'Mixed berries'],
        preparation: '1. Take yogurt in a bowl. 2. Drizzle honey. 3. Top with chopped walnuts and berries.' },
      { type: 'Lunch', name: 'Mediterranean Chickpea Salad',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.3),
        carbs: Math.round(targets.carbs * 0.35), fat: Math.round(targets.fat * 0.3),
        servingSize: '1 large bowl', prepTime: 15,
        ingredients: ['Chickpeas - 1 cup', 'Cucumber - 1/2', 'Tomato - 1', 'Olive oil - 2 tbsp', 'Lemon juice', 'Feta cheese - 30g'],
        preparation: '1. Mix all chopped vegetables and chickpeas. 2. Dress with olive oil and lemon. 3. Top with crumbled feta.' },
      { type: 'Dinner', name: 'Grilled Fish with Roasted Vegetables',
        calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.35),
        carbs: Math.round(targets.carbs * 0.2), fat: Math.round(targets.fat * 0.35),
        servingSize: '1 fillet + vegetables', prepTime: 25,
        ingredients: ['Fish fillet - 150g', 'Zucchini - 1/2', 'Capsicum - 1/2', 'Olive oil - 2 tbsp', 'Lemon', 'Herbs'],
        preparation: '1. Season fish with herbs and olive oil. 2. Grill fish 4 min each side. 3. Roast sliced vegetables with olive oil. 4. Serve together with lemon.' },
    ];
  }

  // ── DEFAULT ──
  return [
    { type: 'Breakfast', name: 'Masala Oats with Vegetables',
      calories: Math.round(targets.calories * 0.25), protein: Math.round(targets.protein * 0.2),
      carbs: Math.round(targets.carbs * 0.25), fat: Math.round(targets.fat * 0.2),
      servingSize: '1 bowl', prepTime: 15,
      ingredients: ['Oats - 50g', 'Mixed vegetables - 100g', 'Mustard seeds - 1 tsp', 'Curry leaves', 'Salt to taste'],
      preparation: '1. Heat oil. Add mustard seeds and curry leaves. 2. Add vegetables, sauté. 3. Add oats and water, cook 5 min.' },
    { type: 'Lunch', name: 'Dal Rice with Salad',
      calories: Math.round(targets.calories * 0.35), protein: Math.round(targets.protein * 0.35),
      carbs: Math.round(targets.carbs * 0.35), fat: Math.round(targets.fat * 0.3),
      servingSize: '1 plate', prepTime: 30,
      ingredients: ['Rice - 1 cup', 'Moong dal - 1/2 cup', 'Tomato - 1', 'Onion - 1', 'Cucumber - 1/2'],
      preparation: '1. Cook dal with turmeric. 2. Cook rice. 3. Mix dal with tadka. 4. Serve with rice and fresh salad.' },
    { type: 'Dinner', name: 'Chapati with Mixed Veg Curry',
      calories: Math.round(targets.calories * 0.3), protein: Math.round(targets.protein * 0.3),
      carbs: Math.round(targets.carbs * 0.3), fat: Math.round(targets.fat * 0.35),
      servingSize: '2 chapatis + 1 bowl curry', prepTime: 25,
      ingredients: ['Whole wheat flour - 200g', 'Mixed vegetables - 200g', 'Onion - 1', 'Tomato - 1', 'Spices'],
      preparation: '1. Knead dough, roll chapatis. 2. Cook on tawa. 3. Sauté onions, tomatoes, spices. Add vegetables and cook.' },
  ];
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
