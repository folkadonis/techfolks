import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from './User.entity';
import { TestCase } from './TestCase.entity';

export enum ProblemDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Entity('problems')
export class Problem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ unique: true, length: 255 })
  slug: string;

  @Column({ type: 'text' })
  statement: string;

  @Column({ name: 'input_format', type: 'text', nullable: true })
  input_format: string;

  @Column({ name: 'output_format', type: 'text', nullable: true })
  output_format: string;

  @Column({ type: 'text', nullable: true })
  constraints: string;

  @Column({
    type: 'enum',
    enum: ProblemDifficulty,
    nullable: true,
  })
  difficulty: ProblemDifficulty;

  @Column({ name: 'time_limit', default: 1000 })
  time_limit: number; // in milliseconds

  @Column({ name: 'memory_limit', default: 256 })
  memory_limit: number; // in MB

  @Column({ name: 'author_id', nullable: true })
  author_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'is_public', default: false })
  is_public: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relations
  @OneToMany(() => TestCase, testCase => testCase.problem, { cascade: true })
  test_cases: TestCase[];

  // @OneToMany(() => Submission, submission => submission.problem)
  // submissions: Submission[];

  // @ManyToMany(() => Tag)
  // @JoinTable({
  //   name: 'problem_tags',
  //   joinColumn: { name: 'problem_id' },
  //   inverseJoinColumn: { name: 'tag_id' }
  // })
  // tags: Tag[];
}