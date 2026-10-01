import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isInternalTestSurfaceAvailable } from '@/lib/deployment/internal-test-surface';

export function proxy(_request: NextRequest) {
  if (isInternalTestSurfaceAvailable()) return NextResponse.next();

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
  matcher: ['/debug/:path*'],
};
