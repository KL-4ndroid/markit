/**
 * Privacy Policy Page - 隱私政策頁面
 * 
 * 白名單路由：無需登入即可訪問
 */

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#3A3A3A] mb-8">隱私政策</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-[#3A3A3A] mb-3">資料收集</h2>
            <p className="text-[#6B6B6B] leading-relaxed">
              市集誌僅收集您主動提供的資料，包括註冊時的電子郵件地址、市集資料、銷售記錄等。
              我們不會收集任何與您業務無關的個人資訊。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#3A3A3A] mb-3">資料使用</h2>
            <p className="text-[#6B6B6B] leading-relaxed">
              您的資料僅用於提供服務功能，包括資料同步、統計分析、團隊協作等。
              我們不會將您的資料出售或分享給第三方。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#3A3A3A] mb-3">資料安全</h2>
            <p className="text-[#6B6B6B] leading-relaxed">
              我們使用業界標準的加密技術保護您的資料。所有資料傳輸均使用 HTTPS 加密，
              資料庫採用 Row Level Security (RLS) 確保資料隔離。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#3A3A3A] mb-3">離線資料</h2>
            <p className="text-[#6B6B6B] leading-relaxed">
              為了支援離線功能，我們會在您的裝置上儲存資料副本（使用 IndexedDB）。
              這些資料僅存在於您的裝置上，不會自動上傳到雲端。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#3A3A3A] mb-3">聯絡我們</h2>
            <p className="text-[#6B6B6B] leading-relaxed">
              如果您對隱私政策有任何疑問，請透過應用程式內的回饋功能聯絡我們。
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
