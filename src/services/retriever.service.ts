import { Pinecone } from '@pinecone-database/pinecone'
import { ChatArgs } from './chat.service'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { PineconeStore } from '@langchain/pinecone'

let pineconeClient: Pinecone | null = null

const getPineconeClient = () => {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set')
    }

    pineconeClient = new Pinecone({
      apiKey,
    })
  }
  return pineconeClient
}

export type Retriever = (
  query: string
) => Promise<{ pageContent: string; metadata?: Record<string, any> }[]>

export const buildRetriever = async (args: ChatArgs): Promise<Retriever> => {
  console.log('📌 Connecting to Pinecone...')
  const client = getPineconeClient()
  const indexName = process.env.PINECONE_INDEX || 'aiqa'
  console.log(`📌 Using index: ${indexName}, namespace: ${args.pdfId}`)

  const index = client.index(indexName)

  // Use Google Generative AI Embeddings
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: 'text-embedding-004', // Match with embeddings service
  })

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index as any,
    namespace: args.pdfId, // Use pdfId as namespace to separate documents
  })

  return async (query: string) => {
    try {
      console.log(`🔍 Searching for query: "${query}"`)
      console.log(`📄 Using namespace: ${args.pdfId}`)

      const results = await (vectorStore as any).similaritySearch(query, 4)
      console.log(`✅ Found ${results.length} results`)

      if (results.length === 0) {
        console.warn(`⚠️  No results found for PDF ID: ${args.pdfId}`)
        console.warn(`💡 This might mean the PDF was not processed or has different ID`)
      } else {
        console.log(`📄 First result preview: ${results[0].pageContent.substring(0, 100)}...`)
      }

      return results
    } catch (error) {
      console.error('❌ Error in similarity search:', error)
      console.error(`❌ PDF ID: ${args.pdfId}`)
      console.error(`❌ Index: ${indexName}`)
      throw error
    }
  }
}
