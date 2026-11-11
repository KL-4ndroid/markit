import brand from './app-brand.json';

export const APP_BRAND = {
  ...brand,
  displayName: `${brand.name}｜${brand.positioning}`,
} as const;
