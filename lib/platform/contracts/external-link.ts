export interface ExternalLinkPort {
  open(url: string): Promise<boolean>;
}
