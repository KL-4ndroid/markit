import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SALES_PHOTO_EVIDENCE_STATUSES } from '../lib/sales/photo-evidence-model';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const migrationSource = readProjectFile('supabase/migrations/055_add_sales_photo_evidence_schema.sql');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');

console.log('\n=== Supabase sales photo evidence schema ===');

runTest('055 migration adds only owner default and market-level requirement flags', () => {
  assert.match(migrationSource, /ALTER TABLE public\.user_settings[\s\S]*ADD COLUMN IF NOT EXISTS default_sales_photo_evidence_required BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(migrationSource, /ALTER TABLE public\.markets[\s\S]*ADD COLUMN IF NOT EXISTS sales_photo_evidence_required BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(migrationSource, /Does not mutate existing markets/);
  assert.match(migrationSource, /Applies to future sales only/);
});

runTest('creates metadata-only sale_photo_evidence table with approved columns', () => {
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.sale_photo_evidence/);

  for (const column of [
    'id UUID PRIMARY KEY DEFAULT uuid_generate_v4()',
    'owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE',
    'market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE',
    'sale_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE',
    'captured_by_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL',
    'status TEXT NOT NULL CHECK',
    'r2_object_key TEXT CHECK',
    'r2_thumbnail_key TEXT CHECK',
    'mime_type TEXT CHECK',
    'width INTEGER CHECK',
    'height INTEGER CHECK',
    'file_size_bytes INTEGER CHECK',
    'content_hash TEXT',
    'skipped_reason TEXT',
    'failure_reason TEXT',
    'sale_completed_at TIMESTAMPTZ NOT NULL',
    'captured_at TIMESTAMPTZ',
    'uploaded_at TIMESTAMPTZ',
    'expires_at TIMESTAMPTZ',
    'waived_by_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL',
    'waived_reason TEXT',
    'waived_at TIMESTAMPTZ',
    'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'deleted_at TIMESTAMPTZ',
  ]) {
    assert.match(migrationSource, new RegExp(column.replace(/[()]/g, '\\$&')));
  }
});

runTest('status constraint matches the TypeScript Slice 1 model', () => {
  for (const status of SALES_PHOTO_EVIDENCE_STATUSES) {
    assert.match(migrationSource, new RegExp(`'${status}'`));
  }

  assert.match(migrationSource, /status <> 'waived_by_owner'[\s\S]*waived_by_owner_id IS NOT NULL[\s\S]*length\(trim\(waived_reason\)\) > 0[\s\S]*waived_at IS NOT NULL/);
  assert.match(migrationSource, /status <> 'uploaded'[\s\S]*r2_object_key IS NOT NULL[\s\S]*r2_thumbnail_key IS NOT NULL[\s\S]*uploaded_at IS NOT NULL[\s\S]*expires_at IS NOT NULL/);
});

runTest('object metadata stores private R2 keys only', () => {
  assert.match(migrationSource, /r2_object_key LIKE 'sales-evidence\/7d\/%'/);
  assert.match(migrationSource, /r2_thumbnail_key LIKE 'sales-evidence-thumbs\/7d\/%'/);
  assert.match(migrationSource, /r2_object_key NOT LIKE '%\.\.%'/);
  assert.match(migrationSource, /r2_thumbnail_key NOT LIKE '%\/\/%'/);
  assert.match(migrationSource, /mime_type IS NULL OR mime_type IN \('image\/webp', 'image\/jpeg'\)/);
  assert.match(migrationSource, /Never store a public URL here/);
  assert.doesNotMatch(migrationSource, /\bBYTEA\b|base64|image_data|photo_blob|public_url/i);
});

runTest('indexes support owner market status album and one active row per sale', () => {
  assert.match(migrationSource, /CREATE UNIQUE INDEX IF NOT EXISTS idx_sale_photo_evidence_active_sale[\s\S]*ON public\.sale_photo_evidence\(sale_id\)[\s\S]*WHERE deleted_at IS NULL/);
  assert.match(migrationSource, /idx_sale_photo_evidence_owner_market_status[\s\S]*ON public\.sale_photo_evidence\(owner_id, market_id, status\)/);
  assert.match(migrationSource, /idx_sale_photo_evidence_owner_market_sale_completed[\s\S]*ON public\.sale_photo_evidence\(owner_id, market_id, sale_completed_at DESC\)/);
  assert.match(migrationSource, /idx_sale_photo_evidence_sale_id[\s\S]*ON public\.sale_photo_evidence\(sale_id\)/);
  assert.match(migrationSource, /idx_sale_photo_evidence_expires_at[\s\S]*ON public\.sale_photo_evidence\(expires_at\)/);
});

runTest('sale evidence rows must point to a deal_closed event in the same owner market', () => {
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.is_sale_photo_evidence_sale_event/);
  assert.match(migrationSource, /SECURITY DEFINER[\s\S]*SET search_path = public/);
  assert.match(migrationSource, /FROM public\.events e[\s\S]*JOIN public\.markets m[\s\S]*e\.id = p_sale_id[\s\S]*e\.market_id = p_market_id[\s\S]*e\.type = 'deal_closed'[\s\S]*m\.owner_id = p_owner_id/);
  assert.match(migrationSource, /REVOKE ALL ON FUNCTION public\.is_sale_photo_evidence_sale_event\(UUID, UUID, UUID\) FROM PUBLIC/);
  assert.match(migrationSource, /GRANT EXECUTE ON FUNCTION public\.is_sale_photo_evidence_sale_event\(UUID, UUID, UUID\) TO authenticated/);
  assert.match(migrationSource, /avoids exposing base events rows to staff clients/);
});

