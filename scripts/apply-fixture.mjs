#!/usr/bin/env node
// Copies fixtures/ (a sample .scribe.yml + sample content) into the repo
// root so `npm run build`/`npm run dev` can be exercised locally without a
// real customer repo. Never run as part of the real deploy — provisioning
// (7.4) pushes this package's files verbatim and writes its own
// customer-specific .scribe.yml, never fixtures/.
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const FIXTURES = resolve(ROOT, 'fixtures');

if (!existsSync(FIXTURES)) {
  throw new Error(`No fixtures/ directory at ${FIXTURES}`);
}

cpSync(resolve(FIXTURES, 'scribe.yml'), resolve(ROOT, '.scribe.yml'));
cpSync(resolve(FIXTURES, 'content'), resolve(ROOT, 'content'), { recursive: true });

console.log('[apply-fixture] copied fixtures/scribe.yml -> .scribe.yml and fixtures/content -> content/');
