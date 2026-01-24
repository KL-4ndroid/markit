import { useState } from "react";
import { Navigation } from "./components/Navigation";
import { HomePage } from "./components/HomePage";
import { MarketDetailPage } from "./components/MarketDetailPage";
import { ProductManagementPage } from "./components/ProductManagementPage";
import { DataAnalyticsPage } from "./components/DataAnalyticsPage";
import { MarketListPage } from "./components/MarketListPage";
import { SettingsPage } from "./components/SettingsPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState<string>("home");
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedMarketId(null);
  };

  const handleNavigateToDetail = (marketId: number) => {
    setSelectedMarketId(marketId);
    setCurrentPage("detail");
  };

  const handleBackFromDetail = () => {
    setCurrentPage("home");
    setSelectedMarketId(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Page Content */}
      {currentPage === "home" && <HomePage onNavigateToDetail={handleNavigateToDetail} />}
      {currentPage === "detail" && selectedMarketId && (
        <MarketDetailPage marketId={selectedMarketId} onBack={handleBackFromDetail} />
      )}
      {currentPage === "list" && <MarketListPage onNavigateToDetail={handleNavigateToDetail} />}
      {currentPage === "products" && <ProductManagementPage />}
      {currentPage === "analytics" && <DataAnalyticsPage />}
      {currentPage === "settings" && <SettingsPage />}

      {/* Bottom Navigation */}
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
    </div>
  );
}
