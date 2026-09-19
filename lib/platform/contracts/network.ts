export type NetworkStatus = {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
};

export interface NetworkPort {
  getCurrentStatus(): NetworkStatus;
  subscribe(listener: (status: NetworkStatus) => void): () => void;
}
