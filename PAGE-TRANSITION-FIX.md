# 🎨 修復頁面切換閃爍問題

## 問題描述

在 PWA 手機端切換底部導航時，畫面會有明顯的閃爍感。

---

## 原因分析

### 1. Next.js 路由切換機制
- 卸載舊頁面 → 短暫白屏 → 載入新頁面
- 沒有過渡動畫，視覺上不連貫

### 2. 樣式重新計算
- CSS 重新應用導致視覺跳動
- 背景色閃爍

### 3. 渲染性能
- 沒有使用硬體加速
- 觸摸反饋延遲

---

## 解決方案

### 1. CSS 優化

#### 防止背景閃爍
```css
body {
  /* 保持最小高度，防止閃爍 */
  min-height: 100vh;
  position: relative;
}

/* 頁面切換時保持背景色 */
#__next,
[data-nextjs-scroll-focus-boundary] {
  background: var(--background);
}
```

#### 添加淡入動畫
```css
main {
  animation: fadeIn 0.2s ease-in-out;
  min-height: calc(100vh - 6rem);
  will-change: opacity;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

#### 硬體加速
```css
.hardware-accelerated {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
```

#### 優化觸摸反饋
```css
* {
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}
```

---

### 2. 組件優化

#### 底部導航添加硬體加速
```tsx
<nav className="hardware-accelerated">
  <Link className="hardware-accelerated">
    {/* 導航項目 */}
  </Link>
</nav>
```

---

### 3. 頁面過渡組件（可選）

創建了 `PageTransition.tsx` 組件，提供更平滑的過渡效果：

```tsx
<PageTransition>
  {children}
</PageTransition>
```

**特點**：
- 150ms 淡入淡出過渡
- 防止內容跳動
- 視覺連貫性

---

## 優化效果

### 修改前
```
點擊導航 → 白屏閃爍 → 新頁面突然出現
```

### 修改後
```
點擊導航 → 淡出 → 淡入新頁面 → 流暢過渡
```

---

## 性能優化

### 1. 硬體加速
- 使用 GPU 渲染
- 減少 CPU 負擔
- 動畫更流暢

### 2. will-change 屬性
```css
main {
  will-change: opacity;
}
```
- 提前告知瀏覽器將要變化的屬性
- 優化渲染性能

### 3. 觸摸優化
```css
-webkit-tap-highlight-color: transparent;
```
- 移除點擊高亮
- 更原生的體驗

---

## 測試建議

### 1. 在手機上測試
- 快速切換導航項目
- 觀察是否還有閃爍
- 檢查過渡是否流暢

### 2. 不同設備測試
- iOS Safari
- Android Chrome
- 不同性能的設備

### 3. 性能檢測
```javascript
// 在控制台執行
performance.mark('navigation-start');
// 點擊導航
performance.mark('navigation-end');
performance.measure('navigation', 'navigation-start', 'navigation-end');
console.log(performance.getEntriesByName('navigation'));
```

---

## 進階優化（可選）

### 1. 使用 View Transitions API

```tsx
// 在 layout.tsx 中
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function ViewTransition({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        // 頁面切換
      });
    }
  }, [pathname]);

  return children;
}
```

**注意**：View Transitions API 目前瀏覽器支援有限。

---

### 2. 預渲染優化

```tsx
// 預載所有主要頁面的數據
useEffect(() => {
  const routes = ['/markets', '/products', '/analytics', '/settings'];
  routes.forEach(route => {
    router.prefetch(route);
  });
}, []);
```

---

### 3. 骨架屏優化

確保 loading.tsx 立即顯示：

```tsx
// app/loading.tsx
export default function Loading() {
  return (
    <div className="animate-in fade-in duration-200">
      {/* 骨架屏內容 */}
    </div>
  );
}
```

---

## 常見問題

### Q1: 還是有輕微閃爍？

**可能原因**：
- 圖片載入延遲
- 字體載入延遲
- 數據獲取延遲

**解決方法**：
```tsx
// 預載圖片
<link rel="preload" as="image" href="/logo.png" />

// 預載字體
<link rel="preload" as="font" href="/fonts/font.woff2" />
```

---

### Q2: 動畫太慢或太快？

調整動畫時長：

```css
/* 更快 */
main {
  animation: fadeIn 0.15s ease-in-out;
}

/* 更慢 */
main {
  animation: fadeIn 0.3s ease-in-out;
}
```

---

### Q3: 某些頁面還是卡頓？

檢查該頁面的：
- 數據獲取邏輯
- 組件渲染性能
- 是否有大量計算

---

## 總結

通過以下優化，頁面切換閃爍問題應該得到明顯改善：

1. ✅ CSS 淡入動畫
2. ✅ 硬體加速
3. ✅ 背景色保持
4. ✅ 觸摸優化
5. ✅ 路由預載

**預期效果**：流暢、無閃爍的頁面切換體驗！🎉
