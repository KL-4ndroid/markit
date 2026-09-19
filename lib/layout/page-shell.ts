export type PageShellWidthMode = 'focused' | 'workspace' | 'report';

const PAGE_SHELL_WIDTH_CLASSES: Record<PageShellWidthMode, string> = {
  focused: 'max-w-3xl',
  workspace: 'max-w-5xl',
  report: 'max-w-7xl',
};

export function getPageShellWidthClass(mode: PageShellWidthMode): string {
  return PAGE_SHELL_WIDTH_CLASSES[mode];
}
