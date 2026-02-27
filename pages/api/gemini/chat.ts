import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, context } = req.body as {
      messages: ChatMessage[];
      context?: {
        collegeName?: string;
        pageType?: string;
      };
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build system context
    let systemPrompt = `You are UniPreply Advisor, a helpful AI assistant for college admissions. You help students and parents navigate the college application process, understand admissions data, compare schools, and make informed decisions.

Be concise, friendly, and informative. When discussing specific colleges, use data if available. If you don't know something specific, say so and offer to help find the information.`;

    if (context?.collegeName) {
      systemPrompt += `\n\nThe user is currently viewing the page for ${context.collegeName}.`;
    }

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    // Start chat with history
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: systemPrompt }] },
        ...history,
      ],
    });

    // Set up streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in chat API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for rate limit error
    const isRateLimit = errorMessage.includes('429') || errorMessage.includes('quota');
    const userMessage = isRateLimit 
      ? 'Rate limit exceeded. Please wait a minute and try again.'
      : errorMessage;
    
    if (!res.headersSent) {
      res.status(isRateLimit ? 429 : 500).json({ error: userMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
      res.end();
    }
  }
}
