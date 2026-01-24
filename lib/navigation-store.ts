/**
 * 全局導航列狀態管理
 * 用於控制底部導航列的顯示/隱藏
 */

type NavigationListener = (isVisible: boolean) => void;

class NavigationStore {
  private listeners: Set<NavigationListener> = new Set();
  private isVisible: boolean = true;

  subscribe(listener: NavigationListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setVisible(visible: boolean) {
    this.isVisible = visible;
    this.listeners.forEach(listener => listener(visible));
  }

  getVisible() {
    return this.isVisible;
  }
}

export const navigationStore = new NavigationStore();

// 便捷函數
export const hideNavigation = () => navigationStore.setVisible(false);
export const showNavigation = () => navigationStore.setVisible(true);
