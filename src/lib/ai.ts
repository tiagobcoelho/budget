import { openai } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import { z } from 'zod';

const openaiModel = openai('gpt-4o-mini');

export async function generateAIResponse(prompt: string) {
  try {
    const result = await generateText({
      model: openaiModel,
      prompt,
      maxTokens: 1000,
    });

    return result.text;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response');
  }
}

export async function streamAIResponse(prompt: string) {
  try {
    const result = await streamText({
      model: openaiModel,
      prompt,
      maxTokens: 1000,
    });

    return result;
  } catch (error) {
    console.error('Error streaming AI response:', error);
    throw new Error('Failed to stream AI response');
  }
}

export const aiSchema = z.object({
  message: z.string().describe('The AI response message'),
  confidence: z.number().min(0).max(1).describe('Confidence level of the response'),
});

export async function generateStructuredResponse(prompt: string) {
  try {
    const result = await generateText({
      model: openaiModel,
      prompt,
      schema: aiSchema,
      maxTokens: 1000,
    });

    return result.object;
  } catch (error) {
    console.error('Error generating structured AI response:', error);
    throw new Error('Failed to generate structured AI response');
  }
}
