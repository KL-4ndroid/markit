import { applyAppApiCors, createAppApiCorsPreflightResponse, createAppApiCorsRejectionResponse } from '@/lib/api/server/cors';
import { createAccountDeletionActionHandler } from '@/lib/subscription/account-deletion-request-workflow.server';
import { accountDeletionRouteDeps } from '../route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 5;
const options = { allowedMethods: ['POST', 'OPTIONS'] as const };
export async function POST(request: Request) {
  const rejection = createAppApiCorsRejectionResponse(request, options);
  if (rejection) return rejection;
  return applyAppApiCors(request, await createAccountDeletionActionHandler('cancel', accountDeletionRouteDeps)(request), options);
}
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, options);
