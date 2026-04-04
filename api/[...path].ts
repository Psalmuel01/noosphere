import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../server/app.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await handleRequest(req, res);
  } catch (error) {
    console.error('Vercel API bootstrap failed.', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Function initialization failed.',
      }),
    );
  }
}
