import { APP_BRAND } from '@/lib/app-brand';
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { RoleProvider } from "@/lib/role-context";
import { SyncProvider } from "@/lib/sync-context";
import { NativePlatformGate } from '@/components/platform/NativePlatformGate';
import { NativeLinkNavigation } from '@/components/platform/NativeLinkNavigation';

export const metadata: Metadata = {
  title: { default: APP_BRAND.displayName, template: `%s｜${APP_BRAND.name}` },
  description: APP_BRAND.description,
  manifest: "/manifest.json",
  openGraph: { siteName: APP_BRAND.name, locale: "zh_TW" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_BRAND.name,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7B9FA6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={APP_BRAND.name} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#7B9FA6" />
        <meta name="msapplication-TileColor" content="#7B9FA6" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body>
        <NativePlatformGate>
          <NativeLinkNavigation />
          <AuthProvider>
            <RoleProvider>
              <SyncProvider>
                <AppChrome>{children}</AppChrome>
              </SyncProvider>
            </RoleProvider>
          </AuthProvider>
        </NativePlatformGate>
      </body>
    </html>
  );
}
