// Copy the SQL migration files into dist/ after tsc (tsc only emits .ts).
// Keeps `npm run db:migrate` working from compiled output in production.
import { cp, mkdir } from 'node:fs/promises';

const from = new URL('../src/db/migrations/', import.meta.url);
const to = new URL('../dist/db/migrations/', import.meta.url);

await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
console.log('Copied SQL migrations into dist/db/migrations/');
