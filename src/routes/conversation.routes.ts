import { Router } from 'express'
import { AppDataSource } from '../config/database'
import { Conversation, Pdf, Message } from '../entities'
import { authenticate } from '../middleware/auth'
import { buildChat } from '../services/chat.service'

const router = Router()

// List conversations for a PDF
router.get('/', authenticate, async (req, res) => {
  try {
    const pdfId = req.query.pdf_id as string

    if (!pdfId) {
      return res.status(400).json({ message: 'pdf_id is required' })
    }

    // Verify PDF belongs to user
    const pdfRepository = AppDataSource.getRepository(Pdf)
    const pdf = await pdfRepository.findOne({
      where: { id: pdfId, userId: req.user!.id },
    })

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' })
    }

    const conversationRepository = AppDataSource.getRepository(Conversation)
    const conversations = await conversationRepository.find({
      where: { pdfId },
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    })

    res.json(conversations.map((c) => c.toJSON()))
  } catch (error) {
    console.error('List conversations error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Create conversation
router.post('/', authenticate, async (req, res) => {
  try {
    const pdfId = req.query.pdf_id as string

    if (!pdfId) {
      return res.status(400).json({ message: 'pdf_id is required' })
    }

    // Verify PDF belongs to user
    const pdfRepository = AppDataSource.getRepository(Pdf)
    const pdf = await pdfRepository.findOne({
      where: { id: pdfId, userId: req.user!.id },
    })

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' })
    }

    const conversationRepository = AppDataSource.getRepository(Conversation)
    const conversation = conversationRepository.create({
      pdfId,
      userId: req.user!.id,
      messages: [],
    })

    await conversationRepository.save(conversation)

    res.json(conversation.toJSON())
  } catch (error) {
    console.error('Create conversation error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Send message to conversation
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const conversationId = req.params.id
    const { input } = req.body
    const streaming = req.query.stream === 'true'

    if (!input) {
      return res.status(400).json({ message: 'input is required' })
    }

    const conversationRepository = AppDataSource.getRepository(Conversation)
    const conversation = await conversationRepository.findOne({
      where: { id: conversationId, userId: req.user!.id },
      relations: ['pdf'],
    })

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    // Ensure conversation has a pdfId
    if (!conversation.pdfId) {
      return res.status(400).json({ message: 'Conversation has no associated PDF' })
    }

    // Store pdfId in a const to satisfy TypeScript
    const pdfId = conversation.pdfId

    // Verify PDF exists and is processed
    console.log(`📄 Checking PDF: ${pdfId}`)
    const pdfRepository = AppDataSource.getRepository(Pdf)
    const pdf = await pdfRepository.findOne({
      where: { id: pdfId, userId: req.user!.id },
    })

    if (!pdf) {
      console.error(`❌ PDF not found: ${pdfId}`)
      return res.status(404).json({ message: 'PDF not found' })
    }

    // Check if PDF is processed (optional - you can add a status field to PDF entity)
    console.log(`✅ PDF found: ${pdf.name}`)

    // Save user message
    console.log('💬 Saving user message...')
    const messageRepository = AppDataSource.getRepository(Message)
    const userMessage = messageRepository.create({
      conversationId,
      role: 'user',
      content: input,
    })
    await messageRepository.save(userMessage)
    console.log('✅ User message saved')

    // Build chat
    console.log('🔨 Building chat...')
    console.log(`📄 Conversation PDF ID: ${pdfId}`)
    console.log(`📄 Conversation ID: ${conversationId}`)
    try {
      const chat = await buildChat({
        conversationId,
        pdfId,
        streaming,
        metadata: {
          conversationId,
          userId: req.user!.id,
          pdfId,
        },
      })
      console.log('✅ Chat built')

      if (streaming) {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        try {
          console.log('🌊 Starting streaming...')
          const stream = await chat.stream(input)
          let fullResponse = ''

          for await (const chunk of stream) {
            const content = chunk
            fullResponse += content
            res.write(`data: ${JSON.stringify({ content })}\n\n`)
          }
          console.log('✅ Streaming complete')

          // Save assistant message
          const assistantMessage = messageRepository.create({
            conversationId,
            role: 'assistant',
            content: fullResponse,
          })
          await messageRepository.save(assistantMessage)

          res.write(`data: [DONE]\n\n`)
          res.end()
        } catch (error) {
          console.error('Streaming error:', error)
          res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`)
          res.end()
        }
      } else {
        // Non-streaming response
        console.log('💬 Generating response...')
        const response = await chat.run(input)
        console.log('✅ Response generated:', response.substring(0, 50) + '...')

        // Save assistant message
        const assistantMessage = messageRepository.create({
          conversationId,
          role: 'assistant',
          content: response,
        })
        await messageRepository.save(assistantMessage)
        console.log('✅ Assistant message saved')

        res.json({
          role: 'assistant',
          content: response,
        })
      }
    } catch (buildError) {
      console.error('❌ Error building chat:', buildError)
      res.status(500).json({ message: 'Failed to build chat system' })
    }
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
