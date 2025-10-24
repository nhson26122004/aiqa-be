import { AppDataSource } from '../config/database'
import { User } from '../entities'
import { loadUser } from '../middleware/auth'
import { Router } from 'express'
import bcrypt from 'bcryptjs'

const router = Router()

// Get current user
router.get('/user', loadUser, (req, res) => {
  if (req.user) {
    return res.json(req.user.toJSON())
  }
  res.json(null)
})

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const userRepository = AppDataSource.getRepository(User)

    // Check if user exists
    const existingUser = await userRepository.findOne({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = userRepository.create({
      email,
      password: hashedPassword,
    })

    await userRepository.save(user)

    // Set session
    const session = req.session as any
    session.userId = user.id

    res.json(user.toJSON())
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Sign in
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({ where: { email } })

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Incorrect password.' })
    }

    // Set session
    const session = req.session as any
    session.userId = user.id

    res.json(user.toJSON())
  } catch (error) {
    console.error('Signin error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Sign out
router.post('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' })
    }
    res.json({ message: 'Successfully logged out.' })
  })
})

export default router
