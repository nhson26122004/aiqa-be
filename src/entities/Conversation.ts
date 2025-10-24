import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { User } from './User'
import { Pdf } from './Pdf'
import { Message } from './Message'

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  retriever?: string

  @Column({ nullable: true })
  memory?: string

  @Column({ nullable: true })
  llm?: string

  @Column({ nullable: true })
  pdfId?: string

  @ManyToOne(() => Pdf, (pdf) => pdf.conversations, { nullable: true })
  @JoinColumn({ name: 'pdfId' })
  pdf?: Pdf

  @Column()
  userId: string

  @ManyToOne(() => User, (user) => user.conversations)
  @JoinColumn({ name: 'userId' })
  user: User

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  toJSON() {
    return {
      id: this.id,
      pdfId: this.pdfId,
      messages: this.messages ? this.messages.map((m) => m.toJSON()) : [],
    }
  }
}
