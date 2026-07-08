import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('postgresql://mood_tracker:mood_tracker@localhost:5432/mood_tracker'),
  JWT_SECRET: z.string().min(16).default('development-secret-change-me'),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = EnvSchema.parse(process.env);
