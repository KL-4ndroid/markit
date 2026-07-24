import type { NetworkPort } from '@/lib/platform/contracts/network';
import { webNetwork } from '@/lib/platform/web/network';

let activeNetworkPort: NetworkPort = webNetwork;

export function getNetworkPort(): NetworkPort {
  return activeNetworkPort;
}

export function installNetworkPort(networkPort: NetworkPort): () => void {
  const previousNetworkPort = activeNetworkPort;
  activeNetworkPort = networkPort;

  return () => {
    if (activeNetworkPort === networkPort) activeNetworkPort = previousNetworkPort;
  };
}
