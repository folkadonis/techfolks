import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Problem } from './Problem.entity';

@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  problem_id: string;

  @ManyToOne(() => Problem, problem => problem.test_cases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ type: 'text' })
  input: string;

  @Column({ type: 'text' })
  expected_output: string;

  @Column({ type: 'boolean', default: false })
  is_sample: boolean;

  @Column({ type: 'integer', default: 0 })
  points: number;

  @CreateDateColumn()
  created_at: Date;
}