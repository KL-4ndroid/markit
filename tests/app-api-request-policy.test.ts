import assert from 'node:assert/strict';

import {
  AppApiRequestError,
  fetchAppApi,
  isRetryableAppApiResponseStatus,
} from '../lib/api/transport';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function assertRequestError(
  error: unknown,
  expected: { code: AppApiRequestError['code']; attempts: number; retryable: boolean }
): boolean {
  assert.ok(error instanceof AppApiRequestError);
  assert.equal(error.code, expected.code);
  assert.equal(error.attempts, expected.attempts);
  assert.equal(error.retryable, expected.retryable);
  return true;
}

console.log('\n=== Application API request policy ===');

runTest('returns the first response and supplies an AbortSignal to fetch', async () => {
  let receivedSignal: AbortSignal | null = null;
  const response = await fetchAppApi('/api/health', {}, {
    fetchImpl: async (_input, init) => {
      receivedSignal = init?.signal ?? null;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
    timeoutMs: 100,
  });

  assert.equal(response.status, 200);
  const signal = receivedSignal as AbortSignal | null;
  assert.ok(signal instanceof AbortSignal);
  assert.equal(signal.aborted, false);
});

runTest('GET retries one network failure and never exposes the underlying error', async () => {
  let attempts = 0;
  const sleeps: number[] = [];
  const response = await fetchAppApi('/api/health', { method: 'GET' }, {
    fetchImpl: async () => {
      attempts++;
      if (attempts === 1) throw new Error('secret upstream detail');
      return new Response(null, { status: 204 });
    },
    sleepImpl: async milliseconds => {
      sleeps.push(milliseconds);
    },
    retryDelayMs: 7,
    timeoutMs: 100,
  });

  assert.equal(response.status, 204);
  assert.equal(attempts, 2);
  assert.deepEqual(sleeps, [7]);
});

runTest('GET retries exactly the approved HTTP statuses once', async () => {
  const approvedStatuses = [408, 429, 500, 502, 503, 504];
  for (const status of approvedStatuses) {
    let attempts = 0;
    const response = await fetchAppApi('/api/health', { method: 'GET' }, {
      fetchImpl: async () => {
        attempts++;
        return new Response(null, { status: attempts === 1 ? status : 200 });
      },
      sleepImpl: async () => undefined,
      retryDelayMs: 0,
      timeoutMs: 100,
    });

    assert.equal(response.status, 200, String(status));
    assert.equal(attempts, 2, String(status));
    assert.equal(isRetryableAppApiResponseStatus(status), true, String(status));
  }
});

runTest('GET returns non-retryable HTTP responses without another attempt', async () => {
  for (const status of [400, 401, 403, 404, 409, 501]) {
    let attempts = 0;
    const response = await fetchAppApi('/api/example', { method: 'GET' }, {
      fetchImpl: async () => {
        attempts++;
        return new Response(null, { status });
      },
      sleepImpl: async () => {
        throw new Error('sleep must not run');
      },
      timeoutMs: 100,
    });

    assert.equal(response.status, status);
    assert.equal(attempts, 1, String(status));
    assert.equal(isRetryableAppApiResponseStatus(status), false, String(status));
  }
});

runTest('HEAD has the same single-retry policy as GET', async () => {
  let attempts = 0;
  const response = await fetchAppApi('/api/health', { method: 'HEAD' }, {
    fetchImpl: async () => {
      attempts++;
      if (attempts === 1) throw new TypeError('connection reset');
      return new Response(null, { status: 200 });
    },
    sleepImpl: async () => undefined,
    retryDelayMs: 0,
    timeoutMs: 100,
  });

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
});

runTest('POST does not retry a retryable HTTP response', async () => {
  let attempts = 0;
  let sleepCalled = false;
  const response = await fetchAppApi('/api/sales-photo-evidence/upload', { method: 'POST' }, {
    fetchImpl: async () => {
      attempts++;
      return new Response(null, { status: 503 });
    },
    sleepImpl: async () => {
      sleepCalled = true;
    },
    timeoutMs: 100,
  });

  assert.equal(response.status, 503);
  assert.equal(attempts, 1);
  assert.equal(sleepCalled, false);
});

runTest('POST maps a network failure to one safe transport error without retrying', async () => {
  let attempts = 0;
  await assert.rejects(
    () => fetchAppApi('/api/sales-photo-evidence/upload', { method: 'POST' }, {
      fetchImpl: async () => {
        attempts++;
        throw new Error('authorization=Bearer highly-sensitive-token');
      },
      sleepImpl: async () => {
        throw new Error('sleep must not run');
      },
      timeoutMs: 100,
    }),
    error => {
      assertRequestError(error, { code: 'network_error', attempts: 1, retryable: true });
      assert.doesNotMatch((error as Error).message, /sensitive|Bearer|authorization/i);
      return true;
    }
  );
  assert.equal(attempts, 1);
});

runTest('GET aborts timed-out attempts and retries at most once', async () => {
  let attempts = 0;
  const observedSignals: AbortSignal[] = [];

  await assert.rejects(
    () => fetchAppApi('/api/health', { method: 'GET' }, {
      fetchImpl: async (_input, init) => {
        attempts++;
        const signal = init?.signal;
        assert.ok(signal);
        observedSignals.push(signal);
        return new Promise<Response>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          }, { once: true });
        });
      },
      sleepImpl: async () => undefined,
      retryDelayMs: 0,
      timeoutMs: 5,
    }),
    error => assertRequestError(error, {
      code: 'request_timeout',
      attempts: 2,
      retryable: true,
    })
  );

  assert.equal(attempts, 2);
  assert.equal(observedSignals.length, 2);
  assert.equal(observedSignals.every(signal => signal.aborted), true);
});

runTest('an already-aborted caller signal fails before fetch and is not retryable', async () => {
  const controller = new AbortController();
  controller.abort();
  let fetchCalled = false;

  await assert.rejects(
    () => fetchAppApi('/api/health', { signal: controller.signal }, {
      fetchImpl: async () => {
        fetchCalled = true;
        return new Response(null, { status: 200 });
      },
    }),
    error => assertRequestError(error, {
      code: 'request_aborted',
      attempts: 0,
      retryable: false,
    })
  );

  assert.equal(fetchCalled, false);
});

runTest('invalid timeout and delay options fail with the shared safe error type', async () => {
  for (const options of [
    { timeoutMs: 0 },
    { timeoutMs: Number.NaN },
    { retryDelayMs: -1 },
  ]) {
    await assert.rejects(
      () => fetchAppApi('/api/health', {}, options),
      error => assertRequestError(error, {
        code: 'request_policy_invalid',
        attempts: 0,
        retryable: false,
      })
    );
  }
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
    throw new Error(`${failed} application API request policy tests failed`);
  }
}

void main();
