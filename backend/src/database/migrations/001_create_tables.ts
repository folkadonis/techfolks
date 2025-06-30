import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTables1700000000000 implements MigrationInterface {
  name = 'CreateTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "user_role" AS ENUM ('user', 'admin', 'problem_setter', 'moderator');
      CREATE TYPE "problem_difficulty" AS ENUM ('easy', 'medium', 'hard');
      CREATE TYPE "submission_verdict" AS ENUM ('pending', 'processing', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'presentation_error', 'internal_error');
      CREATE TYPE "contest_type" AS ENUM ('ACM_ICPC', 'IOI', 'AtCoder', 'CodeForces');
      CREATE TYPE "contest_status" AS ENUM ('upcoming', 'running', 'ended');
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(50) UNIQUE NOT NULL,
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "full_name" VARCHAR(255),
        "avatar_url" VARCHAR(500),
        "bio" TEXT,
        "country" VARCHAR(100),
        "institution" VARCHAR(255),
        "github_username" VARCHAR(100),
        "linkedin_url" VARCHAR(500),
        "website_url" VARCHAR(500),
        "rating" INTEGER DEFAULT 1200,
        "max_rating" INTEGER DEFAULT 1200,
        "role" user_role DEFAULT 'user',
        "is_active" BOOLEAN DEFAULT true,
        "is_verified" BOOLEAN DEFAULT false,
        "verification_token" VARCHAR(255),
        "reset_password_token" VARCHAR(255),
        "reset_password_expires" TIMESTAMP,
        "last_login" TIMESTAMP,
        "problems_solved" INTEGER DEFAULT 0,
        "contests_participated" INTEGER DEFAULT 0,
        "contribution_points" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create problems table
    await queryRunner.query(`
      CREATE TABLE "problems" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(255) UNIQUE NOT NULL,
        "statement" TEXT NOT NULL,
        "input_format" TEXT,
        "output_format" TEXT,
        "constraints" TEXT,
        "difficulty" problem_difficulty NOT NULL,
        "time_limit" INTEGER DEFAULT 1000,
        "memory_limit" INTEGER DEFAULT 256,
        "author_id" INTEGER REFERENCES "users"("id"),
        "is_public" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create contests table
    await queryRunner.query(`
      CREATE TABLE "contests" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(255) UNIQUE NOT NULL,
        "description" TEXT,
        "contest_type" contest_type NOT NULL,
        "start_time" TIMESTAMPTZ NOT NULL,
        "end_time" TIMESTAMPTZ NOT NULL,
        "freeze_time" INTEGER DEFAULT 0,
        "is_public" BOOLEAN DEFAULT true,
        "registration_open" BOOLEAN DEFAULT true,
        "duration" INTEGER NOT NULL,
        "status" contest_status DEFAULT 'upcoming',
        "created_by" INTEGER REFERENCES "users"("id"),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create submissions table
    await queryRunner.query(`
      CREATE TABLE "submissions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "problem_id" INTEGER NOT NULL REFERENCES "problems"("id"),
        "contest_id" INTEGER REFERENCES "contests"("id"),
        "language" VARCHAR(50) NOT NULL,
        "source_code" TEXT NOT NULL,
        "verdict" submission_verdict DEFAULT 'pending',
        "score" DECIMAL(5,2) DEFAULT 0,
        "time_used" INTEGER,
        "memory_used" INTEGER,
        "error_message" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create test_cases table
    await queryRunner.query(`
      CREATE TABLE "test_cases" (
        "id" SERIAL PRIMARY KEY,
        "problem_id" INTEGER NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE,
        "input" TEXT NOT NULL,
        "expected_output" TEXT NOT NULL,
        "is_sample" BOOLEAN DEFAULT false,
        "points" INTEGER DEFAULT 10,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create contest_problems table
    await queryRunner.query(`
      CREATE TABLE "contest_problems" (
        "contest_id" INTEGER NOT NULL REFERENCES "contests"("id") ON DELETE CASCADE,
        "problem_id" INTEGER NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE,
        "points" INTEGER DEFAULT 100,
        "order" INTEGER NOT NULL,
        PRIMARY KEY ("contest_id", "problem_id")
      );
    `);

    // Create contest_participants table
    await queryRunner.query(`
      CREATE TABLE "contest_participants" (
        "contest_id" INTEGER NOT NULL REFERENCES "contests"("id") ON DELETE CASCADE,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "registered_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("contest_id", "user_id")
      );
    `);

    // Create contest_standings table
    await queryRunner.query(`
      CREATE TABLE "contest_standings" (
        "contest_id" INTEGER NOT NULL REFERENCES "contests"("id") ON DELETE CASCADE,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "score" INTEGER DEFAULT 0,
        "penalty" INTEGER DEFAULT 0,
        "last_submission" TIMESTAMP,
        PRIMARY KEY ("contest_id", "user_id")
      );
    `);

    // Create user_follows table
    await queryRunner.query(`
      CREATE TABLE "user_follows" (
        "follower_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "following_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("follower_id", "following_id"),
        CHECK ("follower_id" != "following_id")
      );
    `);

    // Create achievements table
    await queryRunner.query(`
      CREATE TABLE "achievements" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "icon_url" VARCHAR(500),
        "category" VARCHAR(50),
        "points" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create user_achievements table
    await queryRunner.query(`
      CREATE TABLE "user_achievements" (
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "achievement_id" INTEGER NOT NULL REFERENCES "achievements"("id") ON DELETE CASCADE,
        "earned_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("user_id", "achievement_id")
      );
    `);

    // Create problem_tags table
    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(50) UNIQUE NOT NULL,
        "description" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create problem_tags junction table
    await queryRunner.query(`
      CREATE TABLE "problem_tags" (
        "problem_id" INTEGER NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE,
        "tag_id" INTEGER NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
        PRIMARY KEY ("problem_id", "tag_id")
      );
    `);

    // Create discussions table
    await queryRunner.query(`
      CREATE TABLE "discussions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "problem_id" INTEGER REFERENCES "problems"("id"),
        "contest_id" INTEGER REFERENCES "contests"("id"),
        "parent_id" INTEGER REFERENCES "discussions"("id"),
        "title" VARCHAR(255),
        "content" TEXT NOT NULL,
        "upvotes" INTEGER DEFAULT 0,
        "is_pinned" BOOLEAN DEFAULT false,
        "is_announcement" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create discussion_votes table
    await queryRunner.query(`
      CREATE TABLE "discussion_votes" (
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "discussion_id" INTEGER NOT NULL REFERENCES "discussions"("id") ON DELETE CASCADE,
        "vote" SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
        PRIMARY KEY ("user_id", "discussion_id")
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_users_username" ON "users"("username");
      CREATE INDEX "idx_users_email" ON "users"("email");
      CREATE INDEX "idx_users_rating" ON "users"("rating");
      CREATE INDEX "idx_problems_slug" ON "problems"("slug");
      CREATE INDEX "idx_problems_difficulty" ON "problems"("difficulty");
      CREATE INDEX "idx_problems_author" ON "problems"("author_id");
      CREATE INDEX "idx_submissions_user" ON "submissions"("user_id");
      CREATE INDEX "idx_submissions_problem" ON "submissions"("problem_id");
      CREATE INDEX "idx_submissions_contest" ON "submissions"("contest_id");
      CREATE INDEX "idx_submissions_verdict" ON "submissions"("verdict");
      CREATE INDEX "idx_submissions_created" ON "submissions"("created_at");
      CREATE INDEX "idx_contests_slug" ON "contests"("slug");
      CREATE INDEX "idx_contests_status" ON "contests"("status");
      CREATE INDEX "idx_contests_start" ON "contests"("start_time");
      CREATE INDEX "idx_discussions_problem" ON "discussions"("problem_id");
      CREATE INDEX "idx_discussions_contest" ON "discussions"("contest_id");
      CREATE INDEX "idx_discussions_user" ON "discussions"("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "discussion_votes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "discussions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "problem_tags" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tags" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_achievements" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "achievements" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_follows" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contest_standings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contest_participants" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contest_problems" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "test_cases" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "submissions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "problems" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "contest_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contest_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "submission_verdict"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "problem_difficulty"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role"`);
  }
}