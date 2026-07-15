import type { Config } from "tailwindcss";

// Féria - 出攤筆記 — 視覺識別（VI）設計 token
// 文件：docs/brand/VI_DESIGN_SYSTEM.md
//
// 色票對應（依 VI 文件 4.1–4.6）：
//   霧松綠  #6F8F86  →  primary       (主色，舊 #7B9FA6 霧藍)
//   暖杏橘  #D9A66A  →  secondary     (次色，舊 #D4A574 暖木)
//   奶油米白 #F7F3EA →  background    (背景，舊 #FAFAF8)
//   墨灰黑  #2F3432  →  foreground    (文字主色)
//   淺霧灰  #E8E2D8  →  muted         (中性色，舊無)
//   深灰綠  #40504B  →  deep          (輔助深色，舊無)
//   乾燥玫瑰 #C7776E →  danger        (危險色，舊 #d4183d)
//   柔霧黃  #E5C46B  →  warn          (提醒色，舊 #FFF8E7 柔黃)
//   霧藍灰  #7E9AA0  →  info          (資訊色，舊無)
//
// CSS 變數定義在 app/globals.css，這裡用 rgb(var(--token) / <alpha-value>)
// 讓 tailwind 的 /10 / /20 / /30 透明度語法能繼續運作。
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主品牌色
        primary: "rgb(var(--brand-primary) / <alpha-value>)",
        secondary: "rgb(var(--brand-secondary) / <alpha-value>)",
        // 文字
        foreground: "rgb(var(--brand-foreground) / <alpha-value>)",
        'muted-foreground': "rgb(var(--brand-muted-foreground) / <alpha-value>)",
        // 背景 / 卡片
        background: "rgb(var(--brand-background) / <alpha-value>)",
        card: "rgb(var(--brand-card) / <alpha-value>)",
        // 中性
        muted: "rgb(var(--brand-muted) / <alpha-value>)",
        deep: "rgb(var(--brand-deep) / <alpha-value>)",
        // 柔色（保留）
        'soft-pink': "rgb(var(--brand-soft-pink) / <alpha-value>)",
        'soft-green': "rgb(var(--brand-soft-green) / <alpha-value>)",
        'soft-yellow': "rgb(var(--brand-soft-yellow) / <alpha-value>)",
        // 功能色
        danger: "rgb(var(--brand-danger) / <alpha-value>)",
        warn: "rgb(var(--brand-warn) / <alpha-value>)",
        info: "rgb(var(--brand-info) / <alpha-value>)",
        // 員工區分（沿用主色 + 透明度，不另設獨立色票）
        'staff-tint': "rgb(var(--brand-primary) / <alpha-value>)",

        // 階段一新增：商品分類柔色（從既有 hex 提煉）
        'cat-clothing': "rgb(var(--brand-cat-clothing) / <alpha-value>)",
        'cat-art': "rgb(var(--brand-cat-art) / <alpha-value>)",
        'cat-stationery': "rgb(var(--brand-cat-stationery) / <alpha-value>)",
        'cat-other': "rgb(var(--brand-cat-other) / <alpha-value>)",
        // 段階二新增：灰階替換 + 深綠強調（2026-07-13）
        'neutral-stripe': "rgb(var(--brand-neutral-stripe) / <alpha-value>)",
        'neutral-stripe-dark': "rgb(var(--brand-neutral-stripe-dark) / <alpha-value>)",
        'neutral-alt': "rgb(var(--brand-neutral-alt) / <alpha-value>)",
        'neutral-alt-warm': "rgb(var(--brand-neutral-alt-warm) / <alpha-value>)",
        'accent-green': "rgb(var(--brand-accent-green) / <alpha-value>)",
        // 段階三新增：細粒度灰階與強調色（2026-07-13）
        'border-hairline': "rgb(var(--brand-border-hairline) / <alpha-value>)",
        'cream-soft': "rgb(var(--brand-cream-soft) / <alpha-value>)",
        'cream-lighter': "rgb(var(--brand-cream-lighter) / <alpha-value>)",
        'warm-mist': "rgb(var(--brand-warm-mist) / <alpha-value>)",
        'accent-green-deep': "rgb(var(--brand-accent-green-deep) / <alpha-value>)",
        'mist-light': "rgb(var(--brand-mist-light) / <alpha-value>)",
        // 段階四新增：狀態語義色票（2026-07-14）
        'status-good-border': "rgb(var(--brand-status-good-border) / <alpha-value>)",
        'status-good-bg': "rgb(var(--brand-status-good-bg) / <alpha-value>)",
        'status-good-text': "rgb(var(--brand-status-good-text) / <alpha-value>)",
        'status-warn-border': "rgb(var(--brand-status-warn-border) / <alpha-value>)",
        'status-warn-bg': "rgb(var(--brand-status-warn-bg) / <alpha-value>)",
        'status-warn-text': "rgb(var(--brand-status-warn-text) / <alpha-value>)",
        'status-danger-border': "rgb(var(--brand-status-danger-border) / <alpha-value>)",
        'status-danger-bg': "rgb(var(--brand-status-danger-bg) / <alpha-value>)",
        'status-danger-text': "rgb(var(--brand-status-danger-text) / <alpha-value>)",
        'warning-border': "rgb(var(--brand-warning-border) / <alpha-value>)",
        'warning-bg': "rgb(var(--brand-warning-bg) / <alpha-value>)",
        'text-warm-deep': "rgb(var(--brand-text-warm-deep) / <alpha-value>)",
        gold: "rgb(var(--brand-gold) / <alpha-value>)",
        'gold-warm': "rgb(var(--brand-gold-warm) / <alpha-value>)",
        // Atelier visual pilot：今日／市集總覽／現場交易
        'atelier-canvas': "rgb(var(--atelier-canvas) / <alpha-value>)",
        'atelier-paper': "rgb(var(--atelier-paper) / <alpha-value>)",
        'atelier-ink': "rgb(var(--atelier-ink) / <alpha-value>)",
        'atelier-muted': "rgb(var(--atelier-muted) / <alpha-value>)",
        'atelier-line': "rgb(var(--atelier-line) / <alpha-value>)",
        'atelier-clay': "rgb(var(--atelier-clay) / <alpha-value>)",
        'atelier-blue': "rgb(var(--atelier-blue) / <alpha-value>)",
        'atelier-rose': "rgb(var(--atelier-rose) / <alpha-value>)",
        'atelier-sage-soft': "rgb(var(--atelier-sage-soft) / <alpha-value>)",
        'atelier-apricot-soft': "rgb(var(--atelier-apricot-soft) / <alpha-value>)",
        'atelier-blue-soft': "rgb(var(--atelier-blue-soft) / <alpha-value>)",
        'atelier-rose-soft': "rgb(var(--atelier-rose-soft) / <alpha-value>)",
        'atelier-sun': "rgb(var(--atelier-sun) / <alpha-value>)",
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        control: '0.5rem',
        card: '0.5rem',
        dialog: '0.75rem',
      },
      zIndex: {
        navigation: '50',
        overlay: '60',
        dialog: '70',
        critical: '80',
      },
      boxShadow: {
        atelier: 'var(--atelier-shadow)',
        'atelier-key': 'var(--atelier-key-shadow)',
        'atelier-lift': 'var(--atelier-lift-shadow)',
      },
    },
  },
  plugins: [],
};

export default config;
