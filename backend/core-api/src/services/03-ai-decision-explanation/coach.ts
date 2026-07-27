import { Router } from 'express'
import prisma from '../../db'
import { getIo } from '../../realtime/socket';
import Groq from 'groq-sdk';

const router = Router()

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are Rachel AI, the intelligent AI fitness coach inside FitAI X.

## Your Capabilities
You can answer fitness questions AND take real actions inside the app. You have access to:
- **addWorkoutToCalendar** — schedule workouts in the Smart Calendar
- **createWorkoutPlan** — save a workout plan for the user
- **addMealToDietPlan** — log meals in the user's nutrition tracker

## When to Use Tools
- "add to calendar", "schedule my workout", "put leg day on Monday" → addWorkoutToCalendar
- "create a workout plan", "make me a split", "build a gym routine" → createWorkoutPlan
- "save to my diet", "log this meal", "add to nutrition" → addMealToDietPlan
- You may call multiple tools if needed (e.g. create plan AND add to calendar)
- After a tool call, briefly confirm what you did

## STRICT RESPONSE LENGTH RULES — FOLLOW EXACTLY
- **Simple question** (how many sets, what is protein, etc.) → 1-3 sentences MAX
- **Workout or diet plan** → Structured list, MAX 5-7 exercises or 4 meals. NO long paragraphs. Use a compact table or bullet list only.
- **Advice/explanation** → MAX 3 short paragraphs
- **Action confirmation** → 1-2 sentences confirming the action + what was saved
- **NEVER write walls of text. Keep every answer concise and scannable.**
- Use Markdown: bold headers, short bullet points, no filler words

## Specializations
Workout Planning, Nutrition, Recovery, Muscle Gain, Fat Loss, Strength Training, Cardio, Mobility, Injury Prevention, Supplements, Motivation

