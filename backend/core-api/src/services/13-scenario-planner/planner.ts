import { MEAL_GRAPH, calculateMealStats, MealRecipe, INGREDIENT_DB } from '../15-ai-grocery-generator/graph';

export interface BudgetPlan {
  weeklyCost: number;
  dailyCals: number;
  meals: MealRecipe[];
  groceryList: Array<{ name: string; quantity: number; totalCost: number }>;
}

/**
 * Generates a 7-day meal plan optimized for the target weekly budget.
 * Strategy: If budget is tight (< $50), prefer beans, rice, and eggs.
 * If budget is higher, include salmon and steak.
 * 
 * @param targetWeeklyBudget The target budget in USD (e.g. 60)
 * @param targetDailyCals The user's calorie goal (e.g. 2500)
 */
export function generateBudgetPlan(targetWeeklyBudget: number, targetDailyCals: number): BudgetPlan {
  // Sort meals by cost-per-calorie efficiency
  const mealStats = MEAL_GRAPH.map(m => {
    const { cost, cals } = calculateMealStats(m);
    return { meal: m, cost, cals, efficiency: cals / cost };
  });

  // Decide strategy
  const isTightBudget = targetWeeklyBudget < 60;

  let selectedMeals: MealRecipe[] = [];
  
  // Pick a standard template of 3 meals per day
  let bfast = mealStats.find(m => m.meal.type === 'Breakfast');
  let lunch = mealStats.find(m => m.meal.type === 'Lunch' && (isTightBudget ? m.cost < 2.5 : true));
  let dinner = mealStats.find(m => m.meal.type === 'Dinner' && (isTightBudget ? m.cost < 4.0 : true));

  // Fallbacks if tight budget excludes premium meals
  if (!lunch) lunch = mealStats.find(m => m.meal.type === 'Lunch');
  if (!dinner) dinner = mealStats.find(m => m.meal.type === 'Lunch'); // Fallback to a cheap lunch for dinner

  selectedMeals = [bfast!.meal, lunch!.meal, dinner!.meal];

  // Calculate totals for a 7 day plan (assuming eating the same thing every day for simplicity)
  let dailyCost = 0;
  let dailyCals = 0;
  
  const ingredientCounts: Record<string, number> = {};

  for (const m of selectedMeals) {
    const stats = calculateMealStats(m);
    dailyCost += stats.cost;
    dailyCals += stats.cals;

    for (const ing of m.ingredients) {
      ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 7; // 7 days a week
    }
  }

  const weeklyCost = dailyCost * 7;

  // Build the grocery list
  const groceryList = Object.entries(ingredientCounts).map(([ingId, qty]) => {
    const ing = INGREDIENT_DB[ingId];
    return {
      name: ing.name,
      quantity: qty,
      totalCost: parseFloat((ing.costPerUnit * qty).toFixed(2))
    };
  });

  // Sort grocery list by cost descending
  groceryList.sort((a, b) => b.totalCost - a.totalCost);

  return {
    weeklyCost: parseFloat(weeklyCost.toFixed(2)),
    dailyCals: Math.round(dailyCals),
    meals: selectedMeals,
    groceryList
  };
}
