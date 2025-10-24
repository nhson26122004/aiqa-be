import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { Pdf } from './Pdf'
import { Conversation } from './Conversation'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => Pdf, (pdf) => pdf.user)
  pdfs: Pdf[]

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[]

  toJSON() {
    return {
      id: this.id,
      email: this.email,
    }
  }
}
