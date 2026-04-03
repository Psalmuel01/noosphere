import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '.env.local', override: false });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().optional(),
  POSTGRES_URL: z.string().optional(),
  NOOSPHERE_ENABLE_DEMO_SEED: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  IMPULSE_INFERENCE_BASE_URL: z.string().optional(),
  IMPULSE_API_BASE_URL: z.string().optional(),
  IMPULSE_API_KEY: z.string().optional(),
  IMPULSE_DEPLOYMENT_ID: z.string().optional(),
  RP_SIGNING_KEY: z.string().optional(),
  WORLD_ID_VERIFY_BASE_URL: z.string().optional(),
  VITE_WORLD_ID_RP_ID: z.string().optional(),
  VITE_WORLD_ID_ACTION: z.string().optional(),
  VITE_STORACHA_PROOF: z.string().optional(),
  VITE_STORACHA_SPACE_DID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
