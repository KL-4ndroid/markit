'use client';

import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

/**
 * PWA 安裝提示組件
 * 支援 iOS 和 Android 的安裝引導
 * 只在第一次訪問時自動顯示，之後需要從設置頁面手動觸發
 */
export function PWAInstallPrompt({ manualTrigger = false }: { manualTrigger?: boolean }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null);

  useEffect(() => {
    // 檢查是否已安裝
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone ||
                       document.referrer.includes('android-app://');

    if (isInstalled) {
      return;
    }

    // 檢測平台
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    if (isIOS && !isInStandaloneMode) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Android/Desktop: 監聽安裝提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 只在第一次訪問時自動顯示
    if (!manualTrigger) {
      const hasShownBefore = localStorage.getItem('pwa-install-first-shown');
      
      if (!hasShownBefore) {
        // 第一次訪問，延遲 3 秒顯示
        setTimeout(() => {
          setShowPrompt(true);
          localStorage.setItem('pwa-install-first-shown', 'true');
        }, 3000);
      }
    } else {
      // 手動觸發（從設置頁面）
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [manualTrigger]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // 顯示安裝提示
    deferredPrompt.prompt();

    // 等待用戶選擇
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  // iOS 安裝引導
  if (platform === 'ios') {
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center sm:justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">安裝 Féria 到主畫面</h3>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-full hover:bg-soft-pink transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            將 Féria 加入主畫面，享受更快速的啟動和更好的使用體驗！
          </p>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  點擊底部的 <Share className="w-4 h-4 inline text-info" /> <strong>分享</strong> 按鈕
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  向下滾動並選擇 <strong>「加入主畫面」</strong>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  點擊右上角的 <strong>「加入」</strong> 完成安裝
                </p>
              </div>
            </div>
          </div>

          <div className="bg-cat-clothing rounded-xl p-4">
            <p className="text-xs text-muted-foreground">
              💡 安裝後，您可以像使用一般 App 一樣從主畫面啟動 Féria，享受更流暢的體驗！
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="w-full mt-4 px-6 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors font-medium"
          >
            我知道了
          </button>
        </div>
      </div>
    );
  }

  // Android/Desktop 安裝提示
  if (platform === 'android' || platform === 'desktop') {
    return (
      <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[100] animate-slide-up">
        <div className="bg-white rounded-[1.5rem] p-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1">
              <h3 className="text-base font-medium text-foreground mb-1">
                安裝 Féria
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                安裝到您的裝置，享受更快速的啟動和離線使用！
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/85 transition-colors font-medium text-sm"
                >
                  立即安裝
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 rounded-xl bg-soft-pink text-muted-foreground hover:bg-soft-pink/80 transition-colors font-medium text-sm"
                >
                  稍後
                </button>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-full hover:bg-soft-pink transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
