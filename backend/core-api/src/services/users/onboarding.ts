import { Router } from 'express';
import prisma from '../../db';
import { getIo } from '../../realtime/socket';
import { callAI } from '../ai/aiService';
import { z } from 'zod';

const router = Router();

/** Calculate daily targets based on user profile */
function calculateTargets(user: any) {
  const weight = user?.weight || 70;
  const age = user?.age || 30;
  const gender = user?.gender || 'Male';
  const goal = user?.goal || 'Maintenance';

  let bmr: number;
  if (gender === 'Female') {
    bmr = 10 * weight + 6.25 * (user?.height || 165) - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * (user?.height || 175) - 5 * age + 5;
  }
  let tdee = Math.round(bmr * 1.55);
  if (goal?.toLowerCase().includes('loss')) tdee = Math.round(tdee * 0.8);
  else if (goal?.toLowerCase().includes('gain') || goal?.toLowerCase().includes('build') || goal?.toLowerCase().includes('muscle')) tdee = Math.round(tdee * 1.15);
  
  const protein = Math.round(weight * 2.0);
  const fat = Math.round(tdee * 0.25 / 9);
  const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);
  return { calories: tdee, protein, carbs, fat };
}

/** Generate and save 7-day meal plan for new users during onboarding */
async function generateOnboardingMealPlan(userId: string, diet: string, goal: string, weight: number, height: number, age: number, gender: string, allergies?: string) {
  try {
    const user = { id: userId, diet, goal, weight, height, age, gender, allergies };
    const targets = calculateTargets(user);
    const dietType = diet || 'Non-Vegetarian';

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const types = ['Breakfast', 'Lunch', 'Dinner'];
    const calPercents = [0.25, 0.35, 0.30];

    // Try AI first for 7 days
    let aiSuccess = false;
    try {
      const schema = z.object({
        days: z.array(z.object({
          dayIndex: z.number(),
          meals: z.array(z.object({
            type: z.enum(['Breakfast', 'Lunch', 'Dinner']),
            name: z.string(),
            calories: z.number(),
            protein: z.number(),
            carbs: z.number(),
            fat: z.number(),
          }))
        }))
      });

      const aiResult = await callAI({
        system: `You are an Indian AI nutritionist. Generate 7-day meal plan. Diet: ${dietType}. 
Goal: ${goal || 'General fitness'}. Daily targets: ${targets.calories}kcal, P:${targets.protein}g, C:${targets.carbs}g, F:${targets.fat}g.
${dietType === 'Vegetarian' ? 'ABSOLUTELY NO meat, fish, eggs.' : dietType === 'Vegan' ? 'ABSOLUTELY NO animal products.' : dietType === 'Eggetarian' ? 'Eggs allowed. NO meat/fish.' : ''}
${allergies ? `ALLERGIES: ${allergies}. Avoid these completely.` : ''}
Use INDIAN cuisine. Vary meals across days. Return ONLY valid JSON.`,
        prompt: `Generate 7-day Indian meal plan for a ${user.age || 30} year old ${user.gender || 'Male'}, weight ${user.weight || 70}kg, goal: ${goal || 'General'}.`,
        schema
      });

      if (aiResult.ok && aiResult.data?.days) {
        for (const day of aiResult.data.days) {
          const di = Math.min(day.dayIndex, 6);
          const dayDate = new Date(todayStart.getTime() + di * 86400000);
          for (const m of (day.meals || [])) {
            await prisma.meal.create({
              data: {
                userId, type: m.type, name: m.name,
                cals: Math.round(m.calories || targets.calories * calPercents[['Breakfast','Lunch','Dinner'].indexOf(m.type)]),
                protein: m.protein || Math.round(targets.protein * calPercents[['Breakfast','Lunch','Dinner'].indexOf(m.type)]),
                carbs: m.carbs || Math.round(targets.carbs * calPercents[['Breakfast','Lunch','Dinner'].indexOf(m.type)]),
                fats: m.fat || Math.round(targets.fat * calPercents[['Breakfast','Lunch','Dinner'].indexOf(m.type)]),
                cost: 0, date: dayDate, status: 'generated', nutritionPrefUsed: dietType,
              }
            });
          }
        }
        aiSuccess = true;
        console.log(`[Onboarding] AI meal plan generated for user ${userId}`);
      }
    } catch (e: any) {
      console.warn('[Onboarding] AI failed, using fallback:', e.message);
    }

    // Fallback: Static meal names by day
    if (!aiSuccess) {
      const mealNamesByDay: Record<string, string[]> = {
        'Monday': ['Vegetable Poha', 'Dal Rice with Salad', 'Chapati with Mixed Veg'],
        'Tuesday': ['Masala Dosa with Chutney', 'Chickpea Curry with Rice', 'Paneer Bhurji with Roti'],
        'Wednesday': ['Moong Dal Chilla', 'Vegetable Pulao with Raita', 'Khichdi with Papad'],
        'Thursday': ['Stuffed Paratha with Curd', 'Soyabean Curry with Rice', 'Vegetable Biryani'],
        'Friday': ['Idli with Sambhar', 'Chole with Rice', 'Dal Tadka with Roti'],
        'Saturday': ['Oats Upma', 'Paneer Butter Masala with Naan', 'Mix Veg with Roti'],
        'Sunday': ['Aloo Paratha with Butter', 'Veg Thali', 'Vegetable Soup with Salad'],
      };

      for (let di = 0; di < 7; di++) {
        const dayDate = new Date(todayStart.getTime() + di * 86400000);
        const names = mealNamesByDay[dayNames[di]] || mealNamesByDay['Monday'];
        for (let mi = 0; mi < 3; mi++) {
          await prisma.meal.create({
            data: {
              userId, type: types[mi], name: names[mi] || 'Home-cooked Meal',
              cals: Math.round(targets.calories * calPercents[mi]),
              protein: Math.round(targets.protein * calPercents[mi]),
              carbs: Math.round(targets.carbs * calPercents[mi]),
              fats: Math.round(targets.fat * calPercents[mi]),
              cost: 0, date: dayDate, status: 'generated', nutritionPrefUsed: dietType,
            }
          });
        }
      }
      console.log(`[Onboarding] Fallback meal plan generated for user ${userId}`);
    }

    // Save nutrition preference
    try {
      await prisma.nutritionPreference.upsert({
        where: { userId },
        update: { dietType, allergies: allergies || '' },
        create: { userId, dietType, allergies: allergies || '' }
      });
    } catch (e) {}

    // Initialize vitals if not exists
    await prisma.vitals.upsert({
      where: { userId },
      update: {},
      create: {
        userId, bpm: 65, recoveryUpr: 0.8, recoveryLwr: 0.8,
        recoveryCor: 0.9, recoveryCrd: 0.9, bodyBattery: 1.0,
        moveProgress: 0.1, waterProgress: 0.1, trainProgress: 0.0,
        loadM: 0, loadT: 0, loadW: 0, loadTh: 0, loadF: 0, loadSa: 0, loadSu: 0
      }
    });

    // Post feed item
    await prisma.feedItem.create({
      data: { userId, type: 'milestone', message: 'Just joined FitAI-X and received a personalized AI meal plan!', timeStr: 'Just now' }
    });

    // Socket notification
    const io = getIo();
    io?.to(userId).emit('nutrition_update', { type: 'meal_plan_ready' });
    io?.to(userId).emit('system_notification', { message: 'Rachel built your personalized 7-day meal plan based on your profile!' });

    return true;
  } catch (e: any) {
    console.error('[Onboarding] Meal plan generation error:', e.message);
    return false;
  }
}

// POST /api/v1/onboarding/complete
router.post('/complete', async (req, res) => {
  try {
    const { 
      userId, age, weight, height, goal, equipment, diet,
      gender, experience, pastInjuries, currentInjuries,
      medicalConditions, allergies, physicalLimitations, medications
    } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Save user preferences
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        age: parseInt(age) || null,
        weight: parseFloat(weight) || null,
        height: parseFloat(height) || null,
        gender, experience, goal, equipment, diet,
        pastInjuries, currentInjuries, medicalConditions,
        allergies, physicalLimitations, medications
      },
    });

    // Generate meal plan synchronously (no Redis needed)
    generateOnboardingMealPlan(
      userId, diet, goal, parseFloat(weight) || 70,
      parseFloat(height) || 170, parseInt(age) || 30, gender, allergies
    ).catch(e => console.error('[Onboarding] Background meal plan error:', e));

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Onboarding Error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;
