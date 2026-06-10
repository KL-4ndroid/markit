/**
 * About Page - 關於頁面
 * 
 * 白名單路由：無需登入即可訪問
 */

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7B9FA6] to-[#9BB9C0] rounded-3xl shadow-xl mb-6">
            <span className="text-4xl">🎪</span>
          </div>
          <h1 className="text-3xl font-bold text-[#3A3A3A] mb-2">市集誌</h1>
          <p className="text-lg text-[#6B6B6B]">Market Pulse</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-[#3A3A3A] mb-3">關於我們</h2>
            <p className="text-[#6B6B6B] leading-relaxed">
              市集誌是專為市集攤販打造的數位管理系統，我們深知市集經營的辛苦與挑戰，
              因此致力於提供簡單、直覺、實用的工具，幫助攤販朋友們更輕鬆地管理生意。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#3A3A3A] mb-3">核心功能</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="font-semibold text-[#3A3A3A]">即時數據分析</h3>
                  <p className="text-[#6B6B6B] text-sm">掌握每日銷售趨勢，做出更明智的決策</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <h3 className="font-semibold text-[#3A3A3A]">團隊協作</h3>
                  <p className="text-[#6B6B6B] text-sm">員工管理與權限控制，輕鬆分工合作</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="font-semibold text-[#3A3A3A]">PWA 應用</h3>
                  <p className="text-[#6B6B6B] text-sm">可安裝到手機桌面，像原生 App 一樣使用</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h3 className="font-semibold text-[#3A3A3A]">本機儲存</h3>
                  <p className="text-[#6B6B6B] text-sm">資料保存在此裝置，登入後可同步到雲端備份</p>
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#3A3A3A] mb-3">技術架構</h2>
            <p className="text-[#6B6B6B] leading-relaxed">
              採用現代化的 Web 技術棧，包括 Next.js、Supabase、IndexedDB 等，
              確保應用的穩定性、安全性與效能。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#3A3A3A] mb-3">版本資訊</h2>
            <p className="text-[#6B6B6B] leading-relaxed">
              當前版本：v1.0.0<br />
              最後更新：2025 年 2 月
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-[#7B9FA6] hover:text-[#6A8E95] transition-colors"
          >
            ← 返回首頁
          </a>
        </div>
      </div>
    </div>
  );
}
