import { Capacitor } from '@capacitor/core';
import { DEFAULT_PUBLIC_WEB_ORIGIN } from '../app-link-policy';
import { createNativeInteractions } from './interactions';

export async function loadIosInteractions() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios'
    || !['App', 'Clipboard', 'AppLauncher', 'Share'].every(name => Capacitor.isPluginAvailable(name))) {
    throw new Error('native_interaction_unavailable');
  }
  const [{ App }, { Clipboard }, { AppLauncher }, { Share }] = await Promise.all([
    import('@capacitor/app'), import('@capacitor/clipboard'), import('@capacitor/app-launcher'), import('@capacitor/share'),
  ]);
  const interaction = createNativeInteractions({
    writeText: value => Clipboard.write({ string: value }),
    openUrl: url => AppLauncher.openUrl({ url }),
    share: async input => { await Share.share(input); },
    getLaunchUrl: () => App.getLaunchUrl(),
    addUrlListener: listener => App.addListener('appUrlOpen', listener),
    currentUrl: () => typeof window === 'undefined' ? null : window.location.href,
  }, {
    origin: process.env.NEXT_PUBLIC_APP_WEB_ORIGIN || DEFAULT_PUBLIC_WEB_ORIGIN,
    scheme: process.env.NEXT_PUBLIC_NATIVE_LINK_SCHEME || '',
  });
  await interaction.ready;
  return interaction;
}
