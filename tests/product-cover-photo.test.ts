import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PRODUCT_COVER_PHOTO_POLICY,
  buildProductCoverPhotoObjectKey,
} from '../lib/products/product-cover-photo-model';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

assert.equal(PRODUCT_COVER_PHOTO_POLICY.displayMaxEdgePx, 1600);
assert.equal(PRODUCT_COVER_PHOTO_POLICY.displayMaxBytes, 600_000);
assert.equal(PRODUCT_COVER_PHOTO_POLICY.thumbnailMaxEdgePx, 480);
assert.equal(PRODUCT_COVER_PHOTO_POLICY.thumbnailMaxBytes, 150_000);

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
assert.match(server, /staff_relationships/);
assert.match(server, /relationship\?\.role === 'manager'/);
assert.doesNotMatch(server, /products'\).*deleted_at/);

const uploadRoute = read('app/api/product-cover-photo/upload/route.ts');
assert.match(uploadRoute, /access\.paid/);
assert.match(uploadRoute, /claim_product_cover_photo_upload/);
assert.match(uploadRoute, /finalize_product_cover_photo_upload/);
assert.match(uploadRoute, /shouldKeepLocalPayload/);

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

console.log('PASS product cover photo policy and integration contracts');
