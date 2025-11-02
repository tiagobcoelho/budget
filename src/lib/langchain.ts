import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function createLangChainResponse(prompt: string) {
  try {
    const template = PromptTemplate.fromTemplate(`
      You are a helpful AI assistant. Please respond to the following question:
      
      {question}
      
      Provide a clear, concise, and helpful response.
    `);

    const chain = RunnableSequence.from([
      template,
      model,
      new StringOutputParser(),
    ]);

    const result = await chain.invoke({
      question: prompt,
    });

    return result;
  } catch (error) {
    console.error('Error with LangChain:', error);
    throw new Error('Failed to generate LangChain response');
  }
}

export async function createCustomChain(systemPrompt: string) {
  const template = PromptTemplate.fromTemplate(`
    {system_prompt}
    
    User question: {question}
  `);

  const chain = RunnableSequence.from([
    template,
    model,
    new StringOutputParser(),
  ]);

  return {
    invoke: async (question: string) => {
      return await chain.invoke({
        system_prompt: systemPrompt,
        question,
      });
    },
  };
}
