import { Router } from 'express'
import prisma from '../../db'
import { generateBudgetPlan } from '../13-scenario-planner/planner';

const router = Router()

// GET /api/v1/nutrition
router.get('/', async (req, res) => {
  try {
    const meals = await prisma.meal.findMany();
    res.json(meals)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch nutrition data' })
  }
})

// GET /api/v1/nutrition/budget-plan
router.get('/budget-plan', async (req, res) => {
  try {
    // Default budget $75, can be overridden by query string e.g. ?budget=50
    const budgetStr = req.query.budget as string;
    const budget = budgetStr ? parseFloat(budgetStr) : 75;
    
    // Default target cals 2500
    const calsStr = req.query.cals as string;
    const cals = calsStr ? parseInt(calsStr) : 2500;

    const plan = generateBudgetPlan(budget, cals);
    res.json(plan);
  } catch (error) {
    console.error('Error generating budget plan:', error);
    res.status(500).json({ error: 'Failed to generate budget plan' });
  }
});

export default router
