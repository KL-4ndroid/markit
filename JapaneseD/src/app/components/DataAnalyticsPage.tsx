import { TrendingUp, DollarSign, Users, Package } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  FunnelChart,
  Funnel,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export function DataAnalyticsPage() {
  const revenueData = [
    { month: "7月", revenue: 12000, profit: 7500 },
    { month: "8月", revenue: 15000, profit: 9800 },
    { month: "9月", revenue: 13500, profit: 8900 },
    { month: "10月", revenue: 18000, profit: 12000 },
    { month: "11月", revenue: 16500, profit: 10800 },
    { month: "12月", revenue: 21000, profit: 14500 },
  ];

  const funnelData = [
    { name: "瀏覽", value: 450, fill: "#7B9FA6" },
    { name: "觸摸", value: 280, fill: "#D4A574" },
    { name: "詢問", value: 150, fill: "#F5E6E8" },
    { name: "成交", value: 85, fill: "#E8F3E8" },
  ];

  const categoryData = [
    { category: "文具", sales: 45 },
    { category: "服飾", sales: 32 },
    { category: "生活", sales: 28 },
    { category: "飾品", sales: 25 },
    { category: "藝術", sales: 18 },
  ];

  const summaryStats = [
    {
      icon: DollarSign,
      label: "總收入",
      value: "$96,000",
      change: "+23%",
      color: "from-primary to-primary/70",
    },
    {
      icon: TrendingUp,
      label: "平均利潤",
      value: "67.8%",
      change: "+5.2%",
      color: "from-secondary to-secondary/70",
    },
    {
      icon: Users,
      label: "總訪客",
      value: "1,248",
      change: "+18%",
      color: "from-[#F5E6E8] to-[#F5E6E8]/70",
    },
    {
      icon: Package,
      label: "銷售商品",
      value: "328",
      change: "+12%",
      color: "from-[#E8F3E8] to-[#E8F3E8]/70",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <h1 className="text-white mb-2">數據分析</h1>
          <p className="text-white/80 text-sm">過去 6 個月表現</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {summaryStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-[1.25rem] p-4 shadow-md shadow-primary/5"
              >
                <div
                  className={`bg-gradient-to-br ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}
                >
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="text-xs text-[#6B6B6B] mb-1">{stat.label}</div>
                <div className="text-foreground text-xl mb-1">{stat.value}</div>
                <div className="text-primary text-xs">{stat.change}</div>
              </div>
            );
          })}
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-foreground">收入趨勢</h3>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7B9FA6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7B9FA6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A574" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4A574" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#7B9FA6" opacity={0.1} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#6B6B6B", fontSize: 12 }}
                  axisLine={{ stroke: "#7B9FA6", opacity: 0.2 }}
                />
                <YAxis
                  tick={{ fill: "#6B6B6B", fontSize: 12 }}
                  axisLine={{ stroke: "#7B9FA6", opacity: 0.2 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(123, 159, 166, 0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7B9FA6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="收入"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#D4A574"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                  name="利潤"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-primary/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm text-[#6B6B6B]">收入</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary" />
              <span className="text-sm text-[#6B6B6B]">利潤</span>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 mb-6">
          <h3 className="text-foreground mb-4">轉換漏斗</h3>

          <div className="space-y-3">
            {funnelData.map((item, index) => {
              const percentage = ((item.value / funnelData[0].value) * 100).toFixed(1);
              return (
                <div key={item.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-foreground">{item.name}</span>
                    <span className="text-sm text-[#6B6B6B] tabular-nums">
                      {item.value} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-10 rounded-xl overflow-hidden" style={{ backgroundColor: item.fill }}>
                    <div
                      className="h-full bg-gradient-to-r from-white/20 to-transparent"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-primary/10 text-center">
            <span className="text-sm text-[#6B6B6B]">整體轉換率</span>
            <div className="text-2xl text-primary tabular-nums mt-1">
              {((funnelData[3].value / funnelData[0].value) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Category Sales */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 mb-6">
          <h3 className="text-foreground mb-4">商品類別銷售</h3>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#7B9FA6" opacity={0.1} />
                <XAxis
                  dataKey="category"
                  tick={{ fill: "#6B6B6B", fontSize: 12 }}
                  axisLine={{ stroke: "#7B9FA6", opacity: 0.2 }}
                />
                <YAxis
                  tick={{ fill: "#6B6B6B", fontSize: 12 }}
                  axisLine={{ stroke: "#7B9FA6", opacity: 0.2 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(123, 159, 166, 0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="sales" radius={[12, 12, 0, 0]} name="銷售數量">
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={["#7B9FA6", "#D4A574", "#F5E6E8", "#E8F3E8", "#FFF8E7"][index]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
