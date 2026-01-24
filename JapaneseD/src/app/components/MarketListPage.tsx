import { Calendar, MapPin, DollarSign, TrendingUp, Filter } from "lucide-react";

interface MarketListPageProps {
  onNavigateToDetail: (marketId: number) => void;
}

export function MarketListPage({ onNavigateToDetail }: MarketListPageProps) {
  const markets = [
    {
      id: 1,
      name: "週末手作市集",
      date: "2025年12月28日",
      location: "華山文創園區",
      status: "進行中",
      revenue: 12500,
      profit: 8300,
      profitRate: 66.4,
    },
    {
      id: 2,
      name: "冬季暖心市集",
      date: "2025年12月21日",
      location: "松山文創園區",
      status: "已結束",
      revenue: 18500,
      profit: 12800,
      profitRate: 69.2,
    },
    {
      id: 3,
      name: "聖誕手作展",
      date: "2025年12月14日",
      location: "駁二藝術特區",
      status: "已結束",
      revenue: 21000,
      profit: 14500,
      profitRate: 69.0,
    },
    {
      id: 4,
      name: "文創小物展",
      date: "2025年12月7日",
      location: "審計新村",
      status: "已結束",
      revenue: 15800,
      profit: 10200,
      profitRate: 64.6,
    },
    {
      id: 5,
      name: "秋日手作市集",
      date: "2025年11月30日",
      location: "赤峰街",
      status: "已結束",
      revenue: 16500,
      profit: 11000,
      profitRate: 66.7,
    },
    {
      id: 6,
      name: "週末藝術展",
      date: "2025年11月23日",
      location: "華山文創園區",
      status: "已結束",
      revenue: 13200,
      profit: 8500,
      profitRate: 64.4,
    },
  ];

  const totalRevenue = markets.reduce((sum, m) => sum + m.revenue, 0);
  const totalProfit = markets.reduce((sum, m) => sum + m.profit, 0);
  const avgProfitRate = (totalProfit / totalRevenue * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-white">市集列表</h1>
            <button className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors p-2.5 rounded-xl">
              <Filter className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-xs text-white/70 mb-1">總場次</div>
                <div className="text-white text-xl tabular-nums">{markets.length}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-white/70 mb-1">總收入</div>
                <div className="text-white text-xl tabular-nums">
                  ${(totalRevenue / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-white/70 mb-1">平均利潤率</div>
                <div className="text-white text-xl tabular-nums">{avgProfitRate}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Markets List */}
        <div className="space-y-4 mb-6">
          {markets.map((market) => (
            <div
              key={market.id}
              onClick={() => onNavigateToDetail(market.id)}
              className="bg-white rounded-[1.5rem] p-5 shadow-md shadow-[#7B9FA6]/5 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-[#3A3A3A] mb-2">{market.name}</h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[#6B6B6B] text-sm">
                      <Calendar className="w-4 h-4 text-[#7B9FA6]" />
                      <span>{market.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#6B6B6B] text-sm">
                      <MapPin className="w-4 h-4 text-[#D4A574]" />
                      <span>{market.location}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                    market.status === "進行中"
                      ? "bg-[#E8F3E8] text-[#3A3A3A]"
                      : "bg-[#F5E6E8] text-[#6B6B6B]"
                  }`}
                >
                  {market.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#7B9FA6]/10">
                <div>
                  <div className="flex items-center gap-1 text-xs text-[#6B6B6B] mb-1">
                    <DollarSign className="w-3 h-3" />
                    <span>收入</span>
                  </div>
                  <div className="text-[#3A3A3A] tabular-nums">
                    ${market.revenue.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs text-[#6B6B6B] mb-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>利潤</span>
                  </div>
                  <div className="text-[#7B9FA6] tabular-nums">
                    ${market.profit.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#6B6B6B] mb-1">利潤率</div>
                  <div className="text-[#D4A574] tabular-nums">{market.profitRate}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
