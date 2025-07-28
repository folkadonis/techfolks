import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './User.entity';
import { Problem } from './Problem.entity';
import { Contest } from './Contest.entity';

import { SubmissionVerdict } from '../types/enums';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'problem_id' })
  problem_id: string;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ name: 'contest_id', nullable: true })
  contest_id: string;

  @ManyToOne(() => Contest, { nullable: true })
  @JoinColumn({ name: 'contest_id' })
  contest: Contest;

  @Column({ length: 50 })
  language: string;

  @Column({ name: 'source_code', type: 'text' })
  source_code: string;

  @Column({
    type: 'enum',
    enum: SubmissionVerdict,
    default: SubmissionVerdict.PENDING,
  })
  verdict: SubmissionVerdict;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ name: 'time_used', nullable: true })
  time_used: number; // in milliseconds

  @Column({ name: 'memory_used', nullable: true })
  memory_used: number; // in MB

  @Column({ name: 'error_message', type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  // Relations
  // @OneToMany(() => SubmissionTestResult, result => result.submission)
  // testResults: SubmissionTestResult[];
}