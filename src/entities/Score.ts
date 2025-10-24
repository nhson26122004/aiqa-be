import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Conversation } from './Conversation'

@Entity('scores')
export class Score {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('float')
  score: number

  @Column()
  conversationId: string

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation

  @CreateDateColumn()
  createdAt: Date

  toJSON() {
    return {
      id: this.id,
      score: this.score,
      conversationId: this.conversationId,
      createdAt: this.createdAt,
    }
  }
}
