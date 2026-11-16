import { APP_METADATA } from '@/lib/app-metadata';
import { APP_BRAND } from '@/lib/app-brand';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-primary/15 bg-atelier-paper shadow-atelier-lift">
            {/* eslint-disable-next-line @next/next/no-img-element -- PWA icon 已是預優化小圖，不需要 next/image 額外處理 */}
            <img
              src="/icons/icon-192x192.png"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{APP_BRAND.name}</h1>
          <p lang="en" className="text-xs tracking-widest text-muted-foreground">{APP_BRAND.englishName}</p>
          <p className="mt-3 text-lg text-muted-foreground">{APP_BRAND.positioning}</p>
          <p className="mt-1 text-sm text-muted-foreground">{APP_BRAND.tagline}</p>
        </div>
        
        <div className="japanese-surface-card space-y-6 p-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">關於{APP_BRAND.name}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {APP_BRAND.description}
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              不論是手作文創品牌、固定夜市攤位、餐車，還是固定與流動場次交錯的攤主，都能回頭看看哪裡值得再去、什麼賣得最好，以及這段時間的生意是怎麼一路走過來的。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">核心功能</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="font-semibold text-foreground">即時數據分析</h3>
                  <p className="text-muted-foreground text-sm">掌握每日銷售趨勢，做出更明智的決策</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <h3 className="font-semibold text-foreground">團隊協作</h3>
                  <p className="text-muted-foreground text-sm">員工管理與權限控制，輕鬆分工合作</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="font-semibold text-foreground">PWA 應用</h3>
                  <p className="text-muted-foreground text-sm">可安裝到手機桌面，像原生 App 一樣使用</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h3 className="font-semibold text-foreground">離線暫存</h3>
                  <p className="text-muted-foreground text-sm">雲端是登入帳號的主要可信來源，裝置端支援離線操作與快速存取</p>
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">版本資訊</h2>
            <p className="text-muted-foreground leading-relaxed">
              當前版本：v{APP_METADATA.versionLabel}<br />
              最後更新：{APP_METADATA.lastUpdatedLabel}
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/settings/app"
            className="text-primary hover:text-primary/85 transition-colors"
          >
            ← 返回 App 與版本
          </a>
        </div>
      </div>
    </div>
  );
}
