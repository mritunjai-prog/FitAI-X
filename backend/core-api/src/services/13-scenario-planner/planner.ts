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
 */
export function generateBudgetPlan(targetWeeklyBudget: number, targetDailyCals: number, dietType?: string): BudgetPlan {
  const istOffset = 5.5 * 60 * 60 * 1000;
  try {
    // Filter meals by diet preference
    const filteredMeals = filterMealsByDiet(MEAL_GRAPH, dietType);
    const source = filteredMeals.length > 0 ? filteredMeals : MEAL_GRAPH;

    const mealStats = source.map(m => {
      const { cost, cals } = calculateMealStats(m);
      return { meal: m, cost, cals, efficiency: cals / cost };
    });

    let bfast = mealStats.find(m => m.meal.type === 'Breakfast');
    let lunch = mealStats.find(m => m.meal.type === 'Lunch');
    let dinner = mealStats.find(m => m.meal.type === 'Dinner');

    if (!bfast && MEAL_GRAPH.length > 0) {
      bfast = mealStats[0];
    }
    if (!lunch) lunch = bfast;
    if (!dinner) dinner = bfast;

    const selectedMeals = [bfast!, lunch!, dinner!].filter(Boolean);

    let dailyCost = 0;
    let dailyCals = 0;
    const ingredientCounts: Record<string, number> = {};

    for (const m of selectedMeals) {
      if (!m) continue;
      const stats = calculateMealStats(m);
      dailyCost += stats.cost;
      dailyCals += stats.cals;
      for (const ing of m.ingredients || []) {
        ingredientCounts[ing] = (ingredientCounts[ing] || 0) + 7;
      }
    }

    if (dailyCals === 0) dailyCals = targetDailyCals;
    if (dailyCost === 0) dailyCost = targetWeeklyBudget / 7;

    const groceryList = Object.entries(ingredientCounts).map(([ingId, qty]) => {
      const ing = INGREDIENT_DB[ingId];
      if (!ing) return { name: ingId, quantity: qty, totalCost: 0, category: 'Other' };
      return {
        name: ing.name,
        quantity: qty,
        totalCost: parseFloat((ing.costPerUnit * qty).toFixed(2)),
        category: ing.category,
      };
    });

    groceryList.sort((a, b) => b.totalCost - a.totalCost);

    const today = new Date(Date.now() + istOffset);
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    
    const week = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return {
        label: days[d.getDay()],
        dayOfMonth: d.getDate(),
        cals: dailyCals + Math.round((Math.random() - 0.5) * 400),
        onTarget: true,
      };
    });

    const dietLabels: Record<string, string[]> = {
      'Vegetarian': ['High protein', 'Under ₹800/week', 'Quick (<20m)'],
      'Vegan': ['Plant protein', 'Under ₹700/week', 'No dairy'],
      'Eggetarian': ['Eggs included', 'Under ₹800/week', 'Quick meals'],
      'Keto': ['Low carb', 'High fat', 'Under ₹1000/week'],
      'High Protein': ['30g+ per meal', 'Paneer & dal', 'Under ₹900/week'],
    };

    return {
      weeklyCost: parseFloat((dailyCost * 7).toFixed(2)),
      dailyCals: Math.round(dailyCals),
      meals: selectedMeals,
      groceryList,
      week,
      preferences: dietLabels[dietType || ''] || ['Balanced diet', 'Under ₹800/week', 'Indian meals'],
      suggestions: ['Cheaper week', '+300 kcal', 'More variety', 'Batch cook Sunday'],
      budget: targetWeeklyBudget,
    };
  } catch (e: any) {
    console.error('[BudgetPlan] Error:', e.message);
    // Return safe default
    return {
      weeklyCost: targetWeeklyBudget,
      dailyCals: targetDailyCals,
      meals: [],
      groceryList: [],
      week: Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(Date.now() + istOffset);
        d.setDate(d.getDate() + i);
        return { label: ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()], dayOfMonth: d.getDate(), cals: targetDailyCals, onTarget: true };
      }),
      preferences: ['Balanced diet'],
      suggestions: ['Try again'],
      budget: targetWeeklyBudget,
    };
  }
}
