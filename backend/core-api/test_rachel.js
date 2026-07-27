/**
 * Rachel AI Comprehensive Test Runner
 * Tests 30+ types of queries and validates AI responses
 */

const { PrismaClient } = require('@prisma/client');
const { generateText, tool } = require('ai');
const { z } = require('zod');

const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

const prisma = new PrismaClient();

// Use a real user from DB
const USER_ID = 'fb2da822-a786-4e61-b94b-c01a41bb4ffd';

const QUERIES = [
  // Casual / Greeting
  { cat: 'casual',       q: 'hi' },
  { cat: 'casual',       q: 'how are you?' },
  { cat: 'casual',       q: 'what can you do?' },
  
  // Profile / Personal Data Queries
  { cat: 'profile',      q: 'what is my current weight?' },
  { cat: 'profile',      q: 'what are my fitness goals?' },
  { cat: 'profile',      q: 'how old am I?' },
  { cat: 'profile',      q: 'what is my experience level?' },

  // Calendar Queries
  { cat: 'calendar',     q: 'what is on my calendar today?' },
  { cat: 'calendar',     q: 'what workout do I have tomorrow?' },
  { cat: 'calendar',     q: 'show me my full weekly schedule' },

  // Nutrition / Diet Queries
  { cat: 'nutrition',    q: 'diet plan?' },
  { cat: 'nutrition',    q: 'create a meal plan for me' },
  { cat: 'nutrition',    q: 'what have I eaten recently?' },
  { cat: 'nutrition',    q: 'how many calories did I consume today?' },
  { cat: 'nutrition',    q: 'suggest a high protein meal for lunch' },

  // Workout Queries
  { cat: 'workout',      q: 'make a workout plan for muscle gain' },
  { cat: 'workout',      q: 'I am a beginner make a workout plan' },
  { cat: 'workout',      q: 'show me my current workout plan' },
  { cat: 'workout',      q: 'create an endurance training plan' },

  // Exercise Knowledge
  { cat: 'knowledge',    q: 'what is an upper body workout?' },
  { cat: 'knowledge',    q: 'why do we train legs?' },
  { cat: 'knowledge',    q: 'what is progressive overload?' },
  { cat: 'knowledge',    q: 'explain the difference between sets and reps' },
  { cat: 'knowledge',    q: 'how do I do a proper squat?' },

  // Data Mutation (Tell Rachel something changed)
  { cat: 'mutation',     q: 'my weight changed to 65 kg' },
  { cat: 'mutation',     q: 'I just consumed 500 calories of rice and chicken' },
  { cat: 'mutation',     q: 'I injured my knee today, log it' },
  { cat: 'mutation',     q: 'change my goal to weight loss' },

  // Calendar Mutations
  { cat: 'cal_mutate',   q: 'change my Wednesday workout to Rest Day' },
  { cat: 'cal_mutate',   q: 'set Friday as Active Recovery' },

  // Mixed Complex
  { cat: 'complex',      q: 'I weigh 72kg, my goal is to lose 5kg in 2 months, make me a diet plan' },
  { cat: 'complex',      q: 'what should I eat before my workout today?' },
];

let passed = 0, failed = 0;
const results = [];

