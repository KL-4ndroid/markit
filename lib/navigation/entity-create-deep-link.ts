const CREATE_ACTION = 'add';

export function isEntityCreateDeepLink(
  url: string | null,
  expectedPath: '/markets' | '/products'
): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.pathname === expectedPath
      && parsed.searchParams.get('action') === CREATE_ACTION;
  } catch {
    return false;
  }
}
