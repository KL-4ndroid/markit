import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const tsconfig = JSON.parse(readFileSync(join(root, 'tsconfig.json'), 'utf8')) as {
  compilerOptions?: { noEmit?: boolean };
  include?: string[];
  exclude?: string[];
};

assert.equal(tsconfig.compilerOptions?.noEmit, true);
assert.ok(tsconfig.include?.includes('.next/types/**/*.ts'));
assert.ok(tsconfig.exclude?.includes('.next/dev'));
assert.ok(
  tsconfig.exclude?.includes('node_modules'),
  'dependency sources must remain outside application type checking',
);

console.log('PASS production typecheck ignores concurrent Next dev generated validators');
