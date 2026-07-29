import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PRODUCT_COVER_PHOTO_POLICY,
  buildProductCoverPhotoObjectKey,
} from '../lib/products/product-cover-photo-model';
import {
  isProductCoverPhotoEntitlementRequired,
  resolveProductCoverPhotoPlanAccess,
} from '../lib/products/product-cover-photo-server';
import type {
  AccountCapabilityRepository,
  SubscriptionAccountRecord,
} from '../lib/subscription/account-capability-server';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

assert.equal(PRODUCT_COVER_PHOTO_POLICY.displayMaxEdgePx, 1600);
assert.equal(PRODUCT_COVER_PHOTO_POLICY.displayMaxBytes, 600_000);
assert.equal(PRODUCT_COVER_PHOTO_POLICY.thumbnailMaxEdgePx, 480);
assert.equal(PRODUCT_COVER_PHOTO_POLICY.thumbnailMaxBytes, 150_000);
assert.equal(isProductCoverPhotoEntitlementRequired({}), false);
assert.equal(isProductCoverPhotoEntitlementRequired({ PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE: 'open' }), false);
assert.equal(isProductCoverPhotoEntitlementRequired({ PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE: 'required' }), true);

assert.equal(
  buildProductCoverPhotoObjectKey({
    ownerId: 'owner-id',
    productId: 'product-id',
    photoId: 'photo-id',
    version: 7,
    variant: 'thumbnail',
    mimeType: 'image/webp',
  }),
  'product-cover-photos/owner-id/product-id/photo-id/v7/thumbnail.webp',
);

const migration = read('supabase/migrations/062_add_product_cover_photos.sql');
assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS product_cover_photos_one_active_per_product/);
assert.match(migration, /WHERE deleted_at IS NULL/);
assert.match(migration, /product_cover_photo_enabled/);
assert.match(migration, /paid_entitlement_required/);
assert.match(migration, /p_require_entitlement AND NOT EXISTS/);
assert.match(migration, /pending_photo_id/);
assert.match(migration, /product_cover_photos\.status = 'uploaded'/);
assert.match(migration, /ae\.product_cover_photo_enabled = true/);
assert.match(migration, /storage_quota_exceeded/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.claim_product_cover_photo_upload/);

const server = read('lib/products/product-cover-photo-server.ts');
assert.match(server, /PRODUCT_COVER_PHOTO_UPLOAD_ALLOW_PRODUCTION/);
assert.match(server, /PRODUCT_COVER_PHOTO_DELETE_ENABLED/);
assert.match(server, /PRODUCT_COVER_PHOTO_MAX_ACCOUNT_BYTES/);
assert.match(server, /PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE === 'required'/);
assert.match(server, /SUPABASE_SECRET_KEY/);
assert.match(server, /resolveServerAccountCapabilities/);
assert.match(server, /feature: 'productCoverPhoto'/);
assert.match(server, /staff_relationships/);
assert.match(server, /relationship\?\.role === 'manager'/);
assert.doesNotMatch(server, /\.from\('account_entitlements'\)/);
assert.doesNotMatch(server, /products'\).*deleted_at/);

const uploadRoute = read('app/api/product-cover-photo/upload/route.ts');
assert.match(uploadRoute, /resolveProductCoverPhotoPlanAccess/);
assert.match(uploadRoute, /createAccountCapabilityRepository/);
assert.match(uploadRoute, /currentPlanAccess/);
assert.match(uploadRoute, /claim_product_cover_photo_upload/);
assert.match(uploadRoute, /finalize_product_cover_photo_upload/);
assert.match(uploadRoute, /shouldKeepLocalPayload/);
assert.equal(uploadRoute.match(/p_require_entitlement: false/g)?.length, 2);

const capabilityRoute = read('app/api/product-cover-photo/capability/route.ts');
assert.match(capabilityRoute, /createAccountCapabilityRepository/);
assert.match(capabilityRoute, /resolveProductCoverPhotoPlanAccess/);
assert.match(capabilityRoute, /planAccess\.reason/);

const imageRoute = read('app/api/product-cover-photo/image/route.ts');
assert.match(imageRoute, /authenticateAppApiRequest/);
assert.match(imageRoute, /Cache-Control': 'private/);

const metadataRoute = read('app/api/product-cover-photo/metadata/route.ts');
assert.match(metadataRoute, /productIds\.length === 0/);
assert.match(metadataRoute, /allowedOwnerIds/);
assert.match(metadataRoute, /\.slice\(0, 100\)/);

const database = read('lib/db/index.ts');
assert.match(database, /this\.version\(7\)/);
assert.match(database, /productCoverPhotoPendingUploads/);
assert.match(database, /productCoverPhotoPendingPayloads/);

const pendingReport = read('lib/sync/local-pending-write-report.ts');
assert.match(pendingReport, /local_pending_product_cover_photo/);
assert.match(pendingReport, /pendingProductCoverPhotoPayloadCount/);

const platformPort = read('lib/platform/product-image-capability.ts');
const webAdapter = read('lib/platform/product-image-adapter.web.ts');
const photoField = read('components/products/ProductCoverPhotoField.tsx');
assert.match(platformPort, /ProductImageAdapter/);
assert.match(platformPort, /product-image-adapter\.web/);
assert.match(webAdapter, /document\.createElement\('canvas'\)/);
assert.doesNotMatch(photoField, /document\.createElement|createImageBitmap/);

const hooks = read('lib/db/hooks.ts');
assert.match(hooks, /createProductWithResult/);
assert.match(hooks, /productId = generateUUID\(\)/);

const productTypes = read('types/db.ts');
const productBlock = productTypes.match(/export interface Product[\s\S]*?\n}/)?.[0] ?? '';
assert.doesNotMatch(productBlock, /image|photo|cover/i);

