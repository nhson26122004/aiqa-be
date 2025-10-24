import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { User } from '../entities'

declare module 'express-session' {
  interface SessionData {
    userId?: string
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  // Get userId from session
  const session = req.session as any
  const userId = session?.userId

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({ where: { id: userId } })

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const loadUser = async (req: Request, res: Response, next: NextFunction) => {
  const session = req.session as any
  if (session.userId) {
    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({ where: { id: session.userId } })
    if (user) req.user = user
  }
  next()
}
