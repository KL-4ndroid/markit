'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, RotateCcw, Settings, Zap } from 'lucide-react';

/**
 * 閃爍測試調試頁面
 * 
 * 功能：
 * - 實時調整動畫參數
 * - 模擬頁面切換
 * - 視覺化閃爍效果
 * - 導出最佳參數
 */
export default function FlickerTestPage() {
  const router = useRouter();

  // 動畫參數
  const [slideDistance, setSlideDistance] = useState(20); // %
  const [slideOpacity, setSlideOpacity] = useState(0.5);
  const [slideDuration, setSlideDuration] = useState(200); // ms
  const [fadeOpacity, setFadeOpacity] = useState(0.8);
  const [fadeDuration, setFadeDuration] = useState(100); // ms

  // 測試狀態
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState<'slide-right' | 'slide-left' | 'fade'>('slide-right');
  const [testCount, setTestCount] = useState(0);
  const [showContent, setShowContent] = useState(true);

  // 內容類型
  const [contentType, setContentType] = useState<'text' | 'cards' | 'mixed'>('mixed');

  // 背景色（使用 CSS 變數以對齊 VI token：奶油米白 rgb(var(--brand-background))）
  const [backgroundColor, setBackgroundColor] = useState('rgb(var(--brand-background))');

  // 應用動畫樣式
  const getAnimationStyle = () => {
    if (!isAnimating) return {};

    const baseStyle = {
      willChange: 'transform, opacity',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden' as const,
      backgroundColor,
    };

    if (animationType === 'slide-right') {
      return {
        ...baseStyle,
        animation: `slideFromRight ${slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      };
    } else if (animationType === 'slide-left') {
      return {
        ...baseStyle,
        animation: `slideFromLeft ${slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      };
    } else {
      return {
        ...baseStyle,
        animation: `fadeIn ${fadeDuration}ms ease-out`,
      };
    }
  };

  // 執行測試
  const runTest = () => {
    setShowContent(false);
    setIsAnimating(false);
    
    setTimeout(() => {
      setShowContent(true);
      setIsAnimating(true);
      setTestCount(prev => prev + 1);
      
      setTimeout(() => {
        setIsAnimating(false);
      }, Math.max(slideDuration, fadeDuration) + 100);
    }, 50);
  };

  // 重置參數
  const resetParams = () => {
    setSlideDistance(20);
    setSlideOpacity(0.5);
    setSlideDuration(200);
    setFadeOpacity(0.8);
    setFadeDuration(100);
    setBackgroundColor('rgb(var(--brand-background))');
  };

  // 導出參數
  const exportParams = () => {
    const params = {
      slideDistance,
      slideOpacity,
      slideDuration,
      fadeOpacity,
      fadeDuration,
      backgroundColor,
    };
    
    const css = `
/* 滑動動畫參數 */
@keyframes slideFromRight {
  from {
    transform: translateX(${slideDistance}%);
    opacity: ${slideOpacity};
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideFromLeft {
  from {
    transform: translateX(-${slideDistance}%);
    opacity: ${slideOpacity};
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.slide-from-right {
  animation: slideFromRight ${slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-from-left {
  animation: slideFromLeft ${slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 淡入動畫參數 */
@keyframes fadeIn {
  from {
    opacity: ${fadeOpacity};
  }
  to {
    opacity: 1;
  }
}

.fade-in {
  animation: fadeIn ${fadeDuration}ms ease-out;
}

/* 背景色 */
.page-transition {
  background-color: ${backgroundColor};
}
`;

    // 複製到剪貼簿
    navigator.clipboard.writeText(css).then(() => {
      alert('✅ CSS 參數已複製到剪貼簿！\n\n可以直接貼到 globals.css 中使用。');
    });
  };

  // 渲染測試內容
  const renderContent = () => {
    if (!showContent) return null;

    if (contentType === 'text') {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">測試標題</h2>
          <p className="text-muted-foreground">這是一段測試文字，用於觀察閃爍效果。</p>
          <p className="text-muted-foreground">請仔細觀察動畫過程中是否有明顯的閃爍或跳動。</p>
        </div>
      );
    }

    if (contentType === 'cards') {
      return (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="text-2xl mb-2">📦</div>
              <div className="text-sm font-medium text-foreground">卡片 {i}</div>
              <div className="text-xs text-muted-foreground mt-1">測試內容</div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold mb-2">混合內容測試</h2>
          <p className="text-sm opacity-90">包含漸層背景、文字和卡片</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-lg">
              <div className="text-xl mb-1">🎪</div>
              <div className="text-sm font-medium text-foreground">項目 {i}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">總收入</span>
            <span className="text-2xl font-bold text-primary">NT$ 12,345</span>
          </div>
          <div className="h-2 bg-soft-green rounded-full overflow-hidden">
            <div className="h-full bg-primary w-3/4"></div>
          </div>
        </div>
      </div>
    );
  };

  // 動態生成 CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes slideFromRight {
        from {
          transform: translateX(${slideDistance}%);
          opacity: ${slideOpacity};
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideFromLeft {
        from {
          transform: translateX(-${slideDistance}%);
          opacity: ${slideOpacity};
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: ${fadeOpacity};
        }
        to {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [slideDistance, slideOpacity, fadeDuration, fadeOpacity]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-medium text-white opacity-90">
                閃爍測試調試工具
              </h1>
              <p className="text-white/80 text-sm mt-1">
                實時調整動畫參數，找出最佳配置 🔧
              </p>
            </div>
          </div>

          {/* 測試計數 */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 inline-block">
            <span className="text-white text-sm">
              已測試 <span className="font-bold text-lg">{testCount}</span> 次
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：控制面板 */}
          <div className="space-y-4">
            {/* 動畫類型選擇 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium text-foreground">動畫類型</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setAnimationType('slide-right')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    animationType === 'slide-right'
                      ? 'bg-primary text-white'
                      : 'bg-soft-pink text-foreground'
                  }`}
                >
                  從右滑入
                </button>
                <button
                  onClick={() => setAnimationType('slide-left')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    animationType === 'slide-left'
                      ? 'bg-primary text-white'
                      : 'bg-soft-pink text-foreground'
                  }`}
                >
                  從左滑入
                </button>
                <button
                  onClick={() => setAnimationType('fade')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    animationType === 'fade'
                      ? 'bg-primary text-white'
                      : 'bg-soft-pink text-foreground'
                  }`}
                >
                  淡入
                </button>
              </div>
            </div>

            {/* 滑動動畫參數 */}
            {(animationType === 'slide-right' || animationType === 'slide-left') && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-medium text-foreground mb-4">滑動動畫參數</h3>
                
                <div className="space-y-4">
                  {/* 滑動距離 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm text-muted-foreground">滑動距離</label>
                      <span className="text-sm font-medium text-primary">{slideDistance}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={slideDistance}
                      onChange={(e) => setSlideDistance(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* 起始透明度 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm text-muted-foreground">起始透明度</label>
                      <span className="text-sm font-medium text-primary">{slideOpacity.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={slideOpacity}
                      onChange={(e) => setSlideOpacity(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0 (完全透明)</span>
                      <span>0.5</span>
                      <span>1 (不透明)</span>
                    </div>
                  </div>

                  {/* 動畫時長 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm text-muted-foreground">動畫時長</label>
                      <span className="text-sm font-medium text-primary">{slideDuration}ms</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={slideDuration}
                      onChange={(e) => setSlideDuration(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>50ms</span>
                      <span>250ms</span>
                      <span>500ms</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 淡入動畫參數 */}
            {animationType === 'fade' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-medium text-foreground mb-4">淡入動畫參數</h3>
                
                <div className="space-y-4">
                  {/* 起始透明度 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm text-muted-foreground">起始透明度</label>
                      <span className="text-sm font-medium text-primary">{fadeOpacity.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={fadeOpacity}
                      onChange={(e) => setFadeOpacity(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0 (完全透明)</span>
                      <span>0.5</span>
                      <span>1 (不透明)</span>
                    </div>
                  </div>

                  {/* 動畫時長 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm text-muted-foreground">動畫時長</label>
                      <span className="text-sm font-medium text-primary">{fadeDuration}ms</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={fadeDuration}
                      onChange={(e) => setFadeDuration(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>50ms</span>
                      <span>250ms</span>
                      <span>500ms</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 其他設定 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium text-foreground">其他設定</h3>
              </div>
              
              <div className="space-y-4">
                {/* 內容類型 */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">測試內容</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setContentType('text')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        contentType === 'text'
                          ? 'bg-primary text-white'
                          : 'bg-soft-pink text-foreground'
                      }`}
                    >
                      純文字
                    </button>
                    <button
                      onClick={() => setContentType('cards')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        contentType === 'cards'
                          ? 'bg-primary text-white'
                          : 'bg-soft-pink text-foreground'
                      }`}
                    >
                      卡片
                    </button>
                    <button
                      onClick={() => setContentType('mixed')}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        contentType === 'mixed'
                          ? 'bg-primary text-white'
                          : 'bg-soft-pink text-foreground'
                      }`}
                    >
                      混合
                    </button>
                  </div>
                </div>

                {/* 背景色 */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">背景顏色</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1 px-3 py-2 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={runTest}
                className="col-span-2 px-6 py-4 rounded-2xl bg-primary text-white hover:bg-primary/85 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                執行測試
              </button>
              <button
                onClick={resetParams}
                className="px-6 py-4 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={exportParams}
              className="w-full px-6 py-4 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white hover:opacity-90 transition-opacity font-medium"
            >
              📋 複製 CSS 參數
            </button>
          </div>

          {/* 右側：預覽區域 */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">預覽區域</h3>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isAnimating 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {isAnimating ? '動畫中' : '靜止'}
                </div>
              </div>

              {/* 預覽內容 */}
              <div 
                className="min-h-[400px] rounded-xl p-6"
                style={{
                  ...getAnimationStyle(),
                  backgroundColor: backgroundColor,
                }}
              >
                {renderContent()}
              </div>

              {/* 提示 */}
              <div className="mt-4 p-4 bg-soft-yellow rounded-xl">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>觀察重點：</strong>
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>• 動畫開始時是否有白屏閃爍？</li>
                  <li>• 內容是否平滑出現？</li>
                  <li>• 是否有跳動或抖動？</li>
                  <li>• 整體視覺是否流暢？</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
