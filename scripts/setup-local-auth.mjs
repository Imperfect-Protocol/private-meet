import { readFile } from 'node:fs/promises';
import { generateKeyPairSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/convex/bin/main.js', import.meta.url));
const envText = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
const entries = Object.fromEntries(envText.split('\n').filter((line) => /^[A-Z_]+=/.test(line)).map((line) => {
  const separator = line.indexOf('=');
  return [line.slice(0, separator), line.slice(separator + 1).trim()];
}));
if (!entries.CONVEX_DEPLOYMENT?.startsWith('anonymous:') || !entries.VITE_CONVEX_SITE_URL?.startsWith('http://127.0.0.1:')) {
  throw new Error('This command only configures an anonymous local backend. Use the official Convex Auth setup for cloud deployments.');
}

function convex(args, input) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    input,
    encoding: 'utf8',
    env: { ...process.env, CONVEX_DEPLOYMENT: entries.CONVEX_DEPLOYMENT },
  });
  if (result.status !== 0) throw new Error(`Convex command failed: ${args.slice(0, 3).join(' ')}. Start the local backend first with npm run dev:convex.`);
  return result.stdout;
}

// Capture existing key only to check presence; never print or copy it.
const existingKey = convex(['env', 'get', 'JWT_PRIVATE_KEY']).trim();
if (!existingKey) {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim().replace(/\n/g, ' ');
  const jwks = JSON.stringify({ keys: [{ use: 'sig', ...keys.publicKey.export({ format: 'jwk' }) }] });
  convex(['env', 'set', 'JWT_PRIVATE_KEY'], privateKey);
  convex(['env', 'set', 'JWKS'], jwks);
}
convex(['env', 'set', 'SITE_URL'], process.env.PRIVATE_MEET_SITE_URL ?? 'http://127.0.0.1:5173');
console.log('Local Convex Auth is configured. Password signup and sign-in are ready.');
