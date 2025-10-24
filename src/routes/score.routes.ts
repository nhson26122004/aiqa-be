import { Router } from 'express'
import { AppDataSource } from '../config/database'
import { Score, Conversation } from '../entities'
import { authenticate } from '../middleware/auth'

const router = Router()

// Create score for conversation
router.post('/', authenticate, async (req, res) => {
  try {
    const conversationId = req.query.conversation_id as string
    const { score } = req.body

    if (!conversationId) {
      return res.status(400).json({ message: 'conversation_id is required' })
    }

    if (typeof score !== 'number' || score < 0 || score > 5) {
      return res.status(400).json({ message: 'score must be between 0 and 5' })
    }

    // Verify conversation belongs to user
    const conversationRepository = AppDataSource.getRepository(Conversation)
    const conversation = await conversationRepository.findOne({
      where: { id: conversationId, userId: req.user!.id },
    })

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    const scoreRepository = AppDataSource.getRepository(Score)
    const scoreEntity = scoreRepository.create({
      conversationId,
      score,
    })

    await scoreRepository.save(scoreEntity)

    res.json(scoreEntity.toJSON())
  } catch (error) {
    console.error('Create score error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get scores statistics
router.get('/', authenticate, async (req, res) => {
  try {
    const scoreRepository = AppDataSource.getRepository(Score)
    const conversationRepository = AppDataSource.getRepository(Conversation)

    // Get all user's conversations
    const conversations = await conversationRepository.find({
      where: { userId: req.user!.id },
      select: ['id'],
    })

    const conversationIds = conversations.map((c) => c.id)

    if (conversationIds.length === 0) {
      return res.json([])
    }

    // Get scores for user's conversations
    const scores = await scoreRepository
      .createQueryBuilder('score')
      .where('score.conversationId IN (:...ids)', { ids: conversationIds })
      .getMany()

    // Group by score value and count
    const scoreStats = scores.reduce((acc, score) => {
      const key = Math.floor(score.score).toString()
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Format for chart
    const result = Object.entries(scoreStats).map(([score, count]) => ({
      score: parseInt(score),
      count,
    }))

    res.json(result)
  } catch (error) {
    console.error('Get scores error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
