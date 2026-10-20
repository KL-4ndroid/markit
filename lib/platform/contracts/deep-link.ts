export interface DeepLinkPort {
  createAppUrl(path: string): string;
  getInitialUrl(): Promise<string | null>;
  /** Current in-app document URL; must not replay a previous launch intent. */
  getCurrentUrl(): Promise<string | null>;
  subscribe(listener: (url: string) => void): () => void;
}
