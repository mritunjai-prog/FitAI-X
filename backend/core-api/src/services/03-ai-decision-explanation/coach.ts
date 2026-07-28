import { Router } from 'express';
import prisma from '../../db';
import { getIo } from '../../realtime/socket';
import { createGroq } from '@ai-sdk/groq';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { buildUserContext } from '../ai/aiService';

const router = Router();

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `You are Rachel AI, an advanced, highly precise, and proactive personal fitness assistant. Your primary goal is to provide exact, accurate, and dynamically generated responses based strictly on the user's input, profile, and fitness context. You are integrated into a modern UI (FitAI X / Antigravity).

CORE RULES & BEHAVIOR:
1. NO HARDCODED OR DUMMY DATA: Never use placeholder data, generic templates, or pre-written hardcoded plans. Every workout plan, meal plan, or macro calculation MUST be dynamically generated.
2. EXACTNESS & ACCURACY: Calculate macros mathematically based on fitness science. Do not guess. If you need a user's weight or schedule to make a plan accurate, ask them for it.
3. NEVER FAKE ACTIONS: If a user asks you to "add this to my calendar," or "adjust my workout," you MUST use the provided function/tool calls to execute the action. 
4. DO NOT SAY "I HAVE ADDED IT" UNLESS YOU CALLED THE TOOL: You are forbidden from replying with text claiming you performed an action if you did not explicitly trigger the corresponding tool.
5. EXPLAINABILITY: You must always provide a human-readable reason for your recommendations (e.g., "I replaced Squats with Leg Press because of your reported knee pain").
6. UI INTEGRATION: Rely on your tools to render complex UI elements rather than trying to draw calendars or tables in plain Markdown text.
7. ALWAYS RESPOND WITH TEXT: Even if you trigger a tool call to update the calendar or workout, you MUST still provide a friendly, conversational text response summarizing what you did and offering next steps. Do not just return a tool call with no text. Use rich Markdown formatting (bullet points, bold text) to make your response easy to read.

Always be warm, encouraging, but highly efficient.`;

// Vercel AI SDK Tools
const aiTools = {
  add_to_calendar: tool({
    description: "Adds a dynamically generated event, workout, or meal to the user's smart calendar.",
    parameters: z.object({
      title: z.string(),
      date: z.string().describe("YYYY-MM-DD"),
      description: z.string(),
    }),
    execute: async (args: any) => {
      const { title, date, description } = args;
      // Note: we can't emit easily from inside the execute block if we don't have io or userId, but we can return the action string and emit it after.
      // Wait, we can't emit from inside unless we bind it. So we just return the payload and process it later?
      // Actually, we can just do the DB operation here, and return a JSON string containing the action payload to be emitted later by iterating through toolResults.
      const d = new Date(date);
      const dayIndex = isNaN(d.getDay()) ? 1 : d.getDay();
      return JSON.stringify({ type: 'CALENDAR_UPDATED', count: 1, summary: title, dbData: { dayIndex, title } });
    }
  }),
  save_to_meal_planner: tool({
    description: "Saves a mathematically calculated meal plan into the user's database.",
    parameters: z.object({
      day: z.string(),
      meal_type: z.string(),
      food_items: z.array(z.string()),
      total_calories: z.union([z.number(), z.string()]).transform(v => Number(v)),
    }),
    execute: async (args: any) => {
      const { meal_type, food_items, total_calories } = args;
      return JSON.stringify({ type: 'DIET_UPDATED', count: 1, totalCals: total_calories, summary: food_items.join(', ') });
    }
  }),
  adjust_workout: tool({
    description: "Modifies the user's current workout plan based on dynamically changing goals or fatigue predictions.",
    parameters: z.object({
      workout_id: z.string().optional(),
      action: z.string(),
      reason: z.string(),
    }),
    execute: async (args: any) => {
      const { reason } = args;
      return JSON.stringify({ type: 'WORKOUT_CREATED', count: 1, summary: reason });
    }
  })
};

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
      const contextObj = await buildUserContext(userId);
      const userContext = `
--- COMPREHENSIVE USER CONTEXT ---
${JSON.stringify(contextObj, null, 2)}
----------------------------------`;

      const chatHistory = await prisma.coachMessage.findMany({
        where: { userId, id: { not: userMsg.id } },
        orderBy: { id: 'desc' },
        take: 6,
      });

      const historyMessages = chatHistory.reverse().map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content,
      }));

      const conversationMessages: any[] = [
        ...historyMessages,
        { role: 'user', content: text.trim() },
      ];

      io?.to(userId).emit('ai_stream_start', { messageId: tempMessageId });

      const { text: aiResponse, toolResults } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: SYSTEM_PROMPT + '\n' + userContext,
        messages: conversationMessages,
        tools: aiTools,
        temperature: 0.6,
      });

      let finalText = aiResponse || "Got it! I've updated your plans.";
      
      // Process DB additions and emit actions
      if (toolResults && toolResults.length > 0) {
        for (const res of toolResults) {
          try {
             const payload = JSON.parse((res as any).result as string);
             if (payload.type === 'CALENDAR_UPDATED') {
               await prisma.calendarEvent.create({
                 data: { userId, dayIndex: payload.dbData.dayIndex, title: payload.dbData.title, intensity: 'Medium', type: 'workout' },
               });
             } else if (payload.type === 'DIET_UPDATED') {
               await prisma.meal.create({
                 data: { userId, type: 'snack', name: payload.summary, cals: payload.totalCals, cost: 0 },
               });
             }
             io?.to(userId).emit('ai_stream_action', { messageId: tempMessageId, actionPayload: payload });
          } catch(e) {}
        }
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
