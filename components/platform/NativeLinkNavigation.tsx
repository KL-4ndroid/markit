'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getAppPlatform } from '@/lib/platform/platform';
import { startAppLinkRouting } from '@/lib/platform/app-link-routing';
import { interceptNativeExternalLinks } from '@/lib/platform/interaction-navigation';

export function NativeLinkNavigation() {
  const router = useRouter();
  useEffect(() => {
    const platform = getAppPlatform();
    if (platform.kind !== 'ios') return;
    const stopRouting = startAppLinkRouting(platform.deepLinks, path => router.replace(path));
    const stopExternal = interceptNativeExternalLinks(platform.externalLinks, () => { toast.error('目前無法開啟連結，請稍後再試。'); });
    return () => { stopRouting(); stopExternal(); };
  }, [router]);
  return null;
}
