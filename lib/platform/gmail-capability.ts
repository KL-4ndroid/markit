import type { GmailTransportPort } from '@/lib/platform/contracts/gmail';

let activeGmailTransport: GmailTransportPort | null = null;

export function installGmailTransport(transport: GmailTransportPort): () => void {
  const previousTransport = activeGmailTransport;
  activeGmailTransport = transport;

  return () => {
    if (activeGmailTransport === transport) activeGmailTransport = previousTransport;
  };
}

export function getGmailTransport(): GmailTransportPort {
  if (!activeGmailTransport) {
    throw new Error('Gmail transport is not installed for this platform.');
  }
  return activeGmailTransport;
}
