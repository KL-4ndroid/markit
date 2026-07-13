'use client';

import { useEffect, useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';

/**
 * PWA 安裝按鈕組件（用於設置頁面）
 * 檢測是否已安裝，已安裝則不顯示
 */
export function PWAInstallButton() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // 檢查是否已安裝
    const checkInstalled = () => {
      const installed = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone ||
                       document.referrer.includes('android-app://');
      setIsInstalled(installed);
    };

    checkInstalled();

    // 檢測平台
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    if (isIOS && !isInStandaloneMode) {
      setPlatform('ios');
      setCanInstall(true);
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Android/Desktop: 監聽安裝提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
      setPlatform('android');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (platform === 'ios') {
      // iOS 顯示引導
      setShowModal(true);
    } else if (deferredPrompt) {
      // Android/Desktop 直接安裝
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    }
  };

  // 已安裝則不顯示按鈕
  if (isInstalled) {
    return null;
  }

  // 無法安裝則不顯示按鈕
  if (!canInstall) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstall}
        className="w-full p-6 bg-gradient-to-br from-primary to-primary/85 rounded-[1.5rem] shadow-lg hover:shadow-xl transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-base font-medium text-white mb-1">
              安裝 Féria 到主畫面
            </h3>
            <p className="text-sm text-white/80">
              享受更快速的啟動和離線使用
            </p>
          </div>
          <Download className="w-5 h-5 text-white" />
        </div>
      </button>

      {/* iOS 安裝引導 Modal */}
      {showModal && platform === 'ios' && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center sm:justify-center p-4">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">安裝 Féria 到主畫面</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-soft-pink transition-colors"
              >
                <span className="text-xl">×</span>
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
                    點擊底部的 <Share className="w-4 h-4 inline text-[#007AFF]" /> <strong>分享</strong> 按鈕
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

            <div className="bg-cat-clothing rounded-xl p-4 mb-4">
              <p className="text-xs text-muted-foreground">
                💡 安裝後，您可以像使用一般 App 一樣從主畫面啟動 Féria，享受更流暢的體驗！
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full px-6 py-3 rounded-2xl bg-primary text-white hover:bg-primary/85 transition-colors font-medium"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
