/**
 * AI Grocery Generator Graph (FR-014, FR-015)
 * 
 * Maps ingredients to average costs and caloric density.
 * Defines standard "Meals" as composites of these ingredients.
 */

export interface Ingredient {
  id: string;
  name: string;
  category: 'Protein' | 'Carb' | 'Fat' | 'Veg' | 'Other';
  costPerUnit: number; // e.g. cost per 100g or 1 serving
  calsPerUnit: number;
}

export const INGREDIENT_DB: Record<string, Ingredient> = {
  'chicken_breast': { id: 'chicken_breast', name: 'Chicken Breast (200g)', category: 'Protein', costPerUnit: 2.5, calsPerUnit: 330 },
  'salmon': { id: 'salmon', name: 'Salmon Fillet (200g)', category: 'Protein', costPerUnit: 5.5, calsPerUnit: 410 },
  'eggs': { id: 'eggs', name: '3 Whole Eggs', category: 'Protein', costPerUnit: 0.9, calsPerUnit: 210 },
  'beef_mince': { id: 'beef_mince', name: 'Lean Beef Mince (200g)', category: 'Protein', costPerUnit: 3.0, calsPerUnit: 500 },
  
  'rice': { id: 'rice', name: 'White Rice (1 cup cooked)', category: 'Carb', costPerUnit: 0.3, calsPerUnit: 205 },
  'oats': { id: 'oats', name: 'Rolled Oats (1/2 cup)', category: 'Carb', costPerUnit: 0.2, calsPerUnit: 150 },
  'sweet_potato': { id: 'sweet_potato', name: 'Sweet Potato (Medium)', category: 'Carb', costPerUnit: 0.8, calsPerUnit: 112 },
  'beans': { id: 'beans', name: 'Black Beans (1/2 cup)', category: 'Carb', costPerUnit: 0.4, calsPerUnit: 114 },
  
  'olive_oil': { id: 'olive_oil', name: 'Olive Oil (1 tbsp)', category: 'Fat', costPerUnit: 0.15, calsPerUnit: 120 },
  'avocado': { id: 'avocado', name: 'Avocado (1/2)', category: 'Fat', costPerUnit: 1.2, calsPerUnit: 160 },
  'peanut_butter': { id: 'peanut_butter', name: 'Peanut Butter (2 tbsp)', category: 'Fat', costPerUnit: 0.25, calsPerUnit: 190 },
  
  'broccoli': { id: 'broccoli', name: 'Broccoli (1 cup)', category: 'Veg', costPerUnit: 0.5, calsPerUnit: 30 },
  'spinach': { id: 'spinach', name: 'Spinach (2 cups)', category: 'Veg', costPerUnit: 0.6, calsPerUnit: 14 },
};

export interface MealRecipe {
  id: string;
  name: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  ingredients: string[]; // references to INGREDIENT_DB ids
}

export const MEAL_GRAPH: MealRecipe[] = [
  { id: 'm1', name: 'Oatmeal & Eggs', type: 'Breakfast', ingredients: ['oats', 'eggs', 'peanut_butter'] },
  { id: 'm2', name: 'Chicken & Rice Bowl', type: 'Lunch', ingredients: ['chicken_breast', 'rice', 'broccoli', 'olive_oil'] },
  { id: 'm3', name: 'Steak & Sweet Potato', type: 'Dinner', ingredients: ['beef_mince', 'sweet_potato', 'spinach'] },
  { id: 'm4', name: 'Salmon Salad', type: 'Dinner', ingredients: ['salmon', 'avocado', 'spinach', 'olive_oil'] },
  { id: 'm5', name: 'Budget Beans & Rice', type: 'Lunch', ingredients: ['beans', 'rice', 'eggs'] },
];

export function calculateMealStats(recipe: MealRecipe) {
  let cost = 0;
  let cals = 0;
  for (const ingId of recipe.ingredients) {
    const ing = INGREDIENT_DB[ingId];
    if (ing) {
      cost += ing.costPerUnit;
      cals += ing.calsPerUnit;
    }
  }
  return { cost, cals };
}
