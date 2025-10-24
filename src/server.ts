require('dotenv').config()
import 'reflect-metadata'
import './types'
import express from 'express'
import cors from 'cors'
import { RedisStore } from 'connect-redis'
import helmet from 'helmet'
import morgan from 'morgan'
import { AppDataSource } from './config/database'
import redisClient from './config/redis'
import routes from './routes'
import { errorHandler } from './middleware/errorHandler'
const session = require('express-session')

const app = express()
const PORT = process.env.PORT || 8000

// Middleware
app.use(helmet())
app.use(morgan('dev'))
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Session configuration
const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient as any }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
})

app.use(sessionMiddleware as unknown as express.RequestHandler)

// Routes
app.use('/api', routes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Error handler
app.use(errorHandler)

// Initialize database and start server
const startServer = async () => {
  try {
    await AppDataSource.initialize()
    console.log('✅ Database connected')

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
    })
  } catch (error) {
    console.error('❌ Error starting server:', error)
    process.exit(1)
  }
}

startServer()

export default app
