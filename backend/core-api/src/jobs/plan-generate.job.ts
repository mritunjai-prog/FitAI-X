import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import prisma from '../db';
import { generateText, tool } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import { getIo } from '../realtime/socket';

const connection = new IORedis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
});

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || 'missing_key',
});

export const startAiWorker = () => {
  const worker = new Worker('AI_Queue', async (job: Job) => {
    console.log(`[BullMQ] Processing AI Job ${job.id} of type ${job.name}`);
    
    if (job.name === 'generate_coach_response') {
      const { userId, text } = job.data;
      
      const io = getIo();
      
      // Llama 3 from Groq
      const { text: aiResponse, toolCalls, toolResults } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        maxSteps: 5,
        system: `You are Rachel, an elite AI fitness coach for the FitAI-X platform. 
        You have direct access to the user's entire database ecosystem and all UI pages. 
        You are completely autonomous. You can manage everything:
        1. If a user asks for a workout -> call generateWorkoutPlan
        2. If a user asks to change their schedule -> call updateCalendar
        3. If a user gets injured or changes a goal -> call logMemory
        4. If a user asks for nutrition/meal advice -> call generateMealPlan
        5. If a user wants to update their recovery score or vitals -> call updateVitals
        6. If a user wants to announce a milestone to the feed -> call postToFeed
        
        Always be encouraging and explain your actions. If you invoke a tool, tell the user what you just updated!`,
        prompt: text,
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
              title: z.string(),
              duration: z.string(),
              exercises: z.array(z.object({
                name: z.string(),
                sets: z.number(),
                reps: z.number(),
                weight: z.string()
              }))
            }),
            execute: async ({ title, duration, exercises }) => {
              const workout = await prisma.workout.create({
                data: {
                  userId,
                  title,
                  duration,
                  versionNumber: 1,
                  isCurrent: true,
                  exercises: {
                    create: exercises
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
              name: z.string().describe('Name of the meal, e.g. "Grilled Chicken Salad"'),
              type: z.string().describe('e.g. "Lunch", "Dinner", "Snack"'),
              cals: z.number().describe('Total calories'),
              cost: z.number().describe('Estimated cost in dollars')
            }),
            execute: async ({ name, type, cals, cost }) => {
              const meal = await prisma.meal.create({
                data: { userId, name, type, cals, cost }
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
      const aiMsg = await prisma.coachMessage.create({
        data: {
          userId: userId,
          role: 'ai',
          content: aiResponse || "I have updated your plans across the ecosystem."
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
