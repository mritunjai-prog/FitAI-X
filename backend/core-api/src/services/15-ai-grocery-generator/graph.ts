/**
 * AI Grocery Generator Graph (FR-014, FR-015)
 * 
 * Maps ingredients to average costs and caloric density.
 * Defines standard "Meals" as composites of these ingredients.
 * Now uses Indian ingredients with vegetarian-friendly options.
 */

export interface Ingredient {
  id: string;
  name: string;
  category: 'Protein' | 'Carb' | 'Fat' | 'Veg' | 'Other';
  costPerUnit: number; // e.g. cost per 100g or 1 serving
  calsPerUnit: number;
  isVeg?: boolean;
  isVegan?: boolean;
}

export const INGREDIENT_DB: Record<string, Ingredient> = {
  // Indian Protein Sources
  'paneer': { id: 'paneer', name: 'Paneer (100g)', category: 'Protein', costPerUnit: 0.8, calsPerUnit: 265, isVeg: true },
  'tofu': { id: 'tofu', name: 'Tofu (100g)', category: 'Protein', costPerUnit: 0.7, calsPerUnit: 145, isVeg: true, isVegan: true },
  'eggs': { id: 'eggs', name: '2 Whole Eggs', category: 'Protein', costPerUnit: 0.4, calsPerUnit: 140, isVeg: true },
  'chickpeas': { id: 'chickpeas', name: 'Chickpeas (1 cup cooked)', category: 'Protein', costPerUnit: 0.3, calsPerUnit: 269, isVeg: true, isVegan: true },
  'dal': { id: 'dal', name: 'Moong Dal (1 cup cooked)', category: 'Protein', costPerUnit: 0.25, calsPerUnit: 212, isVeg: true, isVegan: true },
  'curd': { id: 'curd', name: 'Curd/Yogurt (1 cup)', category: 'Protein', costPerUnit: 0.3, calsPerUnit: 100, isVeg: true },
  'milk': { id: 'milk', name: 'Milk (1 glass)', category: 'Protein', costPerUnit: 0.2, calsPerUnit: 150, isVeg: true },
  
  // Indian Carb Sources
  'rice': { id: 'rice', name: 'Basmati Rice (1 cup cooked)', category: 'Carb', costPerUnit: 0.2, calsPerUnit: 206, isVeg: true, isVegan: true },
  'roti': { id: 'roti', name: 'Whole Wheat Roti (2 pieces)', category: 'Carb', costPerUnit: 0.15, calsPerUnit: 170, isVeg: true, isVegan: true },
  'oats': { id: 'oats', name: 'Oats (1/2 cup)', category: 'Carb', costPerUnit: 0.15, calsPerUnit: 150, isVeg: true, isVegan: true },
  'besan': { id: 'besan', name: 'Besan/Chickpea Flour (100g)', category: 'Carb', costPerUnit: 0.2, calsPerUnit: 356, isVeg: true, isVegan: true },
  'sooji': { id: 'sooji', name: 'Sooji/Semolina (100g)', category: 'Carb', costPerUnit: 0.15, calsPerUnit: 360, isVeg: true, isVegan: true },
  'brown_rice': { id: 'brown_rice', name: 'Brown Rice (1 cup cooked)', category: 'Carb', costPerUnit: 0.25, calsPerUnit: 218, isVeg: true, isVegan: true },
  
  // Fats
  'ghee': { id: 'ghee', name: 'Ghee (1 tbsp)', category: 'Fat', costPerUnit: 0.2, calsPerUnit: 120, isVeg: true },
  'coconut_oil': { id: 'coconut_oil', name: 'Coconut Oil (1 tbsp)', category: 'Fat', costPerUnit: 0.15, calsPerUnit: 120, isVeg: true, isVegan: true },
  'peanuts': { id: 'peanuts', name: 'Peanuts (handful)', category: 'Fat', costPerUnit: 0.1, calsPerUnit: 170, isVeg: true, isVegan: true },
  
  // Vegetables & Greens
  'spinach': { id: 'spinach', name: 'Spinach/Palak (1 cup)', category: 'Veg', costPerUnit: 0.2, calsPerUnit: 23, isVeg: true, isVegan: true },
  'potato': { id: 'potato', name: 'Potato (1 medium)', category: 'Veg', costPerUnit: 0.1, calsPerUnit: 163, isVeg: true, isVegan: true },
  'onion': { id: 'onion', name: 'Onion (1 medium)', category: 'Veg', costPerUnit: 0.08, calsPerUnit: 44, isVeg: true, isVegan: true },
  'tomato': { id: 'tomato', name: 'Tomato (1 medium)', category: 'Veg', costPerUnit: 0.1, calsPerUnit: 22, isVeg: true, isVegan: true },
  'cauliflower': { id: 'cauliflower', name: 'Cauliflower/Gobi (1 cup)', category: 'Veg', costPerUnit: 0.25, calsPerUnit: 25, isVeg: true, isVegan: true },
  'mixed_veg': { id: 'mixed_veg', name: 'Mixed Vegetables (1 cup)', category: 'Veg', costPerUnit: 0.3, calsPerUnit: 50, isVeg: true, isVegan: true },
  'banana': { id: 'banana', name: 'Banana (1)', category: 'Veg', costPerUnit: 0.1, calsPerUnit: 105, isVeg: true, isVegan: true },
};

