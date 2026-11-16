import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildTestPrgPreviewScope } from './lib/account-deletion-test-prg-preview';

assert.deepEqual(process.argv.slice(2), ['--prepare']);
const { sql, readbackSql, sqlSha, projectRef } = buildTestPrgPreviewScope();
const path = '.codex-artifacts/096_test_prg_preview_scope.sql';
const readbackPath = '.codex-artifacts/096_test_prg_preview_scope_readback.sql';
mkdirSync('.codex-artifacts', { recursive: true });
writeFileSync(path, sql);
writeFileSync(readbackPath, readbackSql);
console.log(JSON.stringify({ path, readbackPath, projectRef, sqlSha, applied: false }));
