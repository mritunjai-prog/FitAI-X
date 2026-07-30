import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '../db';
import { generateText, tool } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { getIo } from '../realtime/socket';
import { evaluateStreak } from '../services/ai/streakEvaluator';

const connection = new IORedis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null
});

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || 'missing_key',
});

export const startAiWorker = () => {
  const worker = new Worker('AI_Queue', async (job: Job) => {
    console.log(`[BullMQ] Processing AI Job ${job.id} of type ${job.name}`);
    
    if (job.name === 'evaluate_streak') {
      const { userId, durationMinutes, scheduledDay } = job.data;
      await evaluateStreak(userId, durationMinutes, scheduledDay);
      return { success: true };
    }

    if (job.name === 'generate_coach_response') {
      const { userId } = job.data;
      
      const io = getIo();
      
      // Fetch comprehensive user context
      const userProfile = await prisma.user.findUnique({ where: { id: userId } });
      const calendar = await prisma.calendarEvent.findMany({ where: { userId }, orderBy: { dayIndex: 'asc' } });
      const meals = await prisma.meal.findMany({ where: { userId }, take: 5, orderBy: { createdAt: 'desc' } });
      const currentWorkout = await prisma.workout.findFirst({ where: { userId, isCurrent: true }, include: { exercises: true } });
      
      // Fetch chat history (last 10 messages)
      const chatHistory = await prisma.coachMessage.findMany({
        where: { userId },
        orderBy: { id: 'desc' },
        take: 10
      });
      
      // Convert to AI SDK CoreMessage format (ordered chronologically)
      const messages: any[] = chatHistory.reverse().map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role,
        content: msg.content
      }));
      
      // Build the contextual system prompt
      const systemPrompt = `You are Rachel, an elite AI fitness coach for FitAI-X. 
You are concise, precise, and accurate. Keep responses short and impactful. Do not ramble.
You are fully autonomous and have direct access to the user's database ecosystem.

--- CURRENT USER STATE ---
Profile: ${JSON.stringify(userProfile, null, 2)}
Calendar for the Week: ${JSON.stringify(calendar, null, 2)}
Recent Meals: ${JSON.stringify(meals, null, 2)}
Active Workout Plan: ${JSON.stringify(currentWorkout, null, 2)}
--------------------------

Instructions:
1. Always base your answers on the user's actual data above. 
2. If they ask about their weight, calendar, or meals, tell them exactly what their state is.
3. Use your tools to actively manage their data. If they say "I weigh 65kg now", call updateProfileMetrics.
4. If they log calories, call logCalories.
5. You possess deep fitness knowledge. Answer questions like "what is upper body" clearly and intelligently without tools.
6. ONLY mention updating things IF you actually used a tool. If the user just says "hi", just say hello back enthusiastically! DO NOT hallucinate tool calls or pretend you updated plans if you didn't.
7. If the user explicitly asks for a workout plan or meal plan, use the \`generateWorkoutPlan\` or \`generateMealPlan\` tool to create it. Never write out a plan as plain text. Use the tool.`;

      // Groq Llama for AI
      const { text: aiResponse, toolCalls, toolResults } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        temperature: 0.3,
        system: systemPrompt,
        messages,
        tools: {
          logMemory: tool({
            description: 'Log an important memory or event (like an injury or goal change) to the user timeline.',
            parameters: z.object({
              title: z.string().describe('Short title of the event, e.g. "Shoulder Injury"'),
              description: z.string().describe('Detailed description'),
            }),
            execute: async (args: any) => {
              const { title, description } = args;
              await prisma.memoryEvent.create({
                data: { userId, title, description }
              });
              io?.emit('system_notification', { message: 'Rachel logged a new memory to your timeline.' });
              return `Successfully logged memory: ${title}`;
            },
          }),
          updateCalendar: tool({
            description: 'Update the user calendar event for a specific day.',
            parameters: z.object({
              dayIndex: z.number().describe('Day of the week (0=Sunday, 6=Saturday)'),
              title: z.string().describe('The title of the new calendar event, e.g. "Rest Day" or "Upper Body"'),
            }),
            execute: async (args: any) => {
              const { dayIndex, title } = args;
              await prisma.calendarEvent.deleteMany({
                where: { userId, dayIndex }
              });
              const event = await prisma.calendarEvent.create({
                data: { userId, dayIndex, title, type: 'workout' }
              });
              io?.emit('system_notification', { message: `Rachel updated your calendar for day ${dayIndex}!` });
              io?.emit('calendar_update', event);
              return `Successfully updated calendar for day ${dayIndex} to ${title}`;
            },
          }),
          generateWorkoutPlan: tool({
            description: 'Generate a new workout plan.',
            parameters: z.object({
              title: z.string().optional().describe('Name of the workout'),
              duration: z.string().optional().describe('e.g. 45 min'),
              exercises: z.array(z.object({
                name: z.string(),
                sets: z.number(),
                reps: z.number(),
                weight: z.string()
              })).optional()
            }),
            execute: async (args: any) => {
              const { title, duration, exercises } = args;
              const safeTitle = title || 'Full Body Routine';
              const safeDuration = duration || '45 min';
              const safeExercises = (exercises && exercises.length > 0) ? exercises : [
                { name: 'Push-ups', sets: 3, reps: 15, weight: 'Bodyweight' },
                { name: 'Squats', sets: 3, reps: 15, weight: 'Bodyweight' }
              ];
              
              const workout = await prisma.workout.create({
                data: {
                  userId,
                  title: safeTitle,
                  duration: safeDuration,
                  versionNumber: 1,
                  isCurrent: true,
                  exercises: {
                    create: safeExercises
                  }
                },
                include: { exercises: true }
              });
              io?.emit('system_notification', { message: `Rachel generated a new workout: ${title}!` });
              io?.emit('workout_update', workout);
              return `Successfully generated workout: ${title}`;
            },
          }),
          generateMealPlan: tool({
            description: 'Generate and log a meal plan for the user.',
            parameters: z.object({
              name: z.string().optional().describe('Name of the meal, e.g. "Grilled Chicken Salad"'),
              type: z.string().optional().describe('e.g. "Lunch", "Dinner", "Snack"'),
              cals: z.number().optional().describe('Total calories'),
              cost: z.number().optional().describe('Estimated cost in dollars')
            }),
            execute: async (args: any) => {
              const { name, type, cals, cost } = args;
              const safeName = name || 'Healthy AI Meal';
              const safeType = type || 'Lunch';
              const safeCals = cals || 500;
              const safeCost = cost || 0;
              
              const meal = await prisma.meal.create({
                data: { userId, name: safeName, type: safeType, cals: safeCals, cost: safeCost }
              });
              io?.emit('system_notification', { message: `Rachel added ${name} to your Nutrition plan!` });
              io?.emit('nutrition_update', meal);
              return `Successfully logged meal: ${name}`;
            },
          }),
          updateVitals: tool({
            description: 'Update the user\'s recovery metrics, heart rate, or body battery manually.',
            parameters: z.object({
              recoveryCor: z.number().describe('Core recovery score (0 to 100)'),
              bpm: z.number().describe('Resting heart rate')
            }),
            execute: async (args: any) => {
              const { recoveryCor, bpm } = args;
              const vitals = await prisma.vitals.update({
                where: { userId },
                data: { recoveryCor, bpm }
              });
              io?.emit('system_notification', { message: 'Rachel updated your vital metrics.' });
              io?.emit('vitals_update', vitals);
              return `Vitals updated.`;
            },
          }),
          updateProfileMetrics: tool({
            description: 'Update the user\'s profile metrics like weight or goal.',
            parameters: z.object({
              weight: z.number().optional().describe('New weight of the user in their preferred unit'),
              goal: z.string().optional().describe('New fitness goal (e.g. Weight Loss, Muscle Gain)')
            }),
            execute: async (args: any) => {
              const { weight, goal } = args;
              const dataToUpdate: any = {};
              if (weight !== undefined) dataToUpdate.weight = weight.toString();
              if (goal) dataToUpdate.goal = goal;
              
              const updatedProfile = await prisma.user.update({
                where: { id: userId },
                data: dataToUpdate
              });
              io?.emit('system_notification', { message: 'Rachel updated your profile metrics!' });
              io?.emit('profile_update', updatedProfile);
              return `Successfully updated profile: weight=${weight}, goal=${goal}`;
            }
          }),
          logCalories: tool({
            description: 'Log consumed calories or a specific food item rapidly.',
            parameters: z.object({
              foodName: z.string().describe('Name of the food or "Quick Calories"'),
              calories: z.number().describe('Amount of calories consumed')
            }),
            execute: async (args: any) => {
              const { foodName, calories } = args;
              const meal = await prisma.meal.create({
                data: { userId, name: foodName, type: 'Snack', cals: calories, cost: 0 }
              });
              io?.emit('system_notification', { message: `Rachel logged ${calories} calories for ${foodName}.` });
              io?.emit('nutrition_update', meal);
              return `Logged ${calories} calories.`;
            }
          }),
          postToFeed: tool({
            description: 'Broadcast an AI message to the social dashboard feed on behalf of the user.',
            parameters: z.object({
              message: z.string().describe('Encouraging message or milestone text')
            }),
            execute: async (args: any) => {
              const { message } = args;
              const feed = await prisma.feedItem.create({
                data: { userId, message, type: 'milestone', timeStr: 'Just now' }
              });
              io?.emit('system_notification', { message: 'Rachel posted a milestone to the community feed!' });
              io?.emit('feed_update', feed);
              return `Posted to feed.`;
            }
          })
        }
      });

      // Save AI message to DB
      console.log("[AI Job] toolCalls:", JSON.stringify(toolCalls, null, 2));
      console.log("[AI Job] toolResults:", JSON.stringify(toolResults, null, 2));
      // Calculate dynamic fallback if aiResponse is empty
      let finalMessage = aiResponse;
      if (!finalMessage && toolCalls && toolCalls.length > 0) {
        const validTools = toolCalls.filter((tc: any) => tc.args !== null);
        if (validTools.length > 0) {
          const toolNames = validTools.map((tc: any) => tc.toolName);
          if (toolNames.includes('generateWorkoutPlan')) {
            finalMessage = "I've generated a new workout plan for you and saved it to your profile!";
          } else if (toolNames.includes('generateMealPlan')) {
            finalMessage = "I've logged a new meal plan for you!";
          } else if (toolNames.includes('updateProfileMetrics')) {
            finalMessage = "I've updated your profile metrics.";
          } else if (toolNames.includes('logCalories')) {
            finalMessage = "I've logged those calories for you.";
          } else {
            finalMessage = "I've updated your data.";
          }
        }
      }

      if (!finalMessage) finalMessage = "Got it! Is there anything specific you need help with today?";

      const aiMsg = await prisma.coachMessage.create({
        data: {
          userId: userId,
          role: 'ai',
          content: finalMessage
        }
      });
      
      return { success: true, aiMessage: aiMsg, toolCalls };
    } else if (job.name === 'generate_onboarding_plan') {
      const { userId, goal, equipment, diet } = job.data;
      const io = getIo();

      // Fetch full user profile for personalization
      const userProfile = await prisma.user.findUnique({ where: { id: userId } });
      const experience = userProfile?.experience || 'Beginner';
      const age = userProfile?.age || 25;
      const weight = userProfile?.weight || 70;

      // Step 1: Generate welcome message
      const { text: welcomeMsg } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: `You are Rachel, an elite AI fitness coach. A new user just onboarded. 
Write a short (2-3 sentence) enthusiastic welcome message personalized to their goal and experience level. 
Mention that their 7-day smart calendar has been built for them.`,
        prompt: `Goal: ${goal}, Experience: ${experience}, Equipment: ${equipment}, Diet: ${diet}, Age: ${age}`
      });

      await prisma.coachMessage.create({
        data: { userId, role: 'ai', content: welcomeMsg }
      });

      // Step 2: Generate a full 7-day personalized plan using AI (as raw JSON text, then parse)
      const experienceDesc = experience === 'Beginner'
        ? 'The user is a complete beginner. Use basic exercises, light weights, and simple movements. Limit to 4-5 exercises per workout day.'
        : experience === 'Intermediate'
        ? 'The user is intermediate. Use compound movements with moderate intensity. 5-6 exercises per workout day.'
        : 'The user is advanced. Include challenging compound and isolation movements. 6-8 exercises per workout day.';

      const equipmentDesc = equipment === 'No Equipment'
        ? 'Use only bodyweight exercises (Push-ups, Squats, Lunges, Planks, Burpees, Mountain Climbers, etc.)'
        : equipment === 'Dumbbells'
        ? 'Use dumbbell-based exercises only.'
        : equipment === 'Full Gym'
        ? 'Use full gym equipment including barbells, cables, machines, and dumbbells.'
        : `Available equipment: ${equipment}`;

      const goalPlan: Record<string, string> = {
        'Build Muscle': 'Push/Pull/Legs split — focus on progressive overload and hypertrophy. 3-4 workout days, 2-3 rest days.',
        'Lose Weight': 'Full body HIIT and strength circuits — maximize calorie burn. 4-5 active days.',
        'Improve Endurance': 'Cardio-focused with bodyweight circuits. Mix running intervals with strength. 4-5 days active.',
        'Stay Fit': 'Balanced full-body training 3 days per week with active recovery days.',
        'Increase Strength': 'Powerlifting-style: Squat, Bench, Deadlift focus. 3-4 heavy days with full rest between.'
      };

      const todayIndex = new Date().getDay(); // 0=Sunday, 6=Saturday

      const { text: planText } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: `You are an elite certified personal trainer. Generate a complete personalized 7-day workout schedule.
${experienceDesc}
${equipmentDesc}
Goal strategy: ${goalPlan[goal] || `Goal: ${goal}`}

CRITICAL TIME INSTRUCTION: 
Today is dayIndex ${todayIndex}. Any day with a dayIndex LESS THAN ${todayIndex} has already passed this week.
You MUST set isRestDay=true, intensity="Rest", title="Rest Day", and exercises=[] for ALL days where dayIndex < ${todayIndex}.
Start the actual active workout plan on dayIndex ${todayIndex} and continue forward.

For actual rest days: isRestDay=true, exercises=[], intensity="Rest".
IMPORTANT: Use REAL exercise names only. Never use generic names.
You MUST respond with ONLY a valid JSON object. The JSON must match this exact structure:
{
  "weekPlan": [
    {
      "dayIndex": 0,
      "isRestDay": false,
      "title": "Push Day - Chest and Shoulders",
      "intensity": "Moderate",
      "description": "Focus on pushing movements for chest, shoulders and triceps.",
      "exercises": [
        { 
          "name": "Barbell Bench Press", 
          "sets": 4, 
          "reps": 10, 
          "weight": "Bodyweight", 
          "muscleGroup": "Chest",
          "instructions": "Lie flat on the bench. Lower the bar to your mid-chest, keeping your elbows at a 45-degree angle. Press the bar back up explosively."
        }
      ]
    }
  ]
}`,
        prompt: `Create a 7-day plan (dayIndex 0=Sunday to 6=Saturday) for: Goal=${goal}, Experience=${experience}, Equipment=${equipment}, Age=${age}, Weight=${weight}kg. Return ONLY the JSON object. Remember today is dayIndex ${todayIndex}.`
      });

      // Parse the JSON response - strip any accidental markdown wrappers
      let plan: { weekPlan: any[] };
      try {
        const cleaned = planText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        plan = JSON.parse(cleaned);
        // Ensure exactly 7 days
        if (!plan.weekPlan || plan.weekPlan.length !== 7) {
          throw new Error(`Expected 7 days, got ${plan.weekPlan?.length}`);
        }
      } catch (parseErr) {
        console.error('[Onboarding] Failed to parse AI plan JSON, using fallback:', parseErr);
        // Fallback: generate a static beginner plan
        plan = {
          weekPlan: [
            { dayIndex: 0, isRestDay: true, title: 'Rest Day', intensity: 'Rest', description: 'Take the day off. Light stretching welcome.', exercises: [] },
            { dayIndex: 1, isRestDay: false, title: 'Full Body Workout A', intensity: 'Moderate', description: 'Foundational full body workout targeting all major muscle groups.', exercises: [
              { name: 'Push-ups', sets: 3, reps: 10, weight: 'Bodyweight', muscleGroup: 'Chest', instructions: 'Keep your core tight and your body in a straight line. Lower your chest until it almost touches the floor, then push back up.' },
              { name: 'Bodyweight Squats', sets: 3, reps: 15, weight: 'Bodyweight', muscleGroup: 'Legs', instructions: 'Stand with feet shoulder-width apart. Lower your hips back and down as if sitting in a chair, keeping your chest up.' },
              { name: 'Plank', sets: 3, reps: 30, weight: 'Bodyweight', muscleGroup: 'Core', instructions: 'Rest on your forearms and toes, keeping your body in a straight line. Hold this position.' },
              { name: 'Lunges', sets: 3, reps: 10, weight: 'Bodyweight', muscleGroup: 'Legs', instructions: 'Step forward with one leg and lower your hips until both knees are bent at a 90-degree angle. Push back up and alternate.' }
            ]},
            { dayIndex: 2, isRestDay: true, title: 'Active Recovery', intensity: 'Rest', description: 'Go for a light 20-minute walk or gentle stretching.', exercises: [] },
            { dayIndex: 3, isRestDay: false, title: 'Full Body Workout B', intensity: 'Moderate', description: 'Second full body session with a focus on posterior chain.', exercises: [
              { name: 'Glute Bridges', sets: 3, reps: 15, weight: 'Bodyweight', muscleGroup: 'Glutes', instructions: 'Lie on your back with knees bent and feet flat on the floor. Squeeze your glutes and lift your hips toward the ceiling.' },
              { name: 'Incline Push-ups', sets: 3, reps: 12, weight: 'Bodyweight', muscleGroup: 'Chest', instructions: 'Place your hands on an elevated surface like a bench or sturdy chair. Perform a push-up keeping your core tight.' },
              { name: 'Mountain Climbers', sets: 3, reps: 20, weight: 'Bodyweight', muscleGroup: 'Core', instructions: 'Start in a plank position. Quickly alternate bringing your knees toward your chest as if running in place.' },
              { name: 'Superman Hold', sets: 3, reps: 12, weight: 'Bodyweight', muscleGroup: 'Back', instructions: 'Lie on your stomach with arms extended forward. Lift your arms, chest, and legs off the ground simultaneously and hold.' }
            ]},
            { dayIndex: 4, isRestDay: true, title: 'Rest Day', intensity: 'Rest', description: 'Rest and recover. Hydrate well.', exercises: [] },
            { dayIndex: 5, isRestDay: false, title: 'Full Body Workout C', intensity: 'Moderate', description: 'Third session of the week for consistency and progressive overload.', exercises: [
              { name: 'Burpees', sets: 3, reps: 8, weight: 'Bodyweight', muscleGroup: 'Full Body', instructions: 'Drop into a squat position, kick your feet back into a plank, perform a push-up, jump your feet forward, and explosively jump up.' },
              { name: 'Jump Squats', sets: 3, reps: 12, weight: 'Bodyweight', muscleGroup: 'Legs', instructions: 'Perform a normal bodyweight squat, but explode upwards at the bottom of the movement so your feet leave the ground.' },
              { name: 'Tricep Dips', sets: 3, reps: 10, weight: 'Bodyweight', muscleGroup: 'Arms', instructions: 'Sit on the edge of a sturdy chair or bench. Place your hands next to your hips, slide off the edge, and lower your body by bending your elbows.' },
              { name: 'Leg Raises', sets: 3, reps: 12, weight: 'Bodyweight', muscleGroup: 'Core', instructions: 'Lie on your back with your legs straight. Keep your lower back pressed into the floor as you lift your legs up toward the ceiling.' }
            ]},
            { dayIndex: 6, isRestDay: true, title: 'Rest Day', intensity: 'Rest', description: 'Full rest before the next week begins.', exercises: [] }

          ]
        };
      }

      // Step 3: Clear old data and save new plan
      await prisma.calendarEvent.deleteMany({ where: { userId } });
      await prisma.workout.updateMany({ where: { userId }, data: { isCurrent: false } });
      await prisma.meal.deleteMany({ where: { userId } });

      // Determine today's workout index — find today's dayIndex or the closest future workout
      // todayIndex already defined above as new Date().getDay()
  
      // Find the first workout day that matches today or is the closest future workout
      const workoutDays = plan.weekPlan.filter(d => !d.isRestDay && d.exercises.length > 0);
      const todayWorkoutIndex = workoutDays.find(d => d.dayIndex >= todayIndex)?.dayIndex 
        ?? workoutDays[0]?.dayIndex; // Fall back to the first workout day
      
      for (const day of plan.weekPlan) {
        const exercisesJson = JSON.stringify(day.exercises);

        // Save calendar event with full exercise data
        await prisma.calendarEvent.create({
          data: {
            userId,
            dayIndex: day.dayIndex,
            title: day.title,
            intensity: day.isRestDay ? 'Rest' : day.intensity,
            description: day.description,
            exercises: day.isRestDay ? null : exercisesJson,
            type: 'workout'
          }
        });

        // Save the workout days as actual Workout records too
        if (!day.isRestDay && day.exercises.length > 0) {
          await prisma.workout.create({
            data: {
              userId,
              title: day.title,
              duration: experience === 'Beginner' ? '30 mins' : experience === 'Intermediate' ? '45 mins' : '60 mins',
              difficulty: day.intensity,
              goal,
              equipment,
              description: day.description,
              isCurrent: day.dayIndex === todayWorkoutIndex,
              aiExplanation: `AI-generated for ${goal} goal at ${experience} level.`,
              exercises: {
                create: day.exercises.map((ex: any, idx: number) => ({
                  name: ex.name,
                  sets: ex.sets,
                  reps: ex.reps,
                  weight: ex.weight,
                  restTime: 60,
                  notes: ex.notes,
                  order: idx
                }))
              }
            }
          });
        }
      }

      // Generate a starter meal and vitals using AI
      const { text: mealAndVitalsText } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: `You are an AI fitness coach. Based on the user's profile, generate a personalized starter meal and baseline vitals.
Return ONLY valid JSON matching this exact structure:
{
  "meal": { "name": "String", "type": "Lunch", "cals": 500, "cost": 10.0 },
  "vitals": {
    "bpm": 65,
    "recoveryUpr": 0.8,
    "recoveryLwr": 0.8,
    "recoveryCor": 0.9,
    "recoveryCrd": 0.9,
    "bodyBattery": 1.0,
    "moveProgress": 0.1,
    "waterProgress": 0.1,
    "trainProgress": 0.0
  }
}`,
        prompt: `Create a meal and baseline vitals for: Goal=${goal}, Experience=${experience}, Diet=${diet}, Age=${age}, Weight=${weight}kg. Return ONLY the JSON object.`
      });

      let aiMealAndVitals;
      try {
        const cleanedMV = mealAndVitalsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        aiMealAndVitals = JSON.parse(cleanedMV);
      } catch (err) {
        aiMealAndVitals = {
          meal: { name: 'Healthy AI Meal', type: 'Lunch', cals: 600, cost: 10 },
          vitals: { bpm: 65, recoveryUpr: 0.8, recoveryLwr: 0.8, recoveryCor: 0.9, recoveryCrd: 0.9, bodyBattery: 1.0, moveProgress: 0.1, waterProgress: 0.1, trainProgress: 0.0 }
        };
      }

      await prisma.meal.create({
        data: {
          userId,
          name: aiMealAndVitals.meal.name,
          type: aiMealAndVitals.meal.type,
          cals: aiMealAndVitals.meal.cals,
          cost: aiMealAndVitals.meal.cost
        }
      });

      // Initialize AI Vitals
      await prisma.vitals.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          bpm: aiMealAndVitals.vitals.bpm,
          recoveryUpr: aiMealAndVitals.vitals.recoveryUpr,
          recoveryLwr: aiMealAndVitals.vitals.recoveryLwr,
          recoveryCor: aiMealAndVitals.vitals.recoveryCor,
          recoveryCrd: aiMealAndVitals.vitals.recoveryCrd,
          bodyBattery: aiMealAndVitals.vitals.bodyBattery,
          moveProgress: aiMealAndVitals.vitals.moveProgress,
          waterProgress: aiMealAndVitals.vitals.waterProgress,
          trainProgress: aiMealAndVitals.vitals.trainProgress,
          loadM: 0, loadT: 0, loadW: 0, loadTh: 0, loadF: 0, loadSa: 0, loadSu: 0
        }
      });

      // Add a first milestone FeedItem
      await prisma.feedItem.create({
        data: {
          userId,
          type: 'milestone',
          message: 'Just joined FitAI-X and received a personalized AI plan!',
          timeStr: 'Just now'
        }
      });

      io?.emit('system_notification', { message: 'Rachel has built your personalized 7-day plan! Your smart calendar is ready.' });
      io?.emit('calendar_update', { refresh: true });
      
      return { success: true };
    }
    
    return { success: false, reason: 'Unknown job type' };
  }, { connection });

  worker.on('completed', (job) => {
    console.log(`[BullMQ] Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} failed:`, err);
  });
  
  console.log('[Jobs] Universal AI Worker with Groq Llama started');
};
