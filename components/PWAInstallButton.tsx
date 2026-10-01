'use client';

import { CheckCircle2, Download, Share, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallPlatform = 'ios' | 'browser';

export function PWAInstallButton() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<InstallPlatform>('browser');

  useEffect(() => {
    const installed = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
      || document.referrer.includes('android-app://');
    setIsInstalled(installed);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    if (isIOS && !installed) {
      setPlatform('ios');
      setCanInstall(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
      setPlatform('browser');
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (platform === 'ios') {
      setShowInstructions(true);
      return;
    }

    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  return (
    <>
      <section className="rounded-card border border-primary/10 bg-white p-5" aria-labelledby="install-app-title">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {isInstalled
              ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              : <Smartphone className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="install-app-title" className="text-base font-semibold text-foreground">
              {isInstalled ? '已安裝到這台裝置' : '安裝 Féria 到主畫面'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {isInstalled
                ? '可以直接從主畫面開啟，並繼續使用離線保存功能。'
                : canInstall
                  ? '安裝後可更快開啟，畫面也會更接近一般 App。'
                  : '若瀏覽器支援安裝，可從瀏覽器選單選擇「安裝應用程式」。'}
            </p>
          </div>
        </div>

        {!isInstalled && canInstall && (
          <Button
            className="mt-4 w-full sm:w-auto"
            leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void handleInstall()}
          >
            安裝到主畫面
          </Button>
        )}
      </section>

      <AppDialog
        open={showInstructions}
        onClose={() => setShowInstructions(false)}
        title="在 iPhone 或 iPad 安裝 Féria"
        description="Safari 會透過分享選單把網頁加入主畫面。"
        size="sm"
        footer={<Button onClick={() => setShowInstructions(false)}>完成</Button>}
      >
        <ol className="space-y-4 text-sm text-foreground">
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">1</span>
            <span className="pt-1">在 Safari 工具列點選 <Share className="inline h-4 w-4 text-primary" aria-label="分享" />。</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">2</span>
            <span className="pt-1">在選單中選擇「加入主畫面」。</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">3</span>
            <span className="pt-1">確認名稱後點選「加入」。</span>
          </li>
        </ol>
      </AppDialog>
    </>
  );
}
