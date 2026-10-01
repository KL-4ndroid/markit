export type ShareInput = { title?: string; text?: string; url?: string };
export type ShareResult = 'shared' | 'cancelled' | 'unsupported';

export interface SharePort {
  share(input: ShareInput): Promise<ShareResult>;
}
