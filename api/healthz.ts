import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from '../lib/config.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: true,
        service: 'noosphere',
        nodeEnv: env.NODE_ENV ?? 'development',
        databaseConfigured: Boolean(env.DATABASE_URL ?? env.POSTGRES_URL),
      }),
    );
  } catch (error) {
    console.error('Health API failed.', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Health API failed.',
      }),
    );
  }
}
