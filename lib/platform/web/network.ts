import type { NetworkPort, NetworkStatus } from '@/lib/platform/contracts/network';

function currentWebNetworkStatus(): NetworkStatus {
  const connected = typeof navigator === 'undefined' ? true : navigator.onLine;
  return {
    connected,
    connectionType: connected ? 'unknown' : 'none',
  };
}

export const webNetwork: NetworkPort = Object.freeze({
  getCurrentStatus: currentWebNetworkStatus,

  subscribe(listener: (status: NetworkStatus) => void) {
    if (typeof window === 'undefined') return () => undefined;

    const handleChange = () => listener(currentWebNetworkStatus());
    window.addEventListener('online', handleChange);
    window.addEventListener('offline', handleChange);

    return () => {
      window.removeEventListener('online', handleChange);
      window.removeEventListener('offline', handleChange);
    };
  },
});
