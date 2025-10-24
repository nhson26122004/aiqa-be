import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Conversation } from './Conversation'

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  role: string // 'user' | 'assistant' | 'system'

  @Column('text')
  content: string

  @Column()
  conversationId: string

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation

  @CreateDateColumn()
  createdAt: Date

  toJSON() {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
    }
  }
}
