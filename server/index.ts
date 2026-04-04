import { createServer } from 'node:http';
import { env } from '../lib/config.js';
import { handleRequest } from './app.js';

createServer((req, res) => {
  void handleRequest(req, res);
}).listen(env.PORT, () => {
  console.log(`Noosphere API listening on http://localhost:${env.PORT}`);
});
