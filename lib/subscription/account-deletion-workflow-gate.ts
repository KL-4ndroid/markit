import { TEST_TOOLS_ENABLED } from '@/lib/app/build-profile';

/** Sources and isolated evidence cannot certify a deployed deletion runtime. */
export const ACCOUNT_DELETION_REQUEST_WORKFLOW_RELEASE_READY = false;

export function isDeletionLoopbackDatabase(value: string | undefined): boolean {
  try {
    const url = new URL(value ?? '');
    return ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && !url.username && !url.password;
  } catch { return false; }
}

export function accountDeletionWorkflowUiEnabled(): boolean {
  return TEST_TOOLS_ENABLED && process.env.NEXT_PUBLIC_ACCOUNT_DELETION_REQUEST_WORKFLOW_ENABLED === '1'
    && isDeletionLoopbackDatabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
}
