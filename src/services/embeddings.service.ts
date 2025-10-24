import { PineconeStore } from '@langchain/pinecone'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Pinecone } from '@pinecone-database/pinecone'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { Document } from '@langchain/core/documents'
import { readFile } from 'fs/promises'

// Import pdf-parse directly
const pdfParse = require('pdf-parse')

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

export const processDocument = async (pdfId: string, filePath: string) => {
  console.log(`Processing document ${pdfId}...`)

  try {
    // Read and parse PDF
    console.log('📄 Reading PDF file...')
    const dataBuffer = await readFile(filePath)

    console.log('📄 Parsing PDF...')
    const pdfData = await pdfParse(dataBuffer)
    console.log(`✅ PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} characters`)

    // Validate PDF content
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error('PDF contains no readable text')
    }

    // Create Document objects
    const docs = [
      new Document({
        pageContent: pdfData.text,
        metadata: {
          pdfId,
          numPages: pdfData.numpages,
          source: filePath,
        },
      }),
    ]

    console.log(`Loaded ${docs.length} document from PDF`)

    // Split text into chunks
    console.log('✂️  Splitting text into chunks...')
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })

    const splitDocs = await textSplitter.splitDocuments(docs)
    console.log(`✅ Split into ${splitDocs.length} chunks`)

    if (splitDocs.length === 0) {
      throw new Error('No chunks created from PDF')
    }

    // Create embeddings
    console.log('🔧 Creating embeddings client...')
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: 'text-embedding-004',
    })
    console.log('✅ Embeddings client created')
    console.log('>>>>>>>>>>>>>>>>>> EMD', embeddings)

    // Store in Pinecone
    console.log('📌 Connecting to Pinecone...')
    const client = getPineconeClient()
    const indexName = process.env.PINECONE_INDEX || 'aiqa'
    const index = client.index(indexName)
    console.log(`📌 Using index: ${indexName}, namespace: ${pdfId}`)

    console.log('💾 Storing embeddings in Pinecone...')
    await PineconeStore.fromDocuments(splitDocs, embeddings, {
      pineconeIndex: index as any,
      namespace: pdfId,
    })
    console.log(`✅ Document ${pdfId} processed successfully`)

    return {
      success: true,
      chunks: splitDocs.length,
      pages: pdfData.numpages,
    }
  } catch (error) {
    console.error(`❌ Error processing document ${pdfId}:`, error)
    throw error
  }
}