const addForm = read('components/products/AddProductForm.tsx');
const editForm = read('components/products/EditProductForm.tsx');
const card = read('components/products/ProductCard.tsx');
assert.match(addForm, /ProductCoverPhotoField/);
assert.match(addForm, /uploadOrQueueProductCoverPhoto/);
assert.match(editForm, /ProductCoverPhotoField/);
assert.match(card, /ProductCoverPhotoImage/);
assert.match(card, /coverPhotoVersion/);

const NOW = Date.parse('2026-07-29T12:00:00.000Z');
const OWNER_ID = '00000000-0000-4000-8000-000000000001';

function repository(account: SubscriptionAccountRecord | null): AccountCapabilityRepository {
  return {
    readForActor: async () => ({ access: 'allowed', account }),
  };
}

function account(overrides: Partial<SubscriptionAccountRecord> = {}): SubscriptionAccountRecord {
  return {
    ownerId: OWNER_ID,
    planCode: 'free',
    planSource: 'free',
    billingStatus: 'none',
    entitlementStatus: 'active',
    entitlementEndsAt: null,
    updatedAt: '2026-07-29T11:00:00.000Z',
    ...overrides,
  };
}

async function verifySubscriptionAlignment(): Promise<void> {
  assert.deepEqual(await resolveProductCoverPhotoPlanAccess({
    actorId: OWNER_ID,
    ownerId: OWNER_ID,
    entitlementRequired: false,
    repository: null,
    nowMs: NOW,
  }), { allowed: true, reason: 'open_access' });

  assert.deepEqual(await resolveProductCoverPhotoPlanAccess({
    actorId: OWNER_ID,
    ownerId: OWNER_ID,
    entitlementRequired: true,
    repository: null,
    nowMs: NOW,
  }), { allowed: false, reason: 'entitlement_unavailable' });

  assert.deepEqual(await resolveProductCoverPhotoPlanAccess({
    actorId: OWNER_ID,
    ownerId: OWNER_ID,
    entitlementRequired: true,
    repository: repository(account()),
    nowMs: NOW,
  }), { allowed: false, reason: 'free_plan' });

  assert.deepEqual(await resolveProductCoverPhotoPlanAccess({
    actorId: OWNER_ID,
    ownerId: OWNER_ID,
    entitlementRequired: true,
    repository: repository(account({
      planCode: 'pro',
      planSource: 'admin',
      entitlementEndsAt: '2026-08-29T12:00:00.000Z',
    })),
    nowMs: NOW,
  }), { allowed: true, reason: 'paid_active' });

  assert.deepEqual(await resolveProductCoverPhotoPlanAccess({
    actorId: OWNER_ID,
    ownerId: OWNER_ID,
    entitlementRequired: true,
    repository: repository(account({
      planCode: 'pro',
      planSource: 'admin',
      entitlementStatus: 'inactive',
      entitlementEndsAt: '2026-07-28T12:00:00.000Z',
    })),
    nowMs: NOW,
  }), { allowed: false, reason: 'subscription_inactive' });
}

verifySubscriptionAlignment()
  .then(() => console.log('PASS product cover photo policy and subscription alignment contracts'))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