runTest('RLS allows owner review and staff scoped evidence work without staff waiver', () => {
  assert.match(migrationSource, /ALTER TABLE public\.sale_photo_evidence ENABLE ROW LEVEL SECURITY/);
  assert.match(migrationSource, /sale_photo_evidence_select_owner_or_own_staff/);
  assert.match(migrationSource, /owner_id = auth\.uid\(\)/);
  assert.match(migrationSource, /captured_by_staff_id = auth\.uid\(\)[\s\S]*sr\.staff_id = auth\.uid\(\)[\s\S]*sr\.status = 'active'/);

  assert.match(migrationSource, /sale_photo_evidence_insert_owner_or_active_staff/);
  assert.match(migrationSource, /WITH CHECK \(\s*public\.is_sale_photo_evidence_sale_event\(sale_id, market_id, owner_id\)/);
  assert.match(migrationSource, /m\.owner_id = sale_photo_evidence\.owner_id/);
  assert.match(migrationSource, /status IN \([\s\S]*'pending_capture'[\s\S]*'capture_skipped'[\s\S]*'captured_local'[\s\S]*'uploading'[\s\S]*'upload_failed'[\s\S]*\)/);
  assert.match(migrationSource, /waived_by_owner_id IS NULL[\s\S]*waived_reason IS NULL[\s\S]*waived_at IS NULL/);

  assert.match(migrationSource, /sale_photo_evidence_update_owner/);
  assert.match(migrationSource, /owner_id = auth\.uid\(\)[\s\S]*public\.is_sale_photo_evidence_sale_event\(sale_id, market_id, owner_id\)/);
  assert.match(migrationSource, /sale_photo_evidence_update_own_staff_capture/);
  assert.match(migrationSource, /WITH CHECK \([\s\S]*captured_by_staff_id = auth\.uid\(\)[\s\S]*public\.is_sale_photo_evidence_sale_event\(sale_id, market_id, owner_id\)[\s\S]*'uploaded'[\s\S]*waived_by_owner_id IS NULL[\s\S]*waived_reason IS NULL[\s\S]*waived_at IS NULL/);
});

runTest('authenticated users cannot hard-delete evidence metadata', () => {
  assert.match(migrationSource, /REVOKE ALL ON TABLE public\.sale_photo_evidence FROM anon/);
  assert.match(migrationSource, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.sale_photo_evidence TO authenticated/);
  assert.match(migrationSource, /REVOKE DELETE ON TABLE public\.sale_photo_evidence FROM authenticated/);
  assert.doesNotMatch(migrationSource, /FOR DELETE/i);
});

runTest('migration does not alter events or connect runtime behavior', () => {
  assert.doesNotMatch(migrationSource, /\bALTER TABLE public\.events\b/i);
  assert.doesNotMatch(migrationSource, /\bDROP CONSTRAINT IF EXISTS events_type_check\b/i);
  assert.doesNotMatch(migrationSource, /\bADD CONSTRAINT events_type_check\b/i);
  assert.doesNotMatch(migrationSource, /\bUPDATE\s+public\.events\b/i);
  assert.doesNotMatch(migrationSource, /\bDELETE\s+FROM\s+public\.events\b/i);
  assert.doesNotMatch(migrationSource, /\bCREATE\s+(OR\s+REPLACE\s+)?VIEW\b/i);
  assert.match(migrationSource, /Existing sales are not backfilled/);
});

runTest('plan records Slice 2 as schema-only and manually executed', () => {
  assert.match(planSource, /### Slice 2: Database and Metadata Schema/);
  assert.match(planSource, /Status:\s*\n\n- Drafted in `supabase\/migrations\/055_add_sales_photo_evidence_schema\.sql`/);
  assert.match(planSource, /055 has been manually executed/);
  assert.match(planSource, /does not alter `public\.events`/);
});

function main(): void {
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence schema tests failed`);
  }
}

main();
