import { buildRetriever } from './retriever.service'
import { buildMemory } from './memory.service'
import { buildLLM, LLMLike } from './llm.service'

export interface ChatArgs {
  conversationId: string
  pdfId: string
  streaming: boolean
  metadata: {
    conversationId: string
    userId: string
    pdfId: string
  }
}

export interface ChatInterface {
  run(input: string): Promise<string>
  stream(input: string): AsyncGenerator<string>
}

export const buildChat = async (args: ChatArgs): Promise<ChatInterface> => {
  console.log('🔧 Building retriever...')
  const retriever = await buildRetriever(args)
  console.log('🔧 Building memory...')
  const history = await buildMemory(args)
  console.log('🔧 Building LLM...')
  const llm: LLMLike = buildLLM(args)
  console.log('✅ All components built')

  return {
    async run(input: string): Promise<string> {
      console.log('🔍 Retrieving documents...')
      const docs = await retriever(input)
      console.log(`✅ Retrieved ${docs.length} documents`)

      if (docs.length === 0) {
        console.warn('⚠️  No documents found in vector store!')
        return 'I could not find any relevant information in the document to answer your question.'
      }

      const context = docs.map((d) => d.pageContent).join('\n\n')
      console.log(`📄 Context length: ${context.length} characters`)
      console.log(`📄 Context preview: ${context.substring(0, 200)}...`)

      const systemPrompt =
        'You are a helpful assistant answering questions based on the provided document context. Use ONLY the information from the context to answer. If the answer is not in the context, say so.'

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        {
          role: 'user',
          content: `Context from document:\n${context}\n\nQuestion: ${input}\n\nPlease answer based on the context above.`,
        },
      ] as any

      console.log('🤖 Calling LLM...')
      const response = await llm.invoke(messages)
      console.log('✅ LLM responded')
      return response.content
    },

    async *stream(input: string): AsyncGenerator<string> {
      if (!llm.streaming) {
        const response = await (await buildChat(args)).run(input)
        yield response
        return
      }

      console.log('🔍 Retrieving documents for streaming...')
      const docs = await retriever(input)
      console.log(`✅ Retrieved ${docs.length} documents`)

      if (docs.length === 0) {
        console.warn('⚠️  No documents found in vector store!')
        yield 'I could not find any relevant information in the document to answer your question.'
        return
      }

      const context = docs.map((d) => d.pageContent).join('\n\n')
      console.log(`📄 Context length: ${context.length} characters`)

      const systemPrompt =
        'You are a helpful assistant answering questions based on the provided document context. Use ONLY the information from the context to answer. If the answer is not in the context, say so.'

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map((h) => ({ role: h.role, content: h.content })),
        {
          role: 'user',
          content: `Context from document:\n${context}\n\nQuestion: ${input}\n\nPlease answer based on the context above.`,
        },
      ] as any

      console.log('🤖 Calling LLM streaming...')
      const stream = await llm.stream(messages)
      for await (const chunk of stream) {
        yield chunk.content
      }
      console.log('✅ Streaming complete')
    },
  }
}
