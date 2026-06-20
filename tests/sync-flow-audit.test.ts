import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const useSyncPath = join(projectRoot, 'hooks/useSync.ts');
const syncDir = join(projectRoot, 'lib/sync');

function readSource(path: string): string {
  return readFileSync(path, 'utf-8');
}

function readSyncSources(): string {
  const paths = [useSyncPath];

  if (existsSync(syncDir)) {
    for (const entry of readdirSync(syncDir)) {
      if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        paths.push(join(syncDir, entry));
      }
    }
  }

  return paths.map(path => `\n/* ${path} */\n${readSource(path)}`).join('\n');
}

function findFunctionBody(source: string, functionName: string): string {
  const match = new RegExp(`(?:export\\s+)?async\\s+function\\s+${functionName}\\s*\\(`).exec(source)
    ?? new RegExp(`(?:export\\s+)?function\\s+${functionName}\\s*\\(`).exec(source);

  assert.ok(match, `Expected to find function ${functionName}`);

  const openBrace = source.indexOf('{', match.index);
  assert.ok(openBrace >= 0, `Expected ${functionName} to have a function body`);

  let depth = 0;
  for (let index = openBrace; index < source.length; index++) {
    const char = source[index];
    if (char === '{') depth++;
    if (char === '}') depth--;
    if (depth === 0) {
      return source.slice(openBrace, index + 1);
    }
  }

  throw new Error(`Could not parse function body for ${functionName}`);
}

function assertBefore(source: string, earlier: string, later: string): void {
  const earlierIndex = source.indexOf(earlier);
  const laterIndex = source.indexOf(later);
  assert.ok(earlierIndex >= 0, `Expected to find ${earlier}`);
  assert.ok(laterIndex >= 0, `Expected to find ${later}`);
  assert.ok(earlierIndex < laterIndex, `Expected ${earlier} to appear before ${later}`);
}

const hookSource = readSource(useSyncPath);
const syncSources = readSyncSources();

