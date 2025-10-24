import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'

const uploadDir = process.env.UPLOAD_DIR || './uploads'

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const fileId = crypto.randomUUID()
    const ext = path.extname(file.originalname)
    cb(null, `${fileId}${ext}`)
  },
})

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ['application/pdf']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only PDF files are allowed'), false)
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
})
