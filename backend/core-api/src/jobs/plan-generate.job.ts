import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '../db';
import { generateText, tool } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { getIo } from '../realtime/socket';

const connection = new IORedis({
  host: '127.0.0.1',
  port: 6379,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || 'missing_key',
});

export const startAiWorker = () => {
  const worker = new Worker('AI_Queue', async (job: Job) => {
    console.log(`[BullMQ] Processing AI Job ${job.id} of type ${job.name}`);
    
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

      // Gemini 2.5 Flash from Google
      const { text: aiResponse, toolCalls, toolResults } = await generateText({
        model: google('gemini-2.5-flash'),
        temperature: 0.3,
        maxSteps: 5,
        system: systemPrompt,
        messages,
        tools: {
          logMemory: tool({
            description: 'Log an important memory or event (like an injury or goal change) to the user timeline.',
            parameters: z.object({
              title: z.string().describe('Short title of the event, e.g. "Shoulder Injury"'),
              description: z.string().describe('Detailed description'),
            }),
            execute: async ({ title, description }) => {
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
            execute: async ({ dayIndex, title }) => {
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
            execute: async ({ title, duration, exercises }) => {
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
            execute: async ({ name, type, cals, cost }) => {
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
            execute: async ({ recoveryCor, bpm }) => {
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
            execute: async ({ weight, goal }) => {
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
            execute: async ({ foodName, calories }) => {
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
            execute: async ({ message }) => {
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
        const validTools = toolCalls.filter(tc => tc.args !== null && tc.input !== null);
        if (validTools.length > 0) {
          const toolNames = validTools.map(tc => tc.toolName);
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
      
      const { text: aiResponse } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: `You are Rachel, an elite AI fitness coach. A new user just completed onboarding. Generate a highly personalized 1-paragraph welcome message based on their profile:
        Goal: ${goal}
        Equipment: ${equipment}
        Diet: ${diet}
        Be enthusiastic and explain that their dashboard, calendar, and nutrition plans have been dynamically generated.`,
        prompt: 'Generate welcome message'
      });

      // Insert welcome message
      await prisma.coachMessage.create({
        data: { userId, role: 'ai', content: aiResponse }
      });

      // Clear existing data to prevent duplicates if user re-runs onboarding
      await prisma.calendarEvent.deleteMany({ where: { userId } });
      await prisma.workout.deleteMany({ where: { userId } });
      await prisma.meal.deleteMany({ where: { userId } });

      // Generate a sample workout based on equipment
      await prisma.workout.create({
        data: {
          userId,
          title: `Initial ${goal} Workout`,
          duration: '45 mins',
          aiExplanation: `Custom built for ${equipment} constraints`,
          exercises: {
            create: [
              { name: 'Warmup', sets: 1, reps: 10, weight: 'BW' },
              { name: 'Main Compound', sets: 3, reps: 8, weight: 'Moderate' }
            ]
          }
        }
      });

      // Generate a sample meal
      await prisma.meal.create({
        data: {
          userId,
          name: `High-Protein ${diet} Meal`,
          type: 'Lunch',
          cals: 650,
          cost: 8.50
        }
      });

      // Generate a quick 3-day calendar
      const days = ['Legs & Core', 'Active Recovery', 'Upper Body'];
      for (let i = 0; i < 3; i++) {
        await prisma.calendarEvent.create({
          data: { userId, dayIndex: i + 1, title: days[i], type: 'workout' }
        });
      }

      // Notify the frontend
      io?.emit('system_notification', { message: 'Rachel has finished building your neural model! Your customized calendar is ready.' });
      
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
