export interface DeepLinkPort {
  createAppUrl(path: string): string;
  getInitialUrl(): Promise<string | null>;
  subscribe(listener: (url: string) => void): () => void;
}
