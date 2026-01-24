import { Plus, ListOrdered, Package, TrendingUp, Settings } from "lucide-react";

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const navItems = [
    { id: "home", icon: Plus, label: "新增" },
    { id: "list", icon: ListOrdered, label: "列表" },
    { id: "products", icon: Package, label: "商品" },
    { id: "analytics", icon: TrendingUp, label: "分析" },
    { id: "settings", icon: Settings, label: "設定" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#7B9FA6]/20 px-4 py-3 safe-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-1 min-w-[60px] transition-all"
            >
              <div
                className={`p-2.5 rounded-2xl transition-all ${
                  isActive
                    ? "bg-[#7B9FA6] text-white scale-110"
                    : "bg-transparent text-[#6B6B6B] hover:bg-[#F5E6E8]"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-xs transition-colors ${
                  isActive ? "text-[#7B9FA6]" : "text-[#6B6B6B]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
