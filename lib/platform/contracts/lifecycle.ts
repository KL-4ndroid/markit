export type AppLifecycleState = 'active' | 'background';

export interface LifecyclePort {
  getCurrentState(): AppLifecycleState;
  subscribe(listener: (state: AppLifecycleState) => void): () => void;
}
