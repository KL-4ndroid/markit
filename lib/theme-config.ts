/**
 * 主題配置 — 出攤本 BoothBook VI 對齊版本
 *
 * 對應文件：docs/brand/VI_DESIGN_SYSTEM.md（2026-06-16）
 *
 * 色票對應（從「BoothBook」內部色票 → 「出攤本 BoothBook」對外品牌色）：
 *   霧藍  #7B9FA6 → 霧松綠  #6F8F86
 *   暖木  #D4A574 → 暖杏橘  #D9A66A
 *   米白  #FAFAF8 → 奶油米白 #F7F3EA
 *
 * 員工模式決策（2026-06-17）：
 *   原本員工使用紫灰 #8B7BA6 + 淺藍紫 #A6B4D4 + 淺紫 #F0E8F3
 *   VI 框架未指定員工變體，決策沿用主色 + 透明度區分（staff-tint），
 *   不再維護獨立紫灰色票，避免兩套品牌色並行。
 *
 * 所有 hex 已改為 Tailwind token class name，色值在 app/globals.css + tailwind.config.ts。
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
  primary: 'text-primary',                              // 霧松綠
  secondary: 'text-secondary',                          // 暖杏橘
  accent: 'bg-soft-green',                              // 淺綠
  gradient: 'bg-gradient-to-br from-primary to-secondary',
  shadow: 'shadow-primary/10',
  light: 'bg-soft-green',
  border: 'border-primary/20',
};

export const staffTheme: ThemeColors = {
  // 員工模式沿用主色，僅在背景以透明度區分（VI 框架未指定員工變體）
  primary: 'text-primary',
  secondary: 'text-primary/80',                         // 同色但略淡
  accent: 'bg-primary/10',                              // 主色 10% 透明
  gradient: 'bg-gradient-to-br from-primary/80 to-primary/60',
  shadow: 'shadow-primary/10',
  // ✅ TopNav 背景：員工模式用主色 18% 透明 + 模糊，遮住底下主畫面的奶油米白
  //   避免「半透明疊半透明」造成看起來像透明的問題
  light: 'bg-primary/18',
  border: 'border-primary/20',
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
    ? 'bg-gradient-to-br from-primary/80 to-primary/60'
    : 'bg-gradient-to-br from-primary to-secondary';
}

/**
 * 獲取主色調類名
 */
export function getPrimaryClass(isStaff: boolean): string {
  return 'text-primary';
}

/**
 * 獲取背景色類名
 */
export function getPrimaryBgClass(isStaff: boolean): string {
  return 'bg-primary';
}

/**
 * 獲取淺色背景類名
 */
export function getLightBgClass(isStaff: boolean): string {
  return isStaff ? 'bg-primary/10' : 'bg-soft-green';
}

/**
 * 獲取陰影類名
 */
export function getShadowClass(isStaff: boolean): string {
  return 'shadow-primary/10';
}

/**
 * 獲取邊框類名
 */
export function getBorderClass(isStaff: boolean): string {
  return isStaff ? 'border-primary/15' : 'border-primary/20';
}
