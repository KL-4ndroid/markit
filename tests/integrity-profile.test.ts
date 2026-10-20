import assert from 'node:assert/strict';
import { checkBackupIntegrity, type BackupData } from '../lib/db/integrity';

function backup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    version: 1,
    exportedAt: Date.now(),
    events: [],
    markets: [],
    products: [],
    dailyStats: [],
    settings: [],
    ...overrides,
  };
}

function main(): void {
  const scopedEventBackup = backup({
    events: [
      {
        id: 'event-1',
        type: 'settings_updated',
        timestamp: Date.now(),
        market_id: 'out-of-scope-market',
        payload: {},
      },
    ],
  });

  const ownerFull = checkBackupIntegrity(scopedEventBackup);
  assert.equal(ownerFull.ok, false);
  assert.ok(ownerFull.errors.some(error => error.includes('market_id')));

  const staffScoped = checkBackupIntegrity(scopedEventBackup, { profile: 'staff_scoped' });
  assert.equal(staffScoped.ok, true);
  assert.equal(staffScoped.errors.length, 0);
  assert.ok(staffScoped.warnings.some(warning =>
    warning.includes('[staff_scoped]') && warning.includes('market_id')
  ));

  const scopedReplayBackup = backup({
    events: [
      {
        id: 'interaction-1',
        type: 'interaction_recorded',
        timestamp: Date.now(),
        market_id: 'out-of-scope-market',
        payload: {
          market_id: 'out-of-scope-market',
          type: 'touch',
        },
      },
      {
        id: 'deal-1',
        type: 'deal_closed',
        timestamp: Date.now(),
        market_id: 'out-of-scope-market',
        payload: {
          market_id: 'out-of-scope-market',
          totalAmount: 100,
          paymentMethod: 'cash',
          items: [
            { productId: 'out-of-scope-product', quantity: 1, price: 100 },
          ],
        },
      },
    ],
  });

  const scopedReplayOwnerFull = checkBackupIntegrity(scopedReplayBackup);
  assert.equal(scopedReplayOwnerFull.ok, false);

  const scopedReplayStaff = checkBackupIntegrity(scopedReplayBackup, { profile: 'staff_scoped' });
  assert.equal(scopedReplayStaff.ok, true);
  assert.equal(scopedReplayStaff.errors.length, 0);
  assert.ok(scopedReplayStaff.warnings.some(warning =>
    warning.includes('cannot replay because market is unavailable')
  ));
  assert.ok(scopedReplayStaff.warnings.some(warning =>
    warning.includes('cannot replay because product is unavailable')
  ));

  const tombstoneOutOfScope = checkBackupIntegrity(backup({
    markets: [{
      id: 'market-1',
      name: 'Market',
      location: 'Here',
      startDate: '2026-06-13',
      endDate: '2026-06-13',
      registrationFee: 0,
      boothCost: 0,
      status: 'paid',
      dates: ['2026-06-13'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }],
    events: [
      {
        id: 'delete-1',
        type: 'deal_deleted',
        timestamp: Date.now(),
        market_id: 'market-1',
        payload: {
          eventId: 'missing-deal',
          market_id: 'market-1',
          dealDate: '2026-06-13',
          totalAmount: 100,
          dealCount: 1,
        },
      },
    ],
  }));

  assert.equal(tombstoneOutOfScope.ok, true);
  assert.ok(tombstoneOutOfScope.warnings.some(warning =>
    warning.includes('references event not in snapshot')
  ));

  console.log('PASS integrity profiles');
}

main();
