import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '.env.local', override: false });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8787),
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
  VITE_WORLD_ID_RP_ID: z.string().optional(),
  VITE_WORLD_ID_ACTION: z.string().optional(),
  VITE_STORACHA_PROOF: z.string().optional(),
  VITE_STORACHA_SPACE_DID: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const dataDir = path.resolve(process.cwd(), 'data');
export const databasePath = path.join(dataDir, 'noosphere.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
