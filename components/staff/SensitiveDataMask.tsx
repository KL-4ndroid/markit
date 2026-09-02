/**
 * 敏感數據遮罩
 * 
 * 用於隱藏員工不應看到的敏感資訊（成本、利潤等）
 */

'use client';

import { Lock, EyeOff } from 'lucide-react';

interface SensitiveDataMaskProps {
  label: string;
  icon?: 'lock' | 'eye-off';
  size?: 'sm' | 'md' | 'lg';
}

export function SensitiveDataMask({ 
  label, 
  icon = 'lock',
  size = 'md' 
}: SensitiveDataMaskProps) {
  const Icon = icon === 'lock' ? Lock : EyeOff;
  
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`bg-primary/10 rounded-xl ${sizeClasses[size]} relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"></div>
      <div className="relative flex items-center justify-center gap-2">
        <Icon className={`${iconSizes[size]} text-primary`} />
        <span className={`${textSizes[size]} text-muted-foreground font-medium`}>
          {label}
        </span>
      </div>
    </div>
  );
}
