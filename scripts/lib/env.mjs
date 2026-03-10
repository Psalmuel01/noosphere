import fs from 'node:fs';
import path from 'node:path';

export function readLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const result = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    if (index === -1) {
      continue;
    }

    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    result[key] = value;
  }

  return result;
}

export function getEnv(name) {
  return process.env[name] ?? readLocalEnv()[name];
}