## Rules
1. Always fully answer the question — but concisely
2. Personalize using the user profile below
3. For workout plans: Exercise | Sets × Reps | Rest
4. For diet plans: Meal name | Calories | Protein
5. Never pad your answer with unnecessary text`;

// ─── Tool definitions (Groq format) ──────────────────────────────────────────
const tools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'addWorkoutToCalendar',
      description: 'Add one or more workout sessions to the user\'s Smart Calendar. Use this when the user asks to schedule workouts.',
      parameters: {
        type: 'object',
        required: ['events'],
        properties: {
          events: {
            type: 'array',
            description: 'List of calendar events to add',
            items: {
              type: 'object',
              required: ['title', 'dayIndex', 'intensity'],
              properties: {
                title: { type: 'string', description: 'Workout name, e.g. "Leg Day", "Push Day"' },
                dayIndex: { type: 'number', description: 'Day of week index matching the app calendar: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday' },
                intensity: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Workout intensity' }
              }
            }
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createWorkoutPlan',
      description: 'Create and save a complete workout plan with exercises for the user. Use this when the user asks to create, build or generate a workout plan.',
      parameters: {
        type: 'object',
        required: ['title', 'duration', 'exercises'],
        properties: {
          title: { type: 'string', description: 'Workout plan title, e.g. "6-Day PPL Muscle Gain"' },
          duration: { type: 'string', description: 'Total workout duration, e.g. "60 mins"' },
          exercises: {
            type: 'array',
            description: 'List of exercises in the plan',
            items: {
              type: 'object',
              required: ['name', 'sets', 'reps'],
              properties: {
                name: { type: 'string', description: 'Exercise name' },
                sets: { type: 'number', description: 'Number of sets' },
                reps: { type: 'number', description: 'Number of reps per set' },
                weight: { type: 'string', description: 'Weight or bodyweight, e.g. "60kg", "Bodyweight"' }
              }
            }
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'addMealToDietPlan',
      description: 'Add one or more meals to the user\'s nutrition/diet log. Use this when the user asks to log a meal, save a diet plan, or add food entries.',
      parameters: {
        type: 'object',
        required: ['meals'],
        properties: {
          meals: {
            type: 'array',
            description: 'List of meal entries to add',
            items: {
              type: 'object',
              required: ['type', 'name', 'cals', 'cost'],
              properties: {
                type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Meal type' },
                name: { type: 'string', description: 'Meal name or description' },
                cals: { type: 'number', description: 'Calorie count' },
                cost: { type: 'number', description: 'Estimated cost in USD (use 0 if unknown)' }
              }
            }
          }
        }
      }
    }
  }
];

// ─── Tool execution logic ─────────────────────────────────────────────────────
async function executeTool(
  toolName: string,
  args: any,
  userId: string,
  io: any,
  tempMessageId: string
): Promise<{ result: string; actionPayload: any }> {
  
  if (toolName === 'addWorkoutToCalendar') {
    const { events } = args;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Clear existing calendar events first, then add new ones
    await prisma.calendarEvent.deleteMany({ where: { userId } });
    
    const created = await Promise.all(
      events.map((ev: any) =>
        prisma.calendarEvent.create({
          data: {
            userId,
            dayIndex: ev.dayIndex,
            title: ev.title,
            intensity: ev.intensity,
            type: 'workout',
          },
        })
      )
    );

    const summary = created.map((e: any) => `${dayNames[e.dayIndex]}: ${e.title} (${e.intensity})`).join(', ');
    
    io?.to(userId).emit('ai_stream_action', {
      messageId: tempMessageId,
      actionPayload: { type: 'CALENDAR_UPDATED', count: created.length, summary },
    });

    return {
      result: `Successfully added ${created.length} workout(s) to the Smart Calendar: ${summary}`,
      actionPayload: { type: 'CALENDAR_UPDATED', count: created.length, summary },
    };
  }

  if (toolName === 'createWorkoutPlan') {
    const { title, duration, exercises } = args;

    // Mark existing plans as not current
    await prisma.workout.updateMany({
      where: { userId, isCurrent: true },
      data: { isCurrent: false },
    });

    const workout = await prisma.workout.create({
      data: {
        userId,
        title,
        duration,
        isCurrent: true,
        exercises: {
          create: exercises.map((ex: any) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight || 'Bodyweight',
          })),
        },
      },
      include: { exercises: true },
    });

    io?.to(userId).emit('ai_stream_action', {
      messageId: tempMessageId,
      actionPayload: { type: 'WORKOUT_CREATED', title: workout.title, exerciseCount: exercises.length },
    });

    return {
      result: `Successfully created workout plan "${title}" with ${exercises.length} exercises and saved it as your current plan.`,
      actionPayload: { type: 'WORKOUT_CREATED', title: workout.title, exerciseCount: exercises.length },
    };
  }

  if (toolName === 'addMealToDietPlan') {
    const { meals } = args;

    const created = await Promise.all(
      meals.map((meal: any) =>
        prisma.meal.create({
          data: {
            userId,
            type: meal.type,
            name: meal.name,
            cals: meal.cals,
            cost: meal.cost || 0,
          },
        })
      )
    );

    const totalCals = meals.reduce((sum: number, m: any) => sum + m.cals, 0);
    const summary = meals.map((m: any) => `${m.name} (${m.cals} cal)`).join(', ');

    io?.to(userId).emit('ai_stream_action', {
      messageId: tempMessageId,
      actionPayload: { type: 'DIET_UPDATED', count: created.length, totalCals, summary },
    });

    return {
      result: `Successfully added ${created.length} meal(s) to your nutrition log: ${summary}. Total: ${totalCals} calories.`,
      actionPayload: { type: 'DIET_UPDATED', count: created.length, totalCals, summary },
    };
  }

  return { result: 'Unknown tool', actionPayload: null };
}

// GET /api/v1/coach/messages
router.get('/messages', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const messages = await prisma.coachMessage.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });

    const formatted = messages.map(m => ({
      id: m.id,
      sender: m.role,
      text: m.content,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[Coach GET] Error:', error);
    res.status(500).json({ error: 'Failed to fetch coach messages' });
  }
});

// POST /api/v1/coach/messages
router.post('/messages', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    console.log(`[Coach API] Message from ${userId}: "${text}"`);

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Save user message
    const userMsg = await prisma.coachMessage.create({
      data: { userId, role: 'user', content: text.trim() },
    });

    res.json({ userMessage: userMsg });

    // ── Run AI + tools in background ──────────────────────────────────────────
    const io = getIo();
    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const currentWorkout = await prisma.workout.findFirst({
        where: { userId, isCurrent: true },
        include: { exercises: true },
      });

      const userContext = `