export interface MealRecipe {
  id: string;
  name: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  ingredients: string[]; // references to INGREDIENT_DB ids
  tags?: string[]; // 'veg', 'vegan', 'high_protein', etc.
}

export const MEAL_GRAPH: MealRecipe[] = [
  { id: 'm1', name: 'Masala Oats & Fruits', type: 'Breakfast', ingredients: ['oats', 'banana', 'milk', 'peanuts'], tags: ['veg'] },
  { id: 'm2', name: 'Paneer Paratha & Curd', type: 'Breakfast', ingredients: ['roti', 'paneer', 'curd'], tags: ['veg', 'high_protein'] },
  { id: 'm3', name: 'Moong Dal Chilla', type: 'Breakfast', ingredients: ['besan', 'onion', 'tomato', 'coconut_oil'], tags: ['veg', 'vegan', 'high_protein'] },
  
  { id: 'm4', name: 'Dal Rice with Salad', type: 'Lunch', ingredients: ['dal', 'rice', 'mixed_veg', 'curd'], tags: ['veg'] },
  { id: 'm5', name: 'Chickpea Curry & Roti', type: 'Lunch', ingredients: ['chickpeas', 'roti', 'onion', 'tomato', 'ghee'], tags: ['veg', 'vegan'] },
  { id: 'm6', name: 'Paneer Butter Masala & Rice', type: 'Lunch', ingredients: ['paneer', 'rice', 'ghee', 'tomato'], tags: ['veg', 'high_protein'] },
  
  { id: 'm7', name: 'Vegetable Pulao & Raita', type: 'Dinner', ingredients: ['rice', 'mixed_veg', 'curd', 'ghee'], tags: ['veg'] },
  { id: 'm8', name: 'Palak Paneer & Roti', type: 'Dinner', ingredients: ['paneer', 'spinach', 'roti', 'ghee'], tags: ['veg', 'high_protein'] },
  { id: 'm9', name: 'Gobi Matar & Brown Rice', type: 'Dinner', ingredients: ['cauliflower', 'brown_rice', 'onion', 'tomato', 'coconut_oil'], tags: ['veg', 'vegan'] },
  
  { id: 'm10', name: 'Besan Chilla & Curd', type: 'Breakfast', ingredients: ['besan', 'onion', 'curd', 'coconut_oil'], tags: ['veg'] },
  { id: 'm11', name: 'Sooji Upma', type: 'Breakfast', ingredients: ['sooji', 'peanuts', 'mixed_veg', 'ghee'], tags: ['veg'] },
  { id: 'm12', name: 'Tofu Curry & Rice', type: 'Dinner', ingredients: ['tofu', 'rice', 'tomato', 'onion'], tags: ['veg', 'vegan', 'high_protein'] },
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

/** Filter meals by diet preference */
export function filterMealsByDiet(meals: MealRecipe[], dietType?: string): MealRecipe[] {
  if (!dietType) return meals;
  const dt = dietType.toLowerCase();
  
  if (dt === 'vegan') {
    return meals.filter(m => m.tags?.includes('vegan') || 
      m.ingredients.every(id => INGREDIENT_DB[id]?.isVegan !== false));
  }
  if (dt === 'vegetarian' || dt === 'eggetarian') {
    return meals.filter(m => m.tags?.includes('veg') ||
      m.ingredients.every(id => INGREDIENT_DB[id]?.isVeg !== false));
  }
  // Non-veg, keto, etc — return all
  return meals;
}
