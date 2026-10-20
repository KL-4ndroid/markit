/**
 * 全局導航列狀態管理
 * 用於控制底部導航列的顯示/隱藏
 */

type NavigationListener = (isVisible: boolean) => void;

class NavigationStore {
  private listeners: Set<NavigationListener> = new Set();
  private hiddenReasons: Set<string> = new Set();

  subscribe(listener: NavigationListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setVisible(visible: boolean) {
    if (visible) this.show('legacy');
    else this.hide('legacy');
  }

  hide(reason: string) {
    const wasVisible = this.getVisible();
    this.hiddenReasons.add(reason);
    if (wasVisible !== this.getVisible()) this.emit();
  }

  show(reason: string) {
    const wasVisible = this.getVisible();
    this.hiddenReasons.delete(reason);
    if (wasVisible !== this.getVisible()) this.emit();
  }

  getVisible() {
    return this.hiddenReasons.size === 0;
  }

  private emit() {
    const isVisible = this.getVisible();
    this.listeners.forEach(listener => listener(isVisible));
  }
}

export const navigationStore = new NavigationStore();

// 便捷函數
export const hideNavigation = (reason = 'legacy') => navigationStore.hide(reason);
export const showNavigation = (reason = 'legacy') => navigationStore.show(reason);
