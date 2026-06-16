/**
 * 升級提示組件
 * 
 * 在頁面頂部顯示升級提示橫幅
 */

'use client';

import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UpgradePromptProps {
  message?: string;
  showClose?: boolean;
}

export function UpgradePrompt({ 
  message = '升級至專業版，解鎖無限市集和雲端同步功能',
  showClose = true 
}: UpgradePromptProps) {
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-white">
      <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{message}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/subscription')}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
          >
            立即升級
          </button>
          
          {showClose && (
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
