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

app.set('trust proxy', 1)

app.use(helmet())
app.use(morgan('dev'))
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient as any }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 1000 * 60 * 60 * 24, // 1 ngày
  },
})

app.use(sessionMiddleware as unknown as express.RequestHandler)

app.use('/api', routes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use(errorHandler)

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
