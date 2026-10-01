import { User, Bell, Palette, FileText, HelpCircle, LogOut, ChevronRight } from "lucide-react";

export function SettingsPage() {
  const settingsSections = [
    {
      title: "帳戶設定",
      items: [
        { icon: User, label: "個人資料", color: "#7B9FA6" },
        { icon: Bell, label: "通知設定", color: "#D4A574" },
      ],
    },
    {
      title: "偏好設定",
      items: [
        { icon: Palette, label: "主題外觀", color: "#F5E6E8" },
        { icon: FileText, label: "匯出數據", color: "#E8F3E8" },
      ],
    },
    {
      title: "其他",
      items: [
        { icon: HelpCircle, label: "幫助中心", color: "#FFF8E7" },
        { icon: LogOut, label: "登出", color: "#d4183d" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <h1 className="text-white mb-4">設定</h1>
          
          {/* User Profile Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl">
              🎨
            </div>
            <div className="flex-1">
              <h3 className="text-white mb-1">手作工坊主</h3>
              <p className="text-white/70 text-sm">market@example.com</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Settings Sections */}
        <div className="space-y-6 mb-6">
          {settingsSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-white rounded-[1.5rem] p-5 shadow-md shadow-primary/5">
              <h3 className="text-foreground mb-3 px-2">{section.title}</h3>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={itemIndex}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-[#F5E6E8] transition-colors group"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${item.color}30` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: item.label === "登出" ? item.color : "#3A3A3A" }} />
                      </div>
                      <span className="flex-1 text-left text-foreground">{item.label}</span>
                      <ChevronRight className="w-5 h-5 text-[#6B6B6B] group-hover:translate-x-1 transition-transform" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* App Info */}
        <div className="text-center text-[#6B6B6B] text-sm space-y-1">
          <p>市集管理 v1.0.0</p>
          <p>© 2025 手作市集工作室</p>
        </div>
      </div>
    </div>
  );
}
