import type { InAppPurchasePort } from '@/lib/platform/contracts/in-app-purchase';
import { webInAppPurchase } from '@/lib/platform/web/in-app-purchase';

let activeInAppPurchasePort: InAppPurchasePort = webInAppPurchase;

export function getInAppPurchasePort(): InAppPurchasePort {
  return activeInAppPurchasePort;
}

export function installInAppPurchasePort(port: InAppPurchasePort): () => void {
  const previousPort = activeInAppPurchasePort;
  activeInAppPurchasePort = port;
  return () => {
    if (activeInAppPurchasePort === port) activeInAppPurchasePort = previousPort;
  };
}
