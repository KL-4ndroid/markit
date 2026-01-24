import { ArrowLeft, Clock, Users, DollarSign, TrendingUp, ShoppingCart } from "lucide-react";
import { useState } from "react";

interface MarketDetailPageProps {
  marketId: number;
  onBack: () => void;
}

export function MarketDetailPage({ marketId, onBack }: MarketDetailPageProps) {
  const [cartItems, setCartItems] = useState(0);
  const [stats, setStats] = useState({
    touches: 23,
    inquiries: 12,
    sales: 8,
    revenue: 12500,
  });

  const handleCustomerAction = (action: "touch" | "inquiry" | "sale") => {
    setStats((prev) => {
      const newStats = { ...prev };
      if (action === "touch") newStats.touches += 1;
      if (action === "inquiry") newStats.inquiries += 1;
      if (action === "sale") {
        newStats.sales += 1;
        newStats.revenue += 1500; // 假設平均金額
      }
      return newStats;
    });
  };

  const conversionRate = ((stats.sales / stats.touches) * 100).toFixed(1);
  const inquiryRate = ((stats.inquiries / stats.touches) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6">
        <div className="max-w-lg mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white mb-4 hover:gap-3 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </button>

          <h1 className="text-white mb-2">週末手作市集</h1>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Clock className="w-4 h-4" />
            <span>10:00 - 18:00 · 華山文創園區</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Status Card */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#3A3A3A]">營業狀態</h3>
            <span className="bg-[#E8F3E8] text-[#3A3A3A] px-3 py-1 rounded-full text-sm">
              進行中 🎪
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#F5E6E8] rounded-xl p-4">
              <div className="text-xs text-[#6B6B6B] mb-1">今日收入</div>
              <div className="text-[#3A3A3A] text-xl tabular-nums">
                ${stats.revenue.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#FFF8E7] rounded-xl p-4">
              <div className="text-xs text-[#6B6B6B] mb-1">成交數</div>
              <div className="text-[#3A3A3A] text-xl tabular-nums">{stats.sales}</div>
            </div>
          </div>
        </div>

        {/* Customer Interaction */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
          <h3 className="text-[#3A3A3A] mb-4">客戶互動</h3>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <button
              onClick={() => handleCustomerAction("touch")}
              className="bg-gradient-to-br from-[#F5E6E8] to-[#F5E6E8]/70 hover:from-[#F5E6E8]/90 hover:to-[#F5E6E8]/60 rounded-2xl p-5 transition-all hover:scale-105 active:scale-95"
            >
              <div className="text-3xl mb-2">🤲</div>
              <div className="text-[#3A3A3A] text-xs">觸摸商品</div>
            </button>

            <button
              onClick={() => handleCustomerAction("inquiry")}
              className="bg-gradient-to-br from-[#FFF8E7] to-[#FFF8E7]/70 hover:from-[#FFF8E7]/90 hover:to-[#FFF8E7]/60 rounded-2xl p-5 transition-all hover:scale-105 active:scale-95"
            >
              <div className="text-3xl mb-2">💬</div>
              <div className="text-[#3A3A3A] text-xs">詢問</div>
            </button>

            <button
              onClick={() => handleCustomerAction("sale")}
              className="bg-gradient-to-br from-[#E8F3E8] to-[#E8F3E8]/70 hover:from-[#E8F3E8]/90 hover:to-[#E8F3E8]/60 rounded-2xl p-5 transition-all hover:scale-105 active:scale-95"
            >
              <div className="text-3xl mb-2">✅</div>
              <div className="text-[#3A3A3A] text-xs">成交</div>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#7B9FA6]/10">
            <div className="text-center">
              <div className="text-[#6B6B6B] text-xs mb-1">觸摸</div>
              <div className="text-[#3A3A3A] tabular-nums">{stats.touches}</div>
            </div>
            <div className="text-center">
              <div className="text-[#6B6B6B] text-xs mb-1">詢問</div>
              <div className="text-[#3A3A3A] tabular-nums">{stats.inquiries}</div>
            </div>
            <div className="text-center">
              <div className="text-[#6B6B6B] text-xs mb-1">成交</div>
              <div className="text-[#7B9FA6] tabular-nums">{stats.sales}</div>
            </div>
          </div>
        </div>

        {/* Shopping Cart */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#7B9FA6] p-3 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-[#3A3A3A]">購物車</h4>
                <p className="text-[#6B6B6B] text-sm">{cartItems} 件商品</p>
              </div>
            </div>
            <button className="bg-[#7B9FA6] text-white px-5 py-2.5 rounded-xl hover:bg-[#6B8F96] transition-colors">
              結帳
            </button>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#D4A574]" />
            <h3 className="text-[#3A3A3A]">數據儀表板</h3>
          </div>

          <div className="space-y-4">
            {/* Conversion Funnel */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-[#6B6B6B]">轉換率</span>
                <span className="text-[#7B9FA6] tabular-nums">{conversionRate}%</span>
              </div>
              <div className="h-2 bg-[#F5E6E8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7B9FA6] to-[#D4A574] rounded-full transition-all"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-[#6B6B6B]">詢問率</span>
                <span className="text-[#D4A574] tabular-nums">{inquiryRate}%</span>
              </div>
              <div className="h-2 bg-[#FFF8E7] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D4A574] rounded-full transition-all"
                  style={{ width: `${inquiryRate}%` }}
                />
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-3">
              <div className="bg-[#F5E6E8] rounded-xl p-3 text-center">
                <Users className="w-4 h-4 text-[#7B9FA6] mx-auto mb-1" />
                <div className="text-xs text-[#6B6B6B]">客流</div>
                <div className="text-[#3A3A3A] tabular-nums">45人</div>
              </div>
              <div className="bg-[#E8F3E8] rounded-xl p-3 text-center">
                <DollarSign className="w-4 h-4 text-[#7B9FA6] mx-auto mb-1" />
                <div className="text-xs text-[#6B6B6B]">均價</div>
                <div className="text-[#3A3A3A] tabular-nums">$1,563</div>
              </div>
              <div className="bg-[#FFF8E7] rounded-xl p-3 text-center">
                <TrendingUp className="w-4 h-4 text-[#D4A574] mx-auto mb-1" />
                <div className="text-xs text-[#6B6B6B]">趨勢</div>
                <div className="text-[#3A3A3A] tabular-nums">↑ 12%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
