import { Calendar, MapPin, TrendingUp, ArrowRight } from "lucide-react";

interface HomePageProps {
  onNavigateToDetail: (marketId: number) => void;
}

export function HomePage({ onNavigateToDetail }: HomePageProps) {
  const todayMarket = {
    id: 1,
    name: "週末手作市集",
    date: "2025年12月28日",
    time: "10:00 - 18:00",
    location: "華山文創園區",
    status: "進行中",
    revenue: 12500,
    profit: 8300,
    visitors: 45,
  };

  const upcomingMarkets = [
    {
      id: 2,
      name: "新年文創市集",
      date: "2026年1月4日",
      location: "松山文創園區",
      expectedRevenue: 15000,
    },
    {
      id: 3,
      name: "春季手作展",
      date: "2026年1月11日",
      location: "駁二藝術特區",
      expectedRevenue: 18000,
    },
    {
      id: 4,
      name: "藝術工坊日",
      date: "2026年1月18日",
      location: "審計新村",
      expectedRevenue: 13000,
    },
    {
      id: 5,
      name: "文青市集",
      date: "2026年1月25日",
      location: "赤峰街",
      expectedRevenue: 16000,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-white opacity-90">早安！</h1>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full">
              <span className="text-white text-sm">12月28日</span>
            </div>
          </div>
          <p className="text-white/80 text-sm">今天也要加油哦 ✨</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Today's Market Card */}
        <div
          onClick={() => onNavigateToDetail(todayMarket.id)}
          className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 cursor-pointer hover:shadow-xl transition-shadow mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground">{todayMarket.name}</h2>
            <span className="bg-[#E8F3E8] text-foreground px-3 py-1 rounded-full text-sm">
              {todayMarket.status} 🎪
            </span>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-2 text-[#6B6B6B]">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm">{todayMarket.date} · {todayMarket.time}</span>
            </div>
            <div className="flex items-center gap-2 text-[#6B6B6B]">
              <MapPin className="w-4 h-4 text-secondary" />
              <span className="text-sm">{todayMarket.location}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-primary/10">
            <div className="text-center">
              <div className="text-xs text-[#6B6B6B] mb-1">收入</div>
              <div className="text-foreground tabular-nums">
                ${todayMarket.revenue.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#6B6B6B] mb-1">利潤</div>
              <div className="text-primary tabular-nums">
                ${todayMarket.profit.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#6B6B6B] mb-1">訪客</div>
              <div className="text-foreground tabular-nums">{todayMarket.visitors}人</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center text-primary text-sm gap-1">
            查看詳情 <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Upcoming Markets Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-secondary" />
            <h3 className="text-foreground">即將到來</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {upcomingMarkets.map((market) => (
              <div
                key={market.id}
                onClick={() => onNavigateToDetail(market.id)}
                className="bg-white rounded-[1.25rem] p-4 shadow-md shadow-primary/5 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="mb-3">
                  <h4 className="text-foreground mb-2 line-clamp-2 min-h-[3rem]">
                    {market.name}
                  </h4>
                  <div className="flex items-start gap-1.5 text-xs text-[#6B6B6B] mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{market.date}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-[#6B6B6B]">
                    <MapPin className="w-3.5 h-3.5 text-secondary mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{market.location}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-primary/10">
                  <div className="text-xs text-[#6B6B6B] mb-0.5">預估收入</div>
                  <div className="text-foreground tabular-nums">
                    ${market.expectedRevenue.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
