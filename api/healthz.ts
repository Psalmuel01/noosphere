import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const { handleRequest } = await import('../server/app');
    await handleRequest(req, res);
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
