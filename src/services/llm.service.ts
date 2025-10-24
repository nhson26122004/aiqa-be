import { GoogleGenerativeAI } from '@google/generative-ai'
import { ChatArgs } from './chat.service'

export interface LLMLike {
  streaming: boolean
  invoke(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  ): Promise<{ content: string }>
  stream(
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  ): AsyncGenerator<{ content: string }>
}

export const buildLLM = (args: ChatArgs): LLMLike => {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not set')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' })

  return {
    streaming: args.streaming,

    async invoke(messages) {
      const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      return { content: text }
    },

    async *stream(messages) {
      const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
      const stream = await model.generateContentStream(prompt)
      for await (const chunk of stream.stream) {
        const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          yield { content: text }
        }
      }
    },
  }
}
