import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getInAppPurchasePort,
  installInAppPurchasePort,
} from '../lib/platform/in-app-purchase-capability';
import { createFakeInAppPurchasePort } from '../lib/platform/testing/fake-in-app-purchase';

async function main(): Promise<void> {
  const webPort = getInAppPurchasePort();
  assert.deepEqual(await webPort.getAvailability(), {
    available: false,
    store: null,
    reason: 'web_checkout_deferred',
  });
  assert.deepEqual(await webPort.purchase({
    productId: 'pro.annual',
    purchaseOptionId: 'web-unavailable-option',
    accountBinding: { opaqueAccountToken: 'opaque-test-binding' },
  }), {
    ok: false,
    error: { code: 'unavailable', retryable: false },
  });

  const evidence = {
    store: 'apple_app_store' as const,
    environment: 'sandbox' as const,
    productId: 'pro.annual',
    opaqueVerificationPayload: 'test-only-opaque-evidence',
  };
  const fake = createFakeInAppPurchasePort({
    availability: { available: true, store: 'apple_app_store', reason: 'available' },
    products: [{
      store: 'apple_app_store',
      productId: 'pro.annual',
      displayName: 'Pro Annual',
      purchaseOptions: [{
        purchaseOptionId: 'test-only-apple-standard-option',
        basePlanId: null,
        offerId: null,
        pricePhases: [{
          displayPrice: 'NT$ 1,990',
          currencyCode: 'TWD',
          billingPeriod: 'P1Y',
          billingCycleCount: null,
          paymentMode: 'recurring',
        }],
      }],
    }],
    purchaseResult: { ok: true, value: evidence },
    restoreResult: { ok: true, value: [evidence] },
    managementResult: { ok: true, value: true },
  });
  const restorePort = installInAppPurchasePort(fake.port);

  try {
    assert.equal((await getInAppPurchasePort().getAvailability()).available, true);
    const products = await getInAppPurchasePort().listProducts(['pro.annual']);
    assert.equal(products.ok && products.value.length, 1);
    assert.deepEqual(await getInAppPurchasePort().purchase({
      productId: 'pro.annual',
      purchaseOptionId: 'test-only-apple-standard-option',
      accountBinding: { opaqueAccountToken: 'opaque-test-binding' },
    }), { ok: true, value: evidence });
    assert.deepEqual(await getInAppPurchasePort().restore({
      accountBinding: { opaqueAccountToken: 'opaque-test-binding' },
    }), { ok: true, value: [evidence] });
    assert.deepEqual(await getInAppPurchasePort().openSubscriptionManagement(), {
      ok: true,
      value: true,
    });
  } finally {
    restorePort();
  }

  assert.equal(getInAppPurchasePort(), webPort);
  assert.deepEqual(fake.calls.map(call => call.operation), [
    'listProducts',
    'purchase',
    'restore',
    'openSubscriptionManagement',
  ]);

  const root = join(__dirname, '..');
  const contract = readFileSync(join(root, 'lib/platform/contracts/in-app-purchase.ts'), 'utf8');
  const core = readFileSync(join(root, 'lib/subscription/native-account-entitlement.ts'), 'utf8');
  for (const source of [contract, core]) {
    assert.doesNotMatch(source, /@capacitor|window\.|document\.|navigator\.|localStorage|indexedDB/i);
  }
  assert.doesNotMatch(contract, /grant|entitlementStatus|subscription_accounts/);

  console.log('PASS IAP platform port, unavailable Web adapter, and deterministic fake adapter');
}

void main();
