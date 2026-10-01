/**
 * 老闆資訊卡片
 * 
 * 顯示員工當前為哪位老闆工作
 */

'use client';

import { Crown } from 'lucide-react';

interface OwnerInfoCardProps {
  ownerEmail: string;
}

export function OwnerInfoCard({ ownerEmail }: OwnerInfoCardProps) {
  return (
    <div className="bg-white rounded-xl border-2 border-primary/20 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">為以下老闆工作</p>
          <p className="text-sm font-medium text-foreground truncate">
            {ownerEmail}
          </p>
        </div>
      </div>
    </div>
  );
}
