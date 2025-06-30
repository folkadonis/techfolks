import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'techfolks',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, '../models/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../database/migrations/*{.ts,.js}')],
  subscribers: [],
});