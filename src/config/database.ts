import { DataSource } from 'typeorm'
import { User, Pdf, Conversation, Message, Score } from '../entities'
import fs from 'fs'

const dbConfig = {
  type: 'postgres' as const,
  database: process.env.DATABASE_NAME || 'aiqa',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  synchronize: process.env.NODE_ENV === 'development',
  dropSchema: process.env.DROP_SCHEMA === 'true', // Add this to allow dropping schema when needed
  logging: false,
  entities: [User, Pdf, Conversation, Message, Score],
  migrations: [],
  subscribers: [],
  ssl: {
    ca: fs.readFileSync('ca.pem').toString(),
    rejectUnauthorized: true,
  },
}

export const AppDataSource = new DataSource(dbConfig)
