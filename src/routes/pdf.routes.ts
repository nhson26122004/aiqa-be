import { Router } from 'express'
import { AppDataSource } from '../config/database'
import { Pdf } from '../entities'
import { authenticate } from '../middleware/auth'
import { upload } from '../middleware/upload'
import * as fs from 'fs'
import * as path from 'path'

import { processDocument } from '../services/embeddings.service'

const router = Router()

// List user's PDFs
router.get('/', authenticate, async (req, res) => {
  try {
    const pdfRepository = AppDataSource.getRepository(Pdf)
    const pdfs = await pdfRepository.find({
      where: { userId: req.user!.id },
      order: { createdAt: 'DESC' },
    })

    res.json(pdfs.map((pdf) => pdf.toJSON()))
  } catch (error) {
    console.error('List PDFs error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Upload PDF
router.post('/', authenticate as any, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const pdfRepository = AppDataSource.getRepository(Pdf)

    // Extract file ID from filename (without extension)
    const fileId = path.parse(req.file.filename).name

    const pdf = pdfRepository.create({
      id: fileId,
      name: req.file.originalname,
      userId: req.user!.id,
    })

    await pdfRepository.save(pdf)

    // Process document in background
    processDocument(pdf.id, req.file.path).catch((err) => {
      console.error('Document processing error:', err)
    })

    res.json(pdf.toJSON())
  } catch (error) {
    console.error('Upload PDF error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get PDF details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const pdfRepository = AppDataSource.getRepository(Pdf)
    const pdf = await pdfRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
    })

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' })
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const filePath = path.join(uploadDir, `${pdf.id}.pdf`)

    res.json({
      pdf: pdf.toJSON(),
      downloadUrl: `/api/pdfs/${pdf.id}/download`,
    })
  } catch (error) {
    console.error('Get PDF error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Download PDF
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const pdfRepository = AppDataSource.getRepository(Pdf)
    const pdf = await pdfRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
    })

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' })
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const filePath = path.join(uploadDir, `${pdf.id}.pdf`)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' })
    }

    // Set proper headers for download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdf.name)}"`)
    res.download(filePath, pdf.name)
  } catch (error) {
    console.error('Download PDF error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete PDF
router.delete('/:id', authenticate, async (req, res) => {
  try {
    console.log('Delete request received for PDF ID:', req.params.id)
    console.log('User ID:', req.user?.id)

    const pdfRepository = AppDataSource.getRepository(Pdf)
    const pdf = await pdfRepository.findOne({
      where: { id: req.params.id, userId: req.user!.id },
      relations: ['conversations'],
    })

    console.log('PDF found:', pdf ? 'Yes' : 'No')

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' })
    }

    // Delete physical file
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const filePath = path.join(uploadDir, `${pdf.id}.pdf`)

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`Deleted file: ${filePath}`)
      } catch (fileError) {
        console.error('Error deleting file:', fileError)
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete related conversations and messages first (cascade)
    if (pdf.conversations && pdf.conversations.length > 0) {
      const conversationRepository = AppDataSource.getRepository(
        require('../entities').Conversation
      )
      const messageRepository = AppDataSource.getRepository(require('../entities').Message)

      for (const conversation of pdf.conversations) {
        // Delete messages first
        await messageRepository.delete({ conversationId: conversation.id })
        // Then delete conversation
        await conversationRepository.delete({ id: conversation.id })
      }
    }

    // Delete PDF record from database
    await pdfRepository.remove(pdf)

    res.json({ message: 'PDF deleted successfully' })
  } catch (error) {
    console.error('Delete PDF error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
