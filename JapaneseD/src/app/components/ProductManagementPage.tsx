import { Plus, Search } from "lucide-react";
import { useState } from "react";

export function ProductManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const products = [
    { id: 1, emoji: "🎨", name: "手繪明信片", price: 150, stock: 25, category: "文具" },
    { id: 2, emoji: "🧶", name: "手作毛線帽", price: 680, stock: 12, category: "服飾" },
    { id: 3, emoji: "📔", name: "布面筆記本", price: 320, stock: 18, category: "文具" },
    { id: 4, emoji: "🕯️", name: "香氛蠟燭", price: 450, stock: 20, category: "生活" },
    { id: 5, emoji: "🎒", name: "帆布小包", price: 850, stock: 8, category: "服飾" },
    { id: 6, emoji: "🍵", name: "手作茶杯", price: 580, stock: 15, category: "餐具" },
    { id: 7, emoji: "🌿", name: "乾燥花束", price: 380, stock: 22, category: "植物" },
    { id: 8, emoji: "🎭", name: "木質書籤", price: 120, stock: 30, category: "文具" },
    { id: 9, emoji: "🧵", name: "刺繡別針", price: 220, stock: 35, category: "飾品" },
    { id: 10, emoji: "🏮", name: "紙燈籠", price: 720, stock: 6, category: "燈飾" },
    { id: 11, emoji: "🎪", name: "拼布杯墊", price: 180, stock: 28, category: "生活" },
    { id: 12, emoji: "🎨", name: "水彩畫作", price: 1200, stock: 5, category: "藝術" },
  ];

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-white">商品管理</h1>
            <button className="bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors p-2.5 rounded-xl">
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="搜尋商品..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white rounded-2xl pl-11 pr-4 py-3 text-foreground placeholder:text-[#6B6B6B]/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Stats Summary */}
        <div className="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-primary/10 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-[#6B6B6B] mb-1">總商品</div>
              <div className="text-foreground text-xl tabular-nums">{products.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#6B6B6B] mb-1">總庫存</div>
              <div className="text-primary text-xl tabular-nums">
                {products.reduce((sum, p) => sum + p.stock, 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#6B6B6B] mb-1">總價值</div>
              <div className="text-secondary text-xl tabular-nums">
                ${products.reduce((sum, p) => sum + p.price * p.stock, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-[1.25rem] p-4 shadow-md shadow-primary/5 hover:shadow-lg transition-shadow cursor-pointer group"
            >
              {/* Product Emoji Icon */}
              <div className="bg-gradient-to-br from-[#F5E6E8] to-[#FFF8E7] rounded-2xl h-24 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <span className="text-5xl">{product.emoji}</span>
              </div>

              {/* Product Info */}
              <div className="space-y-2">
                <div>
                  <h4 className="text-foreground line-clamp-1 mb-1">{product.name}</h4>
                  <span className="inline-block bg-[#E8F3E8] text-foreground px-2 py-0.5 rounded-full text-xs">
                    {product.category}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-primary/10">
                  <div>
                    <div className="text-xs text-[#6B6B6B]">價格</div>
                    <div className="text-foreground tabular-nums">${product.price}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#6B6B6B]">庫存</div>
                    <div
                      className={`tabular-nums ${
                        product.stock < 10 ? "text-secondary" : "text-primary"
                      }`}
                    >
                      {product.stock}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-[#6B6B6B]">找不到符合的商品</p>
          </div>
        )}
      </div>
    </div>
  );
}
