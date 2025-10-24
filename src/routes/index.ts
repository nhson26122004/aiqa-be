import { Router } from 'express'
import authRoutes from './auth.routes'
import pdfRoutes from './pdf.routes'
import conversationRoutes from './conversation.routes'
import scoreRoutes from './score.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/pdfs', pdfRoutes)
router.use('/conversations', conversationRoutes)
router.use('/scores', scoreRoutes)

export default router
