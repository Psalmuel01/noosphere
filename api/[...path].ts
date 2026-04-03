import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../server/app';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await handleRequest(req, res);
}
