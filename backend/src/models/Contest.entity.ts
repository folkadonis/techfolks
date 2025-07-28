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
import { ContestType, ContestStatus } from '../types/enums';


@Entity('contests')
export class Contest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ unique: true, length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    name: 'contest_type',
    type: 'enum',
    enum: ContestType,
  })
  contest_type: ContestType;

  @Column({ name: 'start_time', type: 'timestamptz' })
  start_time: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  end_time: Date;

  @Column({ default: 0 })
  freeze_time: number; // minutes before end to freeze scoreboard

  @Column({ name: 'is_public', default: true })
  is_public: boolean;

  @Column({ name: 'registration_open', default: true })
  registration_open: boolean;

  @Column({ default: 0 })
  duration: number; // in minutes

  @Column({
    type: 'enum',
    enum: ContestStatus,
    default: ContestStatus.UPCOMING
  })
  status: ContestStatus;

  @Column({ name: 'created_by' })
  created_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relations
  // @ManyToMany(() => Problem)
  // @JoinTable({
  //   name: 'contest_problems',
  //   joinColumn: { name: 'contest_id' },
  //   inverseJoinColumn: { name: 'problem_id' }
  // })
  // problems: Problem[];

  // @ManyToMany(() => User)
  // @JoinTable({
  //   name: 'contest_participants',
  //   joinColumn: { name: 'contest_id' },
  //   inverseJoinColumn: { name: 'user_id' }
  // })
  // participants: User[];

  // @OneToMany(() => ContestStanding, standing => standing.contest)
  // standings: ContestStanding[];
}