/**
 * JapaneseD 全站主題設定。
 *
 * 視覺基準：霧藍 #7B9FA6、暖木 #D4A574、米白 #FAFAF8，
 * 搭配柔和粉、綠、黃點綴。實際色值統一由 globals.css 與
 * tailwind.config.ts 的設計 token 管理，元件只使用語意化 class。
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  shadow: string;
  light: string;
  border: string;
}

export const ownerTheme: ThemeColors = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'bg-soft-green',
  gradient: 'japanese-gradient-header',
  shadow: 'shadow-primary/10',
  light: 'bg-soft-green',
  border: 'border-primary/20',
};

export const staffTheme: ThemeColors = {
  primary: 'text-primary',
  secondary: 'text-primary/80',
  accent: 'bg-primary/10',
  gradient: 'japanese-gradient-header japanese-gradient-header-staff',
  shadow: 'shadow-primary/10',
  light: 'bg-primary/18',
  border: 'border-primary/20',
};

export function getTheme(isStaff: boolean): ThemeColors {
  return isStaff ? staffTheme : ownerTheme;
}

export function getGradientClass(isStaff: boolean): string {
  return isStaff ? staffTheme.gradient : ownerTheme.gradient;
}

export function getPrimaryClass(_isStaff: boolean): string {
  return 'text-primary';
}

export function getPrimaryBgClass(_isStaff: boolean): string {
  return 'bg-primary';
}

export function getLightBgClass(isStaff: boolean): string {
  return isStaff ? 'bg-primary/10' : 'bg-soft-green';
}

export function getShadowClass(_isStaff: boolean): string {
  return 'shadow-primary/10';
}

export function getBorderClass(isStaff: boolean): string {
  return isStaff ? 'border-primary/15' : 'border-primary/20';
}
