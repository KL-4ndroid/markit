/**
 * 主題配置
 * 
 * 根據用戶角色（老闆/員工）提供不同的配色方案
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
  primary: '#7B9FA6',      // 青綠色
  secondary: '#D4A574',    // 金棕色
  accent: '#E8F3E8',       // 淺綠
  gradient: 'from-[#7B9FA6] to-[#D4A574]',
  shadow: 'shadow-[#7B9FA6]/10',
  light: 'bg-[#E8F3E8]',
  border: 'border-[#7B9FA6]/20',
};

export const staffTheme: ThemeColors = {
  primary: '#8B7BA6',      // 紫灰色
  secondary: '#A6B4D4',    // 淺藍紫
  accent: '#F0E8F3',       // 淺紫
  gradient: 'from-[#8B7BA6] to-[#A6B4D4]',
  shadow: 'shadow-[#8B7BA6]/10',
  light: 'bg-[#F0E8F3]',
  border: 'border-[#8B7BA6]/20',
};

/**
 * 根據用戶角色獲取主題配色
 */
export function getTheme(isStaff: boolean): ThemeColors {
  return isStaff ? staffTheme : ownerTheme;
}

/**
 * 獲取漸變背景類名
 */
export function getGradientClass(isStaff: boolean): string {
  return isStaff 
    ? 'bg-gradient-to-br from-[#8B7BA6] to-[#A6B4D4]'
    : 'bg-gradient-to-br from-[#7B9FA6] to-[#D4A574]';
}

/**
 * 獲取主色調類名
 */
export function getPrimaryClass(isStaff: boolean): string {
  return isStaff ? 'text-[#8B7BA6]' : 'text-[#7B9FA6]';
}

/**
 * 獲取背景色類名
 */
export function getPrimaryBgClass(isStaff: boolean): string {
  return isStaff ? 'bg-[#8B7BA6]' : 'bg-[#7B9FA6]';
}

/**
 * 獲取淺色背景類名
 */
export function getLightBgClass(isStaff: boolean): string {
  return isStaff ? 'bg-[#F0E8F3]' : 'bg-[#E8F3E8]';
}

/**
 * 獲取陰影類名
 */
export function getShadowClass(isStaff: boolean): string {
  return isStaff ? 'shadow-[#8B7BA6]/10' : 'shadow-[#7B9FA6]/10';
}

/**
 * 獲取邊框類名
 */
export function getBorderClass(isStaff: boolean): string {
  return isStaff ? 'border-[#8B7BA6]/20' : 'border-[#7B9FA6]/20';
}
