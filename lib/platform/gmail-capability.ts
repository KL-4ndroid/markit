import type { GmailTransportPort } from '@/lib/platform/contracts/gmail';

let installedGmailTransport: GmailTransportPort | null = null;

export function installGmailTransport(transport: GmailTransportPort | null): void {
  installedGmailTransport = transport;
}

export function getGmailTransport(): GmailTransportPort {
  if (!installedGmailTransport) {
    throw new Error('Gmail transport is not installed for this platform.');
  }
  return installedGmailTransport;
}
