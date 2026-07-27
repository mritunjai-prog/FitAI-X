import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Create a safe redis connection that handles failures gracefully (so the app doesn't crash if Redis is missing on the developer's machine)
const connection = new IORedis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    // Only retry a few times to prevent infinite loops if redis isn't running
    if (times > 3) {
      console.warn('[BullMQ] Redis is not available, background jobs will be disabled or simulated.');
      return null;
    }
    return Math.min(times * 50, 2000);
  }
});

// Create the AI Generation Queue (FR-030)
export const aiQueue = new Queue('AI_Queue', { connection });

// Events for the queue (so we can listen for job completion)
export const aiQueueEvents = new QueueEvents('AI_Queue', { connection });