runTest('useSync keeps push before pull in the main sync cycle', () => {
  assert.match(hookSource, /import \{ pushEvents \} from ['"]@\/lib\/sync\/sync-push-service['"]/);
  assert.doesNotMatch(hookSource, /from ['"]@\/lib\/sync\/event-sync-service['"]/);
  assertBefore(hookSource, 'await pushEvents(user.id', 'await pullAllEvents(user.id');
  assert.match(hookSource, /\.where\(['"]sync_status['"]\)[\s\S]*\.anyOf\(\[['"]pending['"],\s*['"]local_only['"]\]\)/);
});

runTest('sync count service preserves local and cloud count contracts', () => {
  const localBody = findFunctionBody(syncSources, 'getLocalPendingCount');
  const cloudBody = findFunctionBody(syncSources, 'getCloudEventCount');

  assert.match(hookSource, /export \{ getLocalPendingCount,\s*getCloudEventCount \} from ['"]@\/lib\/sync\/sync-count-service['"]/);
  assert.match(localBody, /\.where\(['"]sync_status['"]\)[\s\S]*\.anyOf\(\[['"]pending['"],\s*['"]local_only['"]\]\)[\s\S]*\.count\(\)/);
  assert.match(localBody, /catch\s*\{[\s\S]*return 0/);
  assert.match(cloudBody, /\.from\(['"]market_members['"]\)[\s\S]*\.select\(['"]market_id['"]\)[\s\S]*\.eq\(['"]user_id['"],\s*userId\)/);
  assert.match(cloudBody, /\.from\(['"]events['"]\)[\s\S]*\.select\(['"]id['"],\s*\{\s*count:\s*['"]exact['"],\s*head:\s*true\s*\}\)/);
  assert.ok(cloudBody.includes("query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.eq.${userId},market_id.is.null)`);"));
  assert.match(cloudBody, /query\.eq\(['"]actor_id['"],\s*userId\)\.is\(['"]market_id['"],\s*null\)/);
  assert.match(cloudBody, /const \{ count \}\s*=\s*await query/);
  assert.match(cloudBody, /return count \|\| 0/);
});

runTest('pushEvents only uploads current-user or local events and blocks actor mismatches', () => {
  const body = findFunctionBody(syncSources, 'pushEvents');

  assert.match(body, /\.where\(['"]sync_status['"]\)[\s\S]*\.anyOf\(\[['"]pending['"],\s*['"]local_only['"]\]\)/);
  assert.match(body, /event\.actor_id\s*===\s*userId[\s\S]*validEvents\.push\(event\)/);
  assert.match(body, /event\.actor_id\s*===\s*['"]local['"][\s\S]*await bindEventActor\(event\.id!,\s*userId\)/);
  assert.match(body, /event\.actor_id\s*=\s*userId[\s\S]*validEvents\.push\(event\)/);
  assert.match(body, /invalidEvents\.push\(event\)/);
  assert.match(body, /await markEventBlocked\(event\.id!,\s*['"]actor_id_mismatch['"],\s*event\.actor_id\)/);
});

runTest('pushEvents is idempotent and downgrades unpushable writes to local-only', () => {
  const body = findFunctionBody(syncSources, 'pushEvents');

  assert.match(body, /\.from\(['"]events['"]\)[\s\S]*\.select\(['"]id,\s*sync_status['"]\)[\s\S]*\.eq\(['"]id['"],\s*event\.id\)[\s\S]*\.maybeSingle\(\)/);
  assert.match(body, /if\s*\(existing\)\s*\{[\s\S]*await markEventSynced\(event\.id!\)/);
  assert.match(body, /insertError\.code\s*===\s*['"]23505['"][\s\S]*await markEventSynced\(event\.id!\)/);
  assert.match(body, /insertError\.code\s*===\s*['"]23503['"][\s\S]*events_market_id_fkey[\s\S]*await markEventLocalOnly\(event\.id!\)/);
  assert.match(body, /insertError\.code\s*===\s*['"]42501['"][\s\S]*event\.type\s*===\s*['"]market_created['"][\s\S]*ensureMarketMember\(userId,\s*cloudEvent\.market_id\)/);
  assert.match(body, /insertError\.code\s*===\s*['"]PGRST301['"][\s\S]*insertError\.code\s*===\s*['"]42501['"][\s\S]*policy[\s\S]*await markEventLocalOnly\(event\.id!\)/);
});

runTest('pushEvents market member helper preserves owner membership insert contract', () => {
  const body = findFunctionBody(syncSources, 'ensureMarketMember');

  assert.match(body, /if\s*\(checkError\)\s*\{[\s\S]*return false/);
  assert.match(body, /market_id:\s*marketId/);
  assert.match(body, /user_id:\s*userId/);
  assert.match(body, /role:\s*['"]owner['"]/);
  assert.match(body, /joined_at:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(body, /insertError\.code\s*===\s*['"]23505['"][\s\S]*return true/);
  assert.match(body, /insertError\.code\s*===\s*['"]23503['"][\s\S]*return false/);
});

runTest('pushEvents profile helper preserves profile creation contract', () => {
  const body = findFunctionBody(syncSources, 'ensureUserProfile');

  assert.match(body, /\.from\(['"]profiles['"]\)[\s\S]*\.select\(['"]id['"]\)[\s\S]*\.eq\(['"]id['"],\s*userId\)[\s\S]*\.single\(\)/);
  assert.match(body, /checkError\.code\s*!==\s*['"]PGRST116['"][\s\S]*throw checkError/);
  assert.match(body, /supabase\.auth\.getUser\(\)/);
  assert.match(body, /id:\s*userId/);
  assert.match(body, /email:\s*userData\.user\.email\s*\|\|\s*`\$\{userId\}@local\.app`/);
  assert.match(body, /created_at:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(body, /updated_at:\s*new Date\(\)\.toISOString\(\)/);
  assert.match(body, /insertError\.code\s*===\s*['"]23505['"][\s\S]*return/);
});

runTest('pullAllEvents sends staff sessions to view pull and refuses owner fallback', () => {
  const body = findFunctionBody(syncSources, 'pullAllEvents');

  assert.match(body, /if\s*\(infoLevel\s*<\s*3\)\s*\{/);
  assert.match(body, /await pullEventsFromViews\(userId,\s*onProgress,\s*infoLevel\)/);
  assert.match(body, /throw error/);
  assertBefore(body, 'if (infoLevel < 3)', 'const lastSyncAt = await getLastSyncTimestamp()');
});

runTest('owner pull uses created_at cursor and owner projection reconciliation', () => {
  const body = findFunctionBody(syncSources, 'pullAllEvents');

  assert.match(body, /const lastSyncAt\s*=\s*await getLastSyncTimestamp\(\)/);
  assert.match(body, /\.gt\(['"]created_at['"],\s*new Date\(lastSyncAt\)\.toISOString\(\)\)/);
  assert.match(body, /\.map\(e\s*=>\s*new Date\(e\.created_at\)\.getTime\(\)\)/);
  assert.match(body, /await updateLastSyncTimestamp\(Math\.max\(\.\.\.validCreatedAt\)\)/);
  assert.match(body, /await reconcileSyncedProjectionMarkets\(touchedMarketIds,\s*['"]owner-full['"]\)/);
});

runTest('owner market access helper includes member and owner-owned markets', () => {
  const body = findFunctionBody(syncSources, 'getOwnerAccessibleMarketIds');

  assert.match(body, /supabase\.from\(['"]market_members['"]\)\.select\(['"]market_id['"]\)\.eq\(['"]user_id['"],\s*userId\)/);
  assert.match(body, /supabase\.from\(['"]markets['"]\)\.select\(['"]id['"]\)\.eq\(['"]owner_id['"],\s*userId\)/);
  assert.match(body, /if\s*\(memberError\)\s*throw memberError/);
  assert.match(body, /if\s*\(ownedError\)\s*throw ownedError/);
  assert.match(body, /Array\.from\(new Set\(\[\.\.\.memberIds,\s*\.\.\.ownedIds\]\)\)/);
});

runTest('owner market hydration preserves local-first fetch and sanitized cache writes', () => {
  const body = findFunctionBody(syncSources, 'batchHydrateMarkets');
  const gateBody = findFunctionBody(syncSources, 'marketGateForLevel');

  assert.match(body, /const exists\s*=\s*await db\.markets\.get\(marketId\)/);
  assert.match(body, /notYetLocal\.push\(marketId\)/);
  assert.match(body, /hydrated\.add\(marketId\)/);
  assert.match(body, /\.from\(['"]markets['"]\)[\s\S]*\.select\(['"]\*['"]\)[\s\S]*\.in\(['"]id['"],\s*notYetLocal\)/);
  assert.match(body, /if\s*\(error\)\s*\{[\s\S]*for\s*\(const id of notYetLocal\)\s*failed\.add\(id\)[\s\S]*return \{ hydrated, missing, failed \}/);
  assert.match(body, /marketRowToLocal\(market\)/);
  assert.match(body, /marketGateForLevel\(infoLevel\)\.sanitizeMarketProjection/);
  assert.match(body, /resetMarketProjectionFields\(/);
  assert.match(body, /await db\.markets\.put\(reset as unknown as typeof localMarket\)/);
  assert.match(body, /if\s*\(!foundIds\.has\(id\)\)\s*missing\.add\(id\)/);
  assert.match(gateBody, /createPermissionGate\(\{\s*infoLevel,\s*entity:\s*['"]market['"]\s*\}\)/);
});

runTest('staff pull reads authorized views as a full pull without lastSyncAt filtering', () => {
  const body = findFunctionBody(syncSources, 'pullEventsFromViews');

  assert.match(body, /\.from\(['"]staff_accessible_markets['"]\)[\s\S]*\.select\(['"]\*['"]\)/);
  assert.match(body, /\.from\(['"]staff_accessible_products['"]\)[\s\S]*\.select\(['"]\*['"]\)/);
  assert.match(body, /\.from\(['"]staff_accessible_events['"]\)[\s\S]*\.select\(['"]\*['"]\)[\s\S]*\.order\(['"]timestamp['"],\s*\{\s*ascending:\s*true\s*\}\)/);
  assert.doesNotMatch(body, /getLastSyncTimestamp\(\)/);
  assert.doesNotMatch(body, /\.gt\(['"]created_at['"]/);
  assert.match(body, /await syncMarketsToIndexedDB\(marketsData\s*\|\|\s*\[\],\s*userId,\s*infoLevel\)/);
  assert.match(body, /await syncProductsToIndexedDB\(productsData\s*\|\|\s*\[\],\s*userId,\s*infoLevel\)/);
  assert.match(body, /await syncEventsToIndexedDB\(eventsData\s*\|\|\s*\[\],\s*infoLevel\)/);
  assert.match(body, /await reconcileSyncedProjectionMarkets\(touchedMarketIds,\s*infoLevel\s*<\s*3\s*\?\s*['"]staff-view['"]\s*:\s*['"]owner-full['"]\)/);
});

runTest('staff cache writers sanitize data before writing to IndexedDB', () => {
  const marketsBody = findFunctionBody(syncSources, 'syncMarketsToIndexedDB');
  const productsBody = findFunctionBody(syncSources, 'syncProductsToIndexedDB');
  const eventsBody = findFunctionBody(syncSources, 'syncEventsToIndexedDB');

  assert.match(marketsBody, /sanitizeWithLevel\(market,\s*['"]market['"],\s*infoLevel\)/);
  assert.match(marketsBody, /resetMarketProjectionFields\(mappedMarket as Market\)/);
  assert.match(productsBody, /sanitizeWithLevel\(product,\s*['"]product['"],\s*infoLevel\)/);
  assert.match(productsBody, /totalSold:\s*0/);
  assert.match(eventsBody, /sanitizeEventsWithLevel\(events,\s*infoLevel\)/);
  assert.match(eventsBody, /preflightStaffEventImport\(localEvent/);
  assert.match(eventsBody, /await sanitizeStaffProjectionsAfterReplay\(localEvent,\s*infoLevel\)/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sync flow audit tests failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
