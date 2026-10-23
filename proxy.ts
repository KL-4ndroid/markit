import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isInternalTestSurfaceAvailable } from '@/lib/deployment/internal-test-surface';
import { TEST_TOOLS_ENABLED } from '@/lib/app/build-profile';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isRecoveryTool = path === '/recovery' || path.startsWith('/recovery/')
    || path === '/settings/data' || path.startsWith('/settings/data/');
  if (isRecoveryTool ? TEST_TOOLS_ENABLED : isInternalTestSurfaceAvailable()) return NextResponse.next();

  return new NextResponse('Not Found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export const config = {
  matcher: ['/debug/:path*', '/recovery/:path*', '/settings/data/:path*'],
};
