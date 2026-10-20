import 'server-only';

export type SubscriptionPriceFoundationProbe = {
  operation: string;
  passed: boolean;
  httpStatus: number;
  errorCode: string;
};

export type SubscriptionPriceFoundationSmokeSummary = {
  passed: boolean;
  passedChecks: number;
  totalChecks: number;
  probes: SubscriptionPriceFoundationProbe[];
};

type SmokeInput = {
  supabaseUrl: string;
  publicKey: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
};

type TableProbe = {
  operation: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  table: string;
  query?: string;
  body?: Record<string, unknown>;
};

const MISSING_ROW_ID = '00000000-0000-0000-0000-000000000000';

const TABLE_PROBES: ReadonlyArray<TableProbe> = [
  { operation: 'select subscription_price_versions', method: 'GET', table: 'subscription_price_versions', query: '?select=id&limit=1' },
  {
    operation: 'insert subscription_price_versions',
    method: 'POST',
    table: 'subscription_price_versions',
    body: {
      id: 'pro_monthly_twd_launch_v1',
      plan_code: 'pro',
      cadence: 'monthly',
      currency: 'TWD',
      amount_minor: 199,
      price_policy: 'standard',
      commercial_status: 'candidate',
    },
  },
  { operation: 'update subscription_price_versions', method: 'PATCH', table: 'subscription_price_versions', query: '?id=eq.__denial_smoke_missing__', body: { commercial_status: 'candidate' } },
  { operation: 'delete subscription_price_versions', method: 'DELETE', table: 'subscription_price_versions', query: '?id=eq.__denial_smoke_missing__' },
  { operation: 'select billing_storefront_price_mappings', method: 'GET', table: 'billing_storefront_price_mappings', query: '?select=id&limit=1' },
  {
    operation: 'insert billing_storefront_price_mappings',
    method: 'POST',
    table: 'billing_storefront_price_mappings',
    body: {
      id: MISSING_ROW_ID,
      price_version_id: '__denial_smoke_missing__',
      billing_origin: 'newebpay_web',
      provider_environment: 'sandbox',
      mapping_mode: 'server_amount',
      mapping_status: 'candidate',
    },
  },
  { operation: 'update billing_storefront_price_mappings', method: 'PATCH', table: 'billing_storefront_price_mappings', query: `?id=eq.${MISSING_ROW_ID}`, body: { mapping_status: 'candidate' } },
  { operation: 'delete billing_storefront_price_mappings', method: 'DELETE', table: 'billing_storefront_price_mappings', query: `?id=eq.${MISSING_ROW_ID}` },
  { operation: 'select subscription_price_assignments', method: 'GET', table: 'subscription_price_assignments', query: '?select=id&limit=1' },
  {
    operation: 'insert subscription_price_assignments',
    method: 'POST',
    table: 'subscription_price_assignments',
    body: {
      id: MISSING_ROW_ID,
      owner_id: MISSING_ROW_ID,
      storefront_price_mapping_id: MISSING_ROW_ID,
      price_version_id: '__denial_smoke_missing__',
      assigned_plan_code: 'pro',
      assigned_cadence: 'monthly',
      assigned_currency: 'TWD',
      assigned_amount_minor: 199,
      price_policy: 'standard',
      assignment_source: 'migration',
      source_reference: 'denial-smoke',
      continuity_started_at: '2000-01-01T00:00:00Z',
      assigned_at: '2000-01-01T00:00:00Z',
      last_transition_at: '2000-01-01T00:00:00Z',
      last_transition_reason: 'denial-smoke',
      last_transition_evidence_reference: 'denial-smoke',
    },
  },
  { operation: 'update subscription_price_assignments', method: 'PATCH', table: 'subscription_price_assignments', query: `?id=eq.${MISSING_ROW_ID}`, body: { last_transition_reason: 'denial-smoke' } },
  { operation: 'delete subscription_price_assignments', method: 'DELETE', table: 'subscription_price_assignments', query: `?id=eq.${MISSING_ROW_ID}` },
];

const TRIGGER_FUNCTIONS = [
  'enforce_subscription_price_version_update',
  'enforce_billing_storefront_mapping_update',
  'enforce_subscription_price_assignment_write',
] as const;

async function readErrorCode(response: Response): Promise<string> {
  try {
    const body = await response.json() as { code?: unknown };
    return String(body?.code ?? 'none').slice(0, 40);
  } catch {
    return 'none';
  }
}

export async function runAuthenticatedSubscriptionPriceFoundationSmoke(
  input: SmokeInput,
): Promise<SubscriptionPriceFoundationSmokeSummary> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const baseUrl = input.supabaseUrl.replace(/\/$/, '');
  const probes: SubscriptionPriceFoundationProbe[] = [];
  const commonHeaders = {
    apikey: input.publicKey,
    Authorization: `Bearer ${input.accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  for (const probe of TABLE_PROBES) {
    const response = await fetchImpl(`${baseUrl}/rest/v1/${probe.table}${probe.query ?? ''}`, {
      method: probe.method,
      headers: { ...commonHeaders, Prefer: 'return=minimal' },
      body: probe.body === undefined ? undefined : JSON.stringify(probe.body),
      cache: 'no-store',
    });
    const errorCode = await readErrorCode(response);
    probes.push({
      operation: probe.operation,
      passed: !response.ok && errorCode === '42501',
      httpStatus: response.status,
      errorCode,
    });
  }

  for (const functionName of TRIGGER_FUNCTIONS) {
    const response = await fetchImpl(`${baseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: commonHeaders,
      body: '{}',
      cache: 'no-store',
    });
    const errorCode = await readErrorCode(response);
    probes.push({
      operation: `execute ${functionName}`,
      passed: !response.ok
        && [401, 403, 404].includes(response.status)
        && ['42501', 'PGRST202'].includes(errorCode),
      httpStatus: response.status,
      errorCode,
    });
  }

  const passedChecks = probes.filter(probe => probe.passed).length;
  return {
    passed: passedChecks === probes.length,
    passedChecks,
    totalChecks: probes.length,
    probes,
  };
}
