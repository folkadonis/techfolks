import { MigrationInterface, QueryRunner } from "typeorm";
import * as fs from 'fs';
import * as path from 'path';

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Read and execute the schema.sql file
        const sqlPath = path.join(__dirname, '../schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by semicolon and execute each statement
        const statements = sql.split(';').filter(statement => statement.trim() !== '');
        
        for (const statement of statements) {
            await queryRunner.query(statement);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all tables in reverse order
        await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS rating_history CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS discussion_comments CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS discussions CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS user_follows CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS announcements CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS user_achievements CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS achievements CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS user_statistics CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS contest_standings CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS contest_participants CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS contest_problems CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS contests CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS submission_test_results CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS submissions CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS test_cases CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS problem_tags CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS tags CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS problems CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
        
        // Drop functions
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column CASCADE`);
        
        // Drop extensions
        await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
    }
}