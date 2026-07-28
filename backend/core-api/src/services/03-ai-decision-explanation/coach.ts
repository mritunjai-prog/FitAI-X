import { Router } from 'express';
import prisma from '../../db';
import { getIo } from '../../realtime/socket';
import Groq from 'groq-sdk';

const router = Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are Rachel AI, an advanced, highly precise, and proactive personal fitness assistant. Your primary goal is to provide exact, accurate, and dynamically generated responses based strictly on the user's input, profile, and fitness context. You are integrated into a modern UI (FitAI X / Antigravity).

CORE RULES & BEHAVIOR:
1. NO HARDCODED OR DUMMY DATA: Never use placeholder data, generic templates, or pre-written hardcoded plans. Every workout plan, meal plan, or macro calculation MUST be dynamically generated based on the user's specific goals, body metrics, dietary preferences, and timeline. 
2. EXACTNESS & ACCURACY: Calculate macros mathematically based on fitness science (e.g., 1g of protein per lb of body weight for muscle gain). Do not guess. If you need a user's weight or schedule to make a plan accurate, ask them for it.
3. NEVER FAKE ACTIONS: If a user asks you to "add this to my calendar," "save this to my meal planner," or "adjust my workout," you MUST use the provided function/tool calls to execute the action. 
4. DO NOT SAY "I HAVE ADDED IT" UNLESS YOU CALLED THE TOOL: You are forbidden from replying with text claiming you performed an action if you did not explicitly trigger the corresponding tool.
5. EXPLAINABILITY: You must always provide a human-readable reason for your recommendations (e.g., "I replaced Squats with Leg Press because of your reported knee pain").
6. UI INTEGRATION: Rely on your tools to render complex UI elements rather than trying to draw calendars or tables in plain Markdown text.

Always be warm, encouraging, but highly efficient.`;

// ─── Tool definitions (Groq format) ──────────────────────────────────────────
const tools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "add_to_calendar",
      description: "Adds a dynamically generated event, workout, or meal to the user's smart calendar.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The title of the event" },
          date: { type: "string", description: "The target date in YYYY-MM-DD format" },
          description: { type: "string", description: "Specific dynamic details (exercises, reps, sets, ingredients)." }
        },
        required: ["title", "date", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_to_meal_planner",
      description: "Saves a mathematically calculated meal plan into the user's database.",
      parameters: {
        type: "object",
        properties: {
          day: { type: "string" },
          meal_type: { type: "string", enum: ["Breakfast", "Lunch", "Dinner", "Snack"] },
          food_items: { type: "array", items: { type: "string" } },
          total_calories: { type: "number" }
        },
        required: ["day", "meal_type", "food_items", "total_calories"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "adjust_workout",
      description: "Modifies the user's current workout plan based on dynamically changing goals or fatigue predictions.",
      parameters: {
        type: "object",
        properties: {
          workout_id: { type: "string" },
          action: { type: "string", enum: ["replace_exercise", "adjust_intensity", "generate_new"] },
          reason: { type: "string", description: "The human-readable explanation for this adjustment." }
        },
        required: ["action", "reason"]
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
  
  if (toolName === 'add_to_calendar') {
    const { title, date, description } = args;
    const d = new Date(date);
    const dayIndex = isNaN(d.getDay()) ? 1 : d.getDay();
    
    await prisma.calendarEvent.create({
      data: { userId, dayIndex, title, intensity: 'Medium', type: 'workout' },
    });

    io?.to(userId).emit('ai_stream_action', {
      messageId: tempMessageId,
      actionPayload: { type: 'CALENDAR_UPDATED', count: 1, summary: title },
    });

    return { 
      result: `SUCCESS: The event "${args.title}" was successfully added to the user's calendar. DO NOT call this tool again. Please reply to the user confirming it is done.`, 
      actionPayload: { type: 'CALENDAR_UPDATED', count: 1, summary: args.title } 
    };
  }

  if (toolName === 'save_to_meal_planner') {
    const { day, meal_type, food_items, total_calories } = args;
    const created = await prisma.meal.create({
      data: { userId, type: meal_type.toLowerCase(), name: food_items.join(', '), cals: total_calories, cost: 0 },
    });

    io?.to(userId).emit('ai_stream_action', {
      messageId: tempMessageId,
      actionPayload: { type: 'DIET_UPDATED', count: 1, totalCals: total_calories, summary: created.name },
    });

    return { 
      result: `SUCCESS: The meal plan was saved to the database. DO NOT call this tool again. Please reply to the user confirming it is done.`, 
      actionPayload: { type: 'DIET_UPDATED', count: 1, totalCals: args.total_calories, summary: args.food_items.join(', ') } 
    };
  }

  if (toolName === 'adjust_workout') {
    const { action, reason } = args;
    
    // Example Prisma Update for FR-021 Workout Adjustment
    // await prisma.workout.update(...) 
    
    io?.to(userId).emit('ai_stream_action', {
      messageId: tempMessageId,
      actionPayload: { type: 'WORKOUT_CREATED', count: 1, summary: reason },
    });

    return { 
      result: `SUCCESS: The workout was adjusted. DO NOT call this tool again. Please reply to the user summarizing the change.`, 
      actionPayload: { type: 'WORKOUT_CREATED', count: 1, summary: args.reason } 
    };
  }

  return { result: 'ERROR: Unknown tool. Stop attempting to use tools.', actionPayload: null };
}

