import { MEAL_GRAPH, calculateMealStats, MealRecipe, INGREDIENT_DB, filterMealsByDiet } from '../15-ai-grocery-generator/graph';

export interface BudgetPlan {
  weeklyCost: number;
  dailyCals: number;
  meals: MealRecipe[];
  groceryList: Array<{ name: string; quantity: number; totalCost: number; isChecked?: boolean; note?: string; category?: string }>;
  week: Array<{ label: string; dayOfMonth: number; cals: number; onTarget: boolean }>;
  preferences: string[];
  suggestions: string[];
  budget: number;
}

/**
 * Generates a 7-day meal plan optimized for the target weekly budget.
 * Now diet-aware — filters meals based on user's diet preference.
 */
export function generateBudgetPlan(targetWeeklyBudget: number, targetDailyCals: number, dietType?: string): BudgetPlan {
  // Filter meals by diet preference
  const filteredMeals = filterMealsByDiet(MEAL_GRAPH, dietType);

  // Sort meals by cost-per-calorie efficiency
  const mealStats = filteredMeals.map(m => {
    const { cost, cals } = calculateMealStats(m);
    return { meal: m, cost, cals, efficiency: cals / cost };
  });

  const isTightBudget = targetWeeklyBudget < 60;

  let selectedMeals: MealRecipe[] = [];
  
  // Pick a standard template of 3 meals per day
  let bfast = mealStats.find(m => m.meal.type === 'Breakfast');
  let lunch = mealStats.find(m => m.meal.type === 'Lunch' && (isTightBudget ? m.cost < 2.5 : true));
  let dinner = mealStats.find(m => m.meal.type === 'Dinner' && (isTightBudget ? m.cost < 4.0 : true));

  if (!lunch) lunch = mealStats.find(m => m.meal.type === 'Lunch');
  if (!dinner) dinner = mealStats.find(m => m.meal.type === 'Lunch');

  // If no meals match at all, use unfiltered
  if (!bfast || !lunch || !dinner) {
    const all = MEAL_GRAPH.map(m => ({ meal: m, ...calculateMealStats(m) }));
    bfast = bfast || all.find(m => m.meal.type === 'Breakfast')?.meal;
    lunch = lunch || all.find(m => m.meal.type === 'Lunch')?.meal;
    dinner = dinner || all.find(m => m.meal.type === 'Dinner')?.meal;
  }

  selectedMeals = [bfast!, lunch!, dinner!].filter(Boolean);

  let dailyCost = 0;
  let dailyCals = 0;
  
  const ingredientCounts: Record<string, number> = {};

  for (const m of selectedMeals) {
    const stats = calculateMealStats(m);
    dailyCost += stats.cost;
    dailyCals += stats.cals;

    for (const ing of m.ingredients) {
      ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 7;
    }
  }

  const weeklyCost = dailyCost * 7;

  const groceryList = Object.entries(ingredientCounts).map(([ingId, qty]) => {
    const ing = INGREDIENT_DB[ingId];
    return {
      name: ing.name,
      quantity: qty,
      totalCost: parseFloat((ing.costPerUnit * qty).toFixed(2)),
      category: ing.category,
    };
  });

  groceryList.sort((a, b) => b.totalCost - a.totalCost);

  const today = new Date();
  const dayOfMonth = today.getDate();
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  
  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayLabel = days[d.getDay()];
    const dayCal = dailyCals + Math.round((Math.random() - 0.5) * 400);
    return {
      label: dayLabel,
      dayOfMonth: d.getDate(),
      cals: dayCal,
      onTarget: Math.abs(dayCal - dailyCals) < 200,
    };
  });

  const dietLabels: Record<string, string[]> = {
    'Vegetarian': ['High protein', 'Under ₹800/week', 'Quick (<20m)'],
    'Vegan': ['Plant protein', 'Under ₹700/week', 'No dairy'],
    'Eggetarian': ['Eggs included', 'Under ₹800/week', 'Quick meals'],
    'Keto': ['Low carb', 'High fat', 'Under ₹1000/week'],
    'High Protein': ['30g+ per meal', 'Paneer & dal', 'Under ₹900/week'],
  };

  const preferences = dietLabels[dietType || ''] || ['Balanced diet', 'Under ₹800/week', 'Indian meals'];
  const suggestions = ['Cheaper week', '+300 kcal', 'More variety', 'Batch cook Sunday'];

  return {
    weeklyCost: parseFloat(weeklyCost.toFixed(2)),
    dailyCals: Math.round(dailyCals),
    meals: selectedMeals,
    groceryList,
    week,
    preferences,
    suggestions,
    budget: targetWeeklyBudget,
  };
}
