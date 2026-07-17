'use client';

import Dexie from 'dexie';
import { useEffect, useState } from 'react';

import { BottomNavigation } from '@/components/BottomNavigation';
import { testSupabaseConnection } from '@/lib/supabase/client';

type ProbeStatus = 'pending' | 'pass' | 'fail';

const SMOKE_DATABASE_NAME = 'feria-mobile-runtime-smoke';

async function runDexieRoundTrip(): Promise<void> {
  await Dexie.delete(SMOKE_DATABASE_NAME);

  const database = new Dexie(SMOKE_DATABASE_NAME);
  database.version(1).stores({ probes: 'id' });
  const probes = database.table<{ id: string; value: string }, string>('probes');

  try {
    await probes.put({ id: 'round-trip', value: 'mobile-static-bundle' });
    const stored = await probes.get('round-trip');
    if (stored?.value !== 'mobile-static-bundle') {
      throw new Error('Dexie read did not return the written probe.');
    }

    await probes.delete('round-trip');
    if (await probes.get('round-trip')) {
      throw new Error('Dexie probe was not deleted.');
    }
  } finally {
    database.close();
    await Dexie.delete(SMOKE_DATABASE_NAME);
  }
}

export default function MobileRuntimeSmokePage() {
  const [dexieStatus, setDexieStatus] = useState<ProbeStatus>('pending');
  const [supabaseStatus, setSupabaseStatus] = useState<ProbeStatus>('pending');

  useEffect(() => {
    let active = true;

    void runDexieRoundTrip()
      .then(() => {
        if (active) setDexieStatus('pass');
      })
      .catch(() => {
        if (active) setDexieStatus('fail');
      });

    void testSupabaseConnection()
      .then(connected => {
        if (active) setSupabaseStatus(connected ? 'pass' : 'fail');
      })
      .catch(() => {
        if (active) setSupabaseStatus('fail');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-lg space-y-6 px-6 py-10 pb-28">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Mobile static bundle
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Runtime smoke verification</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This route exists only in the dedicated runtime-smoke build and is excluded from production Web and mobile artifacts.
        </p>
      </div>

      <dl className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <dt>Dexie write / read / delete</dt>
          <dd data-testid="dexie-runtime-status" className="font-mono font-semibold">
            {dexieStatus}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>Supabase browser SDK / CORS</dt>
          <dd data-testid="supabase-runtime-status" className="font-mono font-semibold">
            {supabaseStatus}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">
        Use the real bottom navigation below to verify a client-side route transition.
      </p>

      <BottomNavigation />
    </main>
  );
}