--- USER PROFILE ---
Name: ${existingUser.name || 'Not provided'}
Gender: ${existingUser.gender || 'Not provided'}
Age: ${(existingUser as any).age || 'Not provided'}
Height: ${existingUser.height ? existingUser.height + ' cm' : 'Not provided'}
Weight: ${existingUser.weight ? existingUser.weight + ' kg' : 'Not provided'}
Goal: ${existingUser.goal || 'Not provided'}
Experience Level: ${existingUser.experience || 'Not provided'}
Equipment Available: ${existingUser.equipment || 'Not provided'}
Diet Preference: ${existingUser.diet || 'Not provided'}
Allergies: ${existingUser.allergies || 'None'}
Injuries: ${existingUser.currentInjuries || 'None'}
Current Workout Plan: ${currentWorkout ? `"${(currentWorkout as any).title}" (${(currentWorkout as any).exercises?.length} exercises)` : 'None'}
--------------------`;

      // History (exclude the just-saved message) — keep short to stay under token limits
      const chatHistory = await prisma.coachMessage.findMany({
        where: { userId, id: { not: userMsg.id } },
        orderBy: { id: 'desc' },
        take: 6,
      });

      const historyMessages: Groq.Chat.ChatCompletionMessageParam[] = chatHistory.reverse().map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content,
      }));

      const conversationMessages: Groq.Chat.ChatCompletionMessageParam[] = [
        ...historyMessages,
        { role: 'user', content: text.trim() },
      ];

      console.log(`[Coach API] Calling Groq for ${userId} (${conversationMessages.length} messages)...`);

      // ── Agentic loop: keep calling until no more tool calls ─────────────────
      let loopMessages: Groq.Chat.ChatCompletionMessageParam[] = [...conversationMessages];
      let finalText = '';
      let iterationCount = 0;
      const MAX_ITERATIONS = 5;

      io?.to(userId).emit('ai_stream_start', { messageId: tempMessageId });

      while (iterationCount < MAX_ITERATIONS) {
        iterationCount++;

        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + '\n' + userContext },
            ...loopMessages,
          ],
          tools,
          tool_choice: 'auto',
          temperature: 0.6,
          max_tokens: 800,
          stream: false, // no streaming during tool-call loop; we stream text at the end
        });

        const choice = response.choices[0];
        const message = choice.message;

        // If the model returned text (final answer)
        if (choice.finish_reason === 'stop' || (!message.tool_calls?.length && message.content)) {
          finalText = message.content || '';
          console.log(`[Coach API] Got final text (${finalText.length} chars) after ${iterationCount} iteration(s)`);
          break;
        }

        // If the model wants to call tools
        if (message.tool_calls?.length) {
          console.log(`[Coach API] Model calling ${message.tool_calls.length} tool(s)...`);

          // Add assistant message with tool_calls to context
          loopMessages.push({
            role: 'assistant',
            content: message.content || '',
            tool_calls: message.tool_calls,
          } as any);

          // Execute each tool and collect results
          for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            let toolArgs: any = {};
            try {
              toolArgs = JSON.parse(toolCall.function.arguments);
            } catch {
              toolArgs = {};
            }

            console.log(`[Coach API] Executing tool: ${toolName}`);
            const { result } = await executeTool(toolName, toolArgs, userId, io, tempMessageId);

            // Add tool result to context
            loopMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: result,
            } as any);
          }
          // Loop again to get the model's response after tool execution
          continue;
        }

        // Fallback: stop if nothing happened
        break;
      }

      if (!finalText) {
        throw new Error('Groq returned an empty final response after tool loop');
      }

      // Stream the final text character-by-character for typewriter effect
      const CHUNK_SIZE = 8;
      for (let i = 0; i < finalText.length; i += CHUNK_SIZE) {
        const chunk = finalText.slice(i, i + CHUNK_SIZE);
        io?.to(userId).emit('ai_stream_chunk', { messageId: tempMessageId, chunk });
        // Small artificial delay for typewriter feel
        await new Promise(r => setTimeout(r, 10));
      }

      // Save to DB
      const aiMsg = await prisma.coachMessage.create({
        data: { userId, role: 'ai', content: finalText },
      });

      io?.to(userId).emit('ai_stream_end', { messageId: tempMessageId, finalMessage: aiMsg });
      console.log(`[Coach API] Done for ${userId}. Saved message id: ${aiMsg.id}`);

    } catch (streamError: any) {
      console.error('[Coach API] AI Error:', streamError?.message || streamError);

      const fallbackText = "Sorry, I'm unable to respond right now. Please try again.";
      const fallbackMsg = await prisma.coachMessage.create({
        data: { userId, role: 'ai', content: fallbackText },
      });

      io?.to(userId).emit('ai_stream_error', { fallbackMessage: fallbackMsg });
    }

  } catch (error: any) {
    console.error('[Coach API] Route error:', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process message' });
    }
  }
});

export default router;
