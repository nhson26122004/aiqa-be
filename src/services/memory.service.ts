import { AppDataSource } from '../config/database'
import { Message } from '../entities'
import { ChatArgs } from './chat.service'

export type HistoryEntry = { role: 'system' | 'user' | 'assistant'; content: string }

export const buildMemory = async (args: ChatArgs): Promise<HistoryEntry[]> => {
  const messageRepository = AppDataSource.getRepository(Message)

  // Load existing messages from database
  const messages = await messageRepository.find({
    where: { conversationId: args.conversationId },
    order: { createdAt: 'ASC' },
  })

  const history: HistoryEntry[] = messages.map((m) => ({
    role: (m.role as any) || 'user',
    content: m.content,
  }))

  return history
}
