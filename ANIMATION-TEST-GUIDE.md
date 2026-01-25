# 🧪 頁面切換動畫測試指南

## 如何驗證動畫效果

### 方法 1：在瀏覽器開發者工具中測試

1. **打開 Chrome DevTools**
   - 按 F12 或右鍵 → 檢查

2. **切換到 Performance 標籤**
   - 點擊錄製按鈕
   - 快速切換幾個導航項目
   - 停止錄製
   - 查看動畫幀率

3. **檢查 CSS 動畫**
   - 切換到 Elements 標籤
   - 選中 `<main>` 元素
   - 查看 Computed 樣式
   - 確認有 `animation` 屬性

### 方法 2：使用動畫檢測工具

在瀏覽器控制台執行：

```javascript
// 檢測動畫是否存在
const main = document.querySelector('main');
const styles = window.getComputedStyle(main);
console.log('Animation:', styles.animation);
console.log('Will-change:', styles.willChange);
console.log('Transform:', styles.transform);
console.log('Backface-visibility:', styles.backfaceVisibility);

// 監聽動畫事件
main.addEventListener('animationstart', (e) => {
  console.log('✅ 動畫開始:', e.animationName);
});

main.addEventListener('animationend', (e) => {
  console.log('✅ 動畫結束:', e.animationName);
});
```

### 方法 3：視覺測試

1. **慢動作測試**
   - 在 Chrome DevTools → More tools → Rendering
   - 勾選 "Emulate CSS media feature prefers-reduced-motion"
   - 或在控制台執行：
   ```javascript
   // 放慢動畫 10 倍
   document.documentElement.style.setProperty('--animation-speed', '10');
   ```

2. **添加臨時樣式**
   ```javascript
   // 讓動畫更明顯（測試用）
   const style = document.createElement('style');
   style.textContent = `
     main.page-transition {
       animation: pageEnter 1s cubic-bezier(0.4, 0, 0.2, 1) !important;
     }
     @keyframes pageEnter {
       0% {
         opacity: 0;
         transform: translateZ(0) translateY(50px) scale(0.9);
       }
       100% {
         opacity: 1;
         transform: translateZ(0) translateY(0) scale(1);
       }
     }
   `;
   document.head.appendChild(style);
   ```

### 方法 4：檢查硬體加速

```javascript
// 檢查是否使用 GPU 渲染
const main = document.querySelector('main');
const styles = window.getComputedStyle(main);

console.log('硬體加速檢查:');
console.log('- Transform:', styles.transform !== 'none' ? '✅' : '❌');
console.log('- Backface-visibility:', styles.backfaceVisibility === 'hidden' ? '✅' : '❌');
console.log('- Will-change:', styles.willChange !== 'auto' ? '✅' : '❌');

// 檢查是否使用合成層
if (window.chrome && chrome.gpuBenchmarking) {
  console.log('- 合成層:', chrome.gpuBenchmarking.hasGpuChannel() ? '✅' : '❌');
}
```

---

## 預期效果

### ✅ 正常情況
- 點擊導航 → 頁面淡出並向上滑動 8px → 新頁面淡入並滑回原位
- 動畫時長：250ms
- 無白屏閃爍
- 流暢不卡頓

### ❌ 異常情況
- 沒有動畫效果
- 白屏閃爍
- 動畫卡頓
- 頁面跳動

---

## 故障排除

### 問題 1：看不到動畫

**檢查 1：CSS 是否載入**
```javascript
// 檢查 globals.css 是否載入
const sheets = Array.from(document.styleSheets);
const hasAnimation = sheets.some(sheet => {
  try {
    const rules = Array.from(sheet.cssRules || []);
    return rules.some(rule => 
      rule.cssText && rule.cssText.includes('pageEnter')
    );
  } catch (e) {
    return false;
  }
});
console.log('動畫 CSS 已載入:', hasAnimation ? '✅' : '❌');
```

**檢查 2：main 元素是否有正確的 class**
```javascript
const main = document.querySelector('main');
console.log('Main classes:', main.className);
console.log('Has page-transition:', main.classList.contains('page-transition') ? '✅' : '❌');
```

**檢查 3：動畫是否被覆蓋**
```javascript
const main = document.querySelector('main');
const styles = window.getComputedStyle(main);
console.log('Animation name:', styles.animationName);
console.log('Animation duration:', styles.animationDuration);
```

### 問題 2：動畫太快看不清

**臨時放慢動畫**
```javascript
// 在控制台執行
const style = document.createElement('style');
style.id = 'slow-animation';
style.textContent = `
  main.page-transition {
    animation-duration: 2s !important;
  }
`;
document.head.appendChild(style);

// 恢復正常速度
document.getElementById('slow-animation')?.remove();
```

### 問題 3：還是有閃爍

**檢查背景色**
```javascript
const body = document.body;
const main = document.querySelector('main');
const next = document.getElementById('__next');

console.log('Body background:', window.getComputedStyle(body).background);
console.log('Main background:', window.getComputedStyle(main).background);
console.log('Next background:', window.getComputedStyle(next).background);
```

**強制設置背景色**
```javascript
document.body.style.background = '#FAFAF8';
document.getElementById('__next').style.background = '#FAFAF8';
```

---

## 性能測試

### 測試 FPS

```javascript
let lastTime = performance.now();
let frames = 0;
let fps = 0;

function measureFPS() {
  const now = performance.now();
  frames++;
  
  if (now >= lastTime + 1000) {
    fps = Math.round((frames * 1000) / (now - lastTime));
    console.log('FPS:', fps);
    frames = 0;
    lastTime = now;
  }
  
  requestAnimationFrame(measureFPS);
}

measureFPS();
```

**預期結果**：
- 桌面：60 FPS
- 手機：30-60 FPS

### 測試動畫性能

```javascript
// 監控動畫性能
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('pageEnter')) {
      console.log('動畫性能:', {
        duration: entry.duration,
        startTime: entry.startTime,
      });
    }
  }
});

observer.observe({ entryTypes: ['measure'] });
```

---

## 手機測試

### iOS Safari
1. 連接 Mac 電腦
2. Safari → 開發 → [你的 iPhone] → [網頁]
3. 使用 Web Inspector 檢查

### Android Chrome
1. 啟用 USB 調試
2. Chrome → chrome://inspect
3. 選擇你的設備和頁面

### 遠程調試工具
```javascript
// 在手機上顯示 FPS
const fpsDisplay = document.createElement('div');
fpsDisplay.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  z-index: 99999;
  font-family: monospace;
`;
document.body.appendChild(fpsDisplay);

let lastTime = performance.now();
let frames = 0;

function updateFPS() {
  const now = performance.now();
  frames++;
  
  if (now >= lastTime + 1000) {
    const fps = Math.round((frames * 1000) / (now - lastTime));
    fpsDisplay.textContent = `FPS: ${fps}`;
    frames = 0;
    lastTime = now;
  }
  
  requestAnimationFrame(updateFPS);
}

updateFPS();
```

---

## 總結

如果所有檢查都通過：
- ✅ CSS 動畫已載入
- ✅ main 元素有 page-transition class
- ✅ 硬體加速已啟用
- ✅ FPS 穩定在 30-60
- ✅ 無背景閃爍

那麼動畫應該正常工作！如果還是看不到效果，可能是：
1. 瀏覽器快取問題（強制重新整理）
2. Vercel 部署延遲（等待幾分鐘）
3. 動畫太快（放慢測試）
