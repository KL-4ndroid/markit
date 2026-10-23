import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase/client';
import { detectAnonymousData, executeMigration, MigrationOption } from '../lib/supabase/migration';

async function main() {
  const getUser = supabase.auth.getUser;
  try {
    await db.markets.bulkPut([
      { id: 'other-owner', owner_id: 'another-person', sync_status: 'synced' },
      { id: 'cloud-legacy', owner_id: 'local', sync_status: 'synced' },
      { id: 'mine', owner_id: 'current', sync_status: 'synced' },
    ] as any);
    await db.events.bulkPut([
      { id: 'staff-sale', actor_id: 'staff', market_id: 'mine', type: 'deal_closed', timestamp: 1, payload: {}, sync_status: 'synced' },
      { id: 'cloud-legacy-event', actor_id: 'local', type: 'deal_closed', timestamp: 1, payload: {}, sync_status: 'synced' },
      { id: 'other-user-offline', actor_id: 'another-person', type: 'deal_closed', timestamp: 1, payload: {}, sync_status: 'pending' },
    ] as any);
    assert.deepEqual(await detectAnonymousData('current'), { hasAnonymousData: false, marketCount: 0, eventCount: 0 }, 'restored team/legacy/other-user records are not anonymous work');
    await db.markets.put({ id: 'anonymous', owner_id: 'local', sync_status: 'local_only' } as any);
    await db.events.put({ id: 'anonymous-event', actor_id: 'local', type: 'field_note_created', payload: {}, timestamp: 1, sync_status: 'local_only' } as any);
    assert.deepEqual(await detectAnonymousData('current'), { hasAnonymousData: true, marketCount: 1, eventCount: 1 });
    (supabase.auth as any).getUser = async () => ({ data: { user: null } });
    await executeMigration(MigrationOption.SYNC, 'current');
    assert.equal((await db.markets.get('anonymous'))?.owner_id, 'current');
    assert.equal((await db.events.get('anonymous-event'))?.actor_id, 'current');
    assert.equal((await db.markets.get('other-owner'))?.owner_id, 'another-person');
    assert.equal((await db.markets.get('cloud-legacy'))?.owner_id, 'local');
    assert.equal((await db.events.get('staff-sale'))?.actor_id, 'staff');
    assert.equal((await db.events.get('cloud-legacy-event'))?.sync_status, 'synced');
    assert.equal((await db.events.get('other-user-offline'))?.actor_id, 'another-person');
    console.log('PASS migration detects only unsynced anonymous work and cannot reassign restored/other-account records');
  } finally { (supabase.auth as any).getUser = getUser; await db.delete(); }
}
void main();