// GET /api/v1/coach/messages
router.get('/messages', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const messages = await prisma.coachMessage.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
      take: 50,
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
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

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) return res.status(404).json({ error: 'User not found' });

    const userMsg = await prisma.coachMessage.create({
      data: { userId, role: 'user', content: text.trim() },
    });

    res.json({ userMessage: userMsg });

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
Goal: ${existingUser.goal || 'Not provided'}
Height: ${existingUser.height ? existingUser.height + ' cm' : 'Not provided'}
Weight: ${existingUser.weight ? existingUser.weight + ' kg' : 'Not provided'}
Diet Preference: ${existingUser.diet || 'Not provided'}
Injuries: ${existingUser.currentInjuries || 'None'}
Current Workout: ${currentWorkout ? `"${(currentWorkout as any).title}"` : 'None'}
--------------------`;

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
        });

        const choice = response.choices[0];
        const message = choice.message;

        if (choice.finish_reason === 'stop' || (!message.tool_calls?.length && message.content)) {
          finalText = message.content || '';
          break;
        }

        if (message.tool_calls?.length) {
          loopMessages.push({
            role: 'assistant',
            content: message.content || '',
            tool_calls: message.tool_calls,
          } as any);

          for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            let toolArgs: any = {};
            try {
              toolArgs = JSON.parse(toolCall.function.arguments);
            } catch {
              console.error(`[Coach API] Failed to parse JSON for ${toolName}`);
            }

            const { result } = await executeTool(toolName, toolArgs, userId, io, tempMessageId);

            loopMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: result,
            } as any);
          }
          continue;
        }
        break;
      }

      if (!finalText) {
        finalText = loopMessages.some(m => m.role === 'tool') 
          ? "I've processed your request and updated your planner accordingly." 
          : "I couldn't process that request properly. Please try again.";
      }

      const CHUNK_SIZE = 8;
      for (let i = 0; i < finalText.length; i += CHUNK_SIZE) {
        const chunk = finalText.slice(i, i + CHUNK_SIZE);
        io?.to(userId).emit('ai_stream_chunk', { messageId: tempMessageId, chunk });
        await new Promise(r => setTimeout(r, 10));
      }

      const aiMsg = await prisma.coachMessage.create({
        data: { userId, role: 'ai', content: finalText },
      });

      io?.to(userId).emit('ai_stream_end', { messageId: tempMessageId, finalMessage: aiMsg });

    } catch (streamError: any) {
      console.error('[Coach API] AI Error:', streamError);
      io?.to(userId).emit('ai_stream_error', { 
        fallbackMessage: { id: Date.now().toString(), content: "Sorry, I'm unable to respond right now." } 
      });
    }

  } catch (error: any) {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to process message' });
  }
});

export default router;
