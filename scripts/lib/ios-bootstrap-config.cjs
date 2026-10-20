const IOS_CAPACITOR_VERSION = '8.5.3';

function createIosBootstrapConfig(env) {
  const appId = env.IOS_APP_ID?.trim();
  if (!appId) throw new Error('ios_app_id_missing');
  if (appId.length > 255 || !/^[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z][A-Za-z0-9-]*){2,}$/.test(appId)
    || /^(?:com|org|net)\.example\./i.test(appId)) {
    throw new Error('ios_app_id_invalid');
  }
  let api;
  try { api = new URL(env.NEXT_PUBLIC_API_BASE_URL ?? ''); } catch {
    throw new Error('ios_api_base_invalid');
  }
  if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash
    || ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) {
    throw new Error('ios_api_base_invalid');
  }
  if (env.CAPACITOR_SERVER_URL?.trim()) throw new Error('ios_remote_server_forbidden');
  if (env.NEXT_PUBLIC_APP_WEB_ORIGIN !== undefined) {
    try {
      const value = env.NEXT_PUBLIC_APP_WEB_ORIGIN;
      const web = new URL(value);
      if (value !== value.trim() || web.protocol !== 'https:' || web.username || web.password
        || web.pathname !== '/' || web.search || web.hash || !web.hostname.includes('.')
        || /^(localhost|127\.|\[)/i.test(web.hostname)) throw new Error();
    } catch { throw new Error('ios_web_origin_invalid'); }
  }
  return {
    appId,
    appName: 'Féria',
    webDir: 'out',
    loggingBehavior: 'none',
    ios: { path: 'ios', scheme: 'App' },
    server: { hostname: 'localhost', iosScheme: 'capacitor', cleartext: false },
  };
}

exports.IOS_CAPACITOR_VERSION = IOS_CAPACITOR_VERSION;
exports.createIosBootstrapConfig = createIosBootstrapConfig;