async function testQuery(userId, userProfile, calendar, meals, currentWorkout, query) {
  const systemPrompt = `You are Rachel, an elite AI fitness coach for FitAI-X.
You are concise, precise, and accurate. Keep responses short and impactful. Do not ramble.
You are fully autonomous and have direct access to the user's database ecosystem.

--- CURRENT USER STATE ---
Profile: ${JSON.stringify(userProfile)}
Calendar for the Week: ${JSON.stringify(calendar)}
Recent Meals: ${JSON.stringify(meals)}
Active Workout Plan: ${JSON.stringify(currentWorkout)}
--------------------------

STRICT INSTRUCTIONS:
1. Always base your answers on the user's actual data above.
2. If they ask about their weight, calendar, or meals, tell them exactly what their state is from the data.
3. Use your tools to actively manage data. If they say "I weigh 65kg now", call updateProfileMetrics.
4. If they log calories, call logCalories.
7. DO NOT say "I have updated your plans" unless you actually called a tool.
8. For greetings like "hi", just say hello enthusiastically. Short responses only.
9. If the user explicitly asks for a workout plan or meal plan, use the \`generateWorkoutPlan\` or \`generateMealPlan\` tool to create it. Never write out a plan as plain text.`;

  // Capture tool calls for verification
  const toolsCalled = [];
  const { text: aiResponse, steps } = await generateText({
    model: google('gemini-2.5-flash'),
    maxSteps: 5,
    system: systemPrompt,
    messages: [{ role: 'user', content: query }],
    tools: {
      generateWorkoutPlan: tool({
        description: 'Generate and SAVE a complete workout plan for the user to the database.',
        parameters: z.object({
          title: z.string().optional(),
          duration: z.string().optional(),
          exercises: z.array(z.object({ name: z.string(), sets: z.number(), reps: z.number(), weight: z.string() })).optional()
        }),
        execute: async ({ title }) => {
          toolsCalled.push('generateWorkoutPlan');
          return `Successfully generated workout: ${title}`;
        }
      }),
      generateMealPlan: tool({
        description: 'Generate and SAVE a meal plan for the user to the database.',
        parameters: z.object({
          name: z.string().optional().describe('Name of the meal, e.g. "Grilled Chicken Salad"'),
          type: z.string().optional().describe('e.g. "Lunch", "Dinner", "Snack"'),
          cals: z.number().optional().describe('Total calories'),
          cost: z.number().optional().describe('Estimated cost in dollars')
        }),
        execute: async ({ name }) => {
          toolsCalled.push('generateMealPlan');
          return `Successfully logged meal: ${name}`;
        }
      }),
      updateCalendar: tool({
        description: 'Update the user calendar event for a specific day.',
        parameters: z.object({
          dayIndex: z.number(),
          title: z.string()
        }),
        execute: async ({ dayIndex, title }) => {
          toolsCalled.push('updateCalendar');
          return `Successfully updated calendar for day ${dayIndex} to ${title}`;
        }
      }),
      updateProfileMetrics: tool({
        description: 'Update the user profile metrics like weight or goal.',
        parameters: z.object({
          weight: z.number().optional(),
          goal: z.string().optional()
        }),
        execute: async ({ weight }) => {
          toolsCalled.push('updateProfileMetrics');
          return `Successfully updated profile: weight=${weight}`;
        }
      }),
      logCalories: tool({
        description: 'Log consumed calories or a specific food item.',
        parameters: z.object({
          foodName: z.string(),
          calories: z.number()
        }),
        execute: async ({ foodName, calories }) => {
          toolsCalled.push('logCalories');
          return `Logged ${calories} calories.`;
        }
      }),
      logMemory: tool({
        description: 'Log an important memory or event.',
        parameters: z.object({
          title: z.string(),
          description: z.string()
        }),
        execute: async ({ title }) => {
          toolsCalled.push('logMemory');
          return `Successfully logged memory: ${title}`;
        }
      })
    }
  });

  const finalResponse = aiResponse && aiResponse.trim() ? aiResponse : (toolsCalled.length > 0 ? `Done! Used tools: ${toolsCalled.join(', ')}` : '');

  return { response: finalResponse, toolsCalled };
}

async function main() {
  console.log('🚀 Starting Rachel AI Comprehensive Test\n');
  console.log('='.repeat(60));

  // Load user context once
  const userProfile = await prisma.user.findUnique({ where: { id: USER_ID } });
  const calendar = await prisma.calendarEvent.findMany({ where: { userId: USER_ID }, orderBy: { dayIndex: 'asc' } });
  const meals = await prisma.meal.findMany({ where: { userId: USER_ID }, take: 5, orderBy: { createdAt: 'desc' } });
  const currentWorkout = await prisma.workout.findFirst({ where: { userId: USER_ID, isCurrent: true }, include: { exercises: true } });

  console.log(`User: ${userProfile?.email || 'NOT FOUND'}`);
  console.log(`Calendar events: ${calendar.length}`);
  console.log(`Recent meals: ${meals.length}`);
  console.log('='.repeat(60) + '\n');

  for (const test of QUERIES) {
    try {
      process.stdout.write(`[${test.cat.toUpperCase()}] "${test.q}" → `);
      const { response, toolsCalled } = await testQuery(USER_ID, userProfile, calendar, meals, currentWorkout, test.q);
      
      const isBadResponse = response.toLowerCase().includes('updated your plans across the ecosystem');
      const isEmptyResponse = !response.trim();
      const isFallback = isBadResponse || isEmptyResponse;

      if (isFallback) {
        console.log(`❌ FAIL - Bad/empty response`);
        console.log(`   Response: "${response.substring(0, 100)}"`);
        failed++;
      } else {
        const toolStr = toolsCalled.length > 0 ? ` [Tools: ${toolsCalled.join(', ')}]` : '';
        console.log(`✅ PASS${toolStr}`);
        console.log(`   "${response.substring(0, 120)}..."`);
        passed++;
      }

      results.push({ query: test.q, category: test.cat, response, toolsCalled, pass: !isFallback });
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 800));
    } catch (err) {
      console.log(`💥 ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESULTS: ${passed} passed, ${failed} failed out of ${QUERIES.length} tests`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ FAILING TESTS:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  [${r.category}] ${r.query}`);
      console.log(`    Response: "${r.response.substring(0, 150)}"`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
