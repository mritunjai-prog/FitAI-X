import { generateBudgetPlan } from './src/services/13-scenario-planner/planner';

console.log('--- Testing Tight Budget ($45) ---');
const tightPlan = generateBudgetPlan(45, 2500);
console.log(`Weekly Cost: $${tightPlan.weeklyCost}`);
console.log(`Daily Cals: ${tightPlan.dailyCals}`);
console.log(`Meals: ${tightPlan.meals.map(m => m.name).join(', ')}`);
console.log(`Grocery List (Top 3):`, tightPlan.groceryList.slice(0, 3));

console.log('\n--- Testing Generous Budget ($150) ---');
const richPlan = generateBudgetPlan(150, 2500);
console.log(`Weekly Cost: $${richPlan.weeklyCost}`);
console.log(`Daily Cals: ${richPlan.dailyCals}`);
console.log(`Meals: ${richPlan.meals.map(m => m.name).join(', ')}`);
console.log(`Grocery List (Top 3):`, richPlan.groceryList.slice(0, 3));
