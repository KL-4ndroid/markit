import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppChrome } from "@/components/AppChrome";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { RoleProvider } from "@/lib/role-context";
import { SyncProvider } from "@/lib/sync-context";

export const metadata: Metadata = {
  title: "Féria - 出攤筆記",
  description: "獨立品牌的市集經營筆記 - 記錄市集、商品、成本與成果",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Féria 出攤筆記",
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
        <meta name="apple-mobile-web-app-title" content="Féria 出攤筆記" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#7B9FA6" />
        <meta name="msapplication-TileColor" content="#7B9FA6" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body>
        <AuthProvider>
          <RoleProvider>
            <SyncProvider>
              <AppChrome>{children}</AppChrome>
            </SyncProvider>
          </RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
