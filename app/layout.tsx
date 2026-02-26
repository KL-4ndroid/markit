import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNavigation } from "@/components/BottomNavigation";
import { TopNavigation } from "@/components/TopNavigation";
import { Toaster } from "sonner";
import { RegisterServiceWorker } from "./register-sw";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { AuthProvider } from "@/lib/supabase/auth-context";
import { SyncProvider } from "@/lib/sync-context";
import { AuthManager } from "@/components/auth/AuthManager";
import { GlobalLoadingState } from "@/components/GlobalLoadingState";
import { NavigationProvider } from "@/lib/navigation-context";
import { SyncProgressManager } from "@/components/sync/SyncProgressManager";
import { InitialSyncDialog } from "@/components/sync/InitialSyncDialog";
import { StaffInvitationDialog } from "@/components/staff/StaffInvitationDialog";
import { DebugToolsLoader } from "@/components/DebugToolsLoader";

export const metadata: Metadata = {
  title: "市集誌 - Market Pulse",
  description: "市集攤販數位管理系統 - 輕鬆管理銷售、統計數據、追蹤成本",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "市集誌",
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
  maximumScale: 1,
  userScalable: false,
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
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="市集誌" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#7B9FA6" />
        <meta name="msapplication-TileColor" content="#7B9FA6" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body>
        {/* Auth Provider - 管理全域用戶狀態 */}
        <AuthProvider>
          {/* Sync Provider - 管理全域同步狀態 */}
          <SyncProvider>
            {/* Navigation Provider - 管理頁面切換方向 */}
            <NavigationProvider>
              {/* Service Worker 註冊 */}
              <RegisterServiceWorker />
              
              {/* 調試工具載入器（僅開發環境） */}
              <DebugToolsLoader />
              
              {/* 全局載入狀態 - 首次載入時顯示 */}
              <GlobalLoadingState />
              
              <div className="min-h-screen bg-[#FAFAF8]">
                {/* 頂部導航 - 已移至首頁 Header */}
                {/* <TopNavigation /> */}
                
                {/* 主要內容區域 */}
                <main className="pb-24">
                  {children}
                </main>
                
                {/* 底部導航 */}
                <BottomNavigation />
                
                {/* PWA 安裝提示 */}
                <PWAInstallPrompt />
                
                {/* PWA 更新提示 */}
                <PWAUpdatePrompt />
                
                {/* 認證管理（登入/遷移對話框） */}
                <AuthManager />
                
                {/* 員工邀請對話框（優先級最高） */}
                <StaffInvitationDialog />
                
                {/* 初始同步對話框（登入後立即顯示） */}
                <InitialSyncDialog />
                
                {/* 同步進度管理 */}
                <SyncProgressManager />
                
                {/* Toast 通知 */}
                <Toaster 
                  position="top-center"
                  toastOptions={{
                    style: {
                      background: '#FFFFFF',
                      color: '#3A3A3A',
                      border: '1px solid rgba(123, 159, 166, 0.2)',
                      borderRadius: '1rem',
                      padding: '1rem',
                    },
                  }}
                />
              </div>
            </NavigationProvider>
          </SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
