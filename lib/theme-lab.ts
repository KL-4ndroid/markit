export const THEME_LAB_OPEN_EVENT = 'feria:open-theme-lab';
export const THEME_LAB_STORAGE_KEY = 'feria.dev.theme-lab.v1';

export const THEME_TOKEN_KEYS = [
  'primary',
  'secondary',
  'background',
  'card',
  'foreground',
  'mutedForeground',
  'softPink',
  'softGreen',
  'softYellow',
  'homeEndedCard',
  'upcomingSection',
  'upcomingDateBadge',
  'danger',
  'warn',
  'info',
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemePalette = Record<ThemeTokenKey, string>;

type Rgb = readonly [number, number, number];

export interface ThemeTokenDefinition {
  key: ThemeTokenKey;
  label: string;
  cssVariable: `--brand-${string}`;
  description: string;
  group: 'foundation' | 'soft' | 'status';
}

export interface ThemePreset {
  id: string;
  name: string;
  description?: string;
  palette: ThemePalette;
}

export interface ThemeLabState {
  version: 1;
  palette: ThemePalette;
  customPresets: ThemePreset[];
  hasOverrides: boolean;
}

export interface ThemeLabExport {
  format: 'feria-theme-lab';
  version: 1;
  name: string;
  exportedAt: string;
  colors: ThemePalette;
}

export const THEME_TOKEN_DEFINITIONS: readonly ThemeTokenDefinition[] = [
  { key: 'primary', label: '霧藍主色', cssVariable: '--brand-primary', description: '頁首、主要按鈕與焦點', group: 'foundation' },
  { key: 'secondary', label: '暖木輔色', cssVariable: '--brand-secondary', description: '漸層、標記與溫暖點綴', group: 'foundation' },
  { key: 'background', label: '米白背景', cssVariable: '--brand-background', description: 'App 整體畫布', group: 'foundation' },
  { key: 'card', label: '卡片底色', cssVariable: '--brand-card', description: '卡片、輸入框與浮層', group: 'foundation' },
  { key: 'foreground', label: '主要文字', cssVariable: '--brand-foreground', description: '標題與正文', group: 'foundation' },
  { key: 'mutedForeground', label: '次要文字', cssVariable: '--brand-muted-foreground', description: '說明、標籤與輔助資訊', group: 'foundation' },
  { key: 'softPink', label: '柔粉', cssVariable: '--brand-soft-pink', description: '溫柔提示與分類底色', group: 'soft' },
  { key: 'softGreen', label: '柔綠', cssVariable: '--brand-soft-green', description: '區塊底色與自然感', group: 'soft' },
  { key: 'softYellow', label: '柔黃', cssVariable: '--brand-soft-yellow', description: '暖光背景與提醒底色', group: 'soft' },
  { key: 'homeEndedCard', label: '收班卡片底色', cssVariable: '--brand-home-ended-card', description: '首頁「今日已收班」整張卡片', group: 'soft' },
  { key: 'upcomingSection', label: '近期市集區塊底色', cssVariable: '--brand-upcoming-section', description: '首頁「近期市集」整個橫向區塊', group: 'soft' },
  { key: 'upcomingDateBadge', label: '近期日期標籤底色', cssVariable: '--brand-upcoming-date-badge', description: '近期市集內的日期標籤，例如 7/23（週四）', group: 'soft' },
  { key: 'danger', label: '危險色', cssVariable: '--brand-danger', description: '刪除、錯誤與重要警示', group: 'status' },
  { key: 'warn', label: '提醒色', cssVariable: '--brand-warn', description: '待處理與注意狀態', group: 'status' },
  { key: 'info', label: '資訊色', cssVariable: '--brand-info', description: '一般資訊與次要狀態', group: 'status' },
];

const DEFAULT_THEME_RGB: Record<ThemeTokenKey, Rgb> = {
  primary: [123, 159, 166],
  secondary: [212, 165, 116],
  background: [250, 250, 248],
  card: [255, 255, 255],
  foreground: [58, 58, 58],
  mutedForeground: [107, 107, 107],
  softPink: [245, 230, 232],
  softGreen: [232, 243, 232],
  softYellow: [255, 248, 231],
  homeEndedCard: [231, 239, 241],
  upcomingSection: [239, 243, 244],
  upcomingDateBadge: [231, 239, 241],
  danger: [199, 119, 110],
  warn: [229, 196, 107],
  info: [126, 154, 160],
};

const toHexChannel = (value: number) => Math.round(value).toString(16).padStart(2, '0').toUpperCase();
const rgbToHex = ([red, green, blue]: Rgb) => `#${toHexChannel(red)}${toHexChannel(green)}${toHexChannel(blue)}`;

const paletteFromRgb = (colors: Record<ThemeTokenKey, Rgb>): ThemePalette =>
  Object.fromEntries(THEME_TOKEN_KEYS.map((key) => [key, rgbToHex(colors[key])])) as ThemePalette;

export const DEFAULT_THEME_PALETTE = Object.freeze(paletteFromRgb(DEFAULT_THEME_RGB));

export const BUILT_IN_THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: 'japanese-warm',
    name: 'JapaneseD 暖霧',
    description: '目前專案的霧藍、暖木與米白基準。',
    palette: DEFAULT_THEME_PALETTE,
  },
  {
    id: 'misty-sakura',
    name: '霧櫻日和',
    description: '更柔和的櫻粉與灰藍，保留木質暖意。',
    palette: paletteFromRgb({
      primary: [135, 154, 167], secondary: [210, 154, 142], background: [251, 248, 244],
      card: [255, 253, 249], foreground: [61, 57, 55], mutedForeground: [112, 101, 98],
      softPink: [246, 225, 229], softGreen: [231, 239, 233], softYellow: [253, 243, 221],
      homeEndedCard: [239, 232, 236],
      upcomingSection: [247, 239, 241], upcomingDateBadge: [239, 232, 236],
      danger: [183, 99, 96], warn: [210, 176, 93], info: [119, 145, 158],
    }),
  },
  {
    id: 'celadon-morning',
    name: '青瓷晨光',
    description: '帶一點青瓷綠的清爽日系配色。',
    palette: paletteFromRgb({
      primary: [102, 150, 145], secondary: [196, 156, 111], background: [247, 249, 245],
      card: [255, 255, 252], foreground: [50, 60, 57], mutedForeground: [96, 108, 104],
      softPink: [242, 228, 226], softGreen: [225, 240, 232], softYellow: [251, 244, 221],
      homeEndedCard: [224, 239, 235],
      upcomingSection: [238, 246, 242], upcomingDateBadge: [224, 239, 235],
      danger: [185, 105, 96], warn: [218, 185, 99], info: [100, 145, 151],
    }),
  },
  {
    id: 'warm-twilight',
    name: '暮光映畫',
    description: '以 Instagram 暮光感為靈感的暖紫粉版本。',
    palette: paletteFromRgb({
      primary: [116, 92, 151], secondary: [211, 113, 139], background: [251, 248, 250],
      card: [255, 255, 255], foreground: [53, 47, 57], mutedForeground: [105, 95, 111],
      softPink: [249, 227, 235], softGreen: [231, 239, 234], softYellow: [254, 244, 222],
      homeEndedCard: [239, 232, 246],
      upcomingSection: [246, 240, 248], upcomingDateBadge: [239, 232, 246],
      danger: [190, 83, 104], warn: [222, 178, 91], info: [123, 119, 164],
    }),
  },
  {
    id: 'honey-milk-tea',
    name: '蜂蜜奶茶',
    description: '焦糖棕、蜂蜜金與奶油米白，像午後咖啡店一樣溫暖。',
    palette: paletteFromRgb({
      primary: [132, 95, 64], secondary: [204, 146, 83], background: [250, 246, 239],
      card: [255, 252, 247], foreground: [62, 49, 39], mutedForeground: [108, 91, 75],
      softPink: [246, 229, 222], softGreen: [231, 238, 224], softYellow: [250, 235, 199],
      homeEndedCard: [239, 229, 216],
      upcomingSection: [247, 240, 229], upcomingDateBadge: [237, 224, 205],
      danger: [174, 86, 76], warn: [196, 147, 62], info: [110, 134, 132],
    }),
  },
  {
    id: 'hydrangea-rain',
    name: '紫陽雨日',
    description: '雨霧紫、繡球粉與微冷白，安靜又帶一點浪漫。',
    palette: paletteFromRgb({
      primary: [99, 88, 150], secondary: [190, 125, 159], background: [248, 247, 252],
      card: [255, 254, 255], foreground: [52, 48, 64], mutedForeground: [99, 92, 116],
      softPink: [246, 228, 238], softGreen: [231, 239, 236], softYellow: [250, 243, 220],
      homeEndedCard: [234, 231, 246],
      upcomingSection: [243, 241, 249], upcomingDateBadge: [230, 227, 244],
      danger: [177, 79, 103], warn: [205, 166, 78], info: [111, 124, 165],
    }),
  },
  {
    id: 'forest-market',
    name: '森町綠意',
    description: '森林綠、木質棕與葉影柔色，適合自然系品牌。',
    palette: paletteFromRgb({
      primary: [68, 105, 82], secondary: [177, 132, 81], background: [245, 248, 244],
      card: [253, 255, 252], foreground: [43, 55, 48], mutedForeground: [86, 103, 93],
      softPink: [243, 228, 226], softGreen: [220, 237, 224], softYellow: [248, 240, 211],
      homeEndedCard: [222, 235, 226],
      upcomingSection: [234, 242, 235], upcomingDateBadge: [217, 233, 222],
      danger: [170, 83, 73], warn: [201, 164, 72], info: [91, 128, 119],
    }),
  },
  {
    id: 'sea-salt-soda',
    name: '海鹽蘇打',
    description: '海水藍、珊瑚杏與清透白，帶來輕盈的夏日感。',
    palette: paletteFromRgb({
      primary: [65, 113, 132], secondary: [218, 151, 113], background: [245, 249, 250],
      card: [253, 255, 255], foreground: [42, 55, 60], mutedForeground: [84, 105, 112],
      softPink: [248, 229, 231], softGreen: [226, 240, 235], softYellow: [252, 244, 218],
      homeEndedCard: [220, 237, 241],
      upcomingSection: [233, 244, 247], upcomingDateBadge: [215, 235, 240],
      danger: [183, 83, 89], warn: [218, 177, 79], info: [79, 132, 151],
    }),
  },
  {
    id: 'berry-caramel',
    name: '莓果焦糖',
    description: '莓果紅、焦糖橙與暖粉背景，成熟而有手作質感。',
    palette: paletteFromRgb({
      primary: [135, 73, 82], secondary: [194, 127, 74], background: [251, 247, 245],
      card: [255, 253, 251], foreground: [58, 44, 47], mutedForeground: [105, 86, 90],
      softPink: [246, 223, 228], softGreen: [229, 238, 228], softYellow: [250, 237, 211],
      homeEndedCard: [241, 226, 229],
      upcomingSection: [248, 239, 239], upcomingDateBadge: [239, 221, 226],
      danger: [173, 72, 82], warn: [204, 153, 65], info: [123, 123, 145],
    }),
  },
];

const ALIASED_VARIABLES: Partial<Record<ThemeTokenKey, readonly string[]>> = {
  primary: ['--atelier-blue'],
  secondary: ['--atelier-clay'],
  background: ['--atelier-canvas'],
  card: ['--atelier-paper'],
  foreground: ['--atelier-ink'],
  mutedForeground: ['--atelier-muted'],
  softPink: ['--atelier-rose-soft'],
  softGreen: ['--atelier-sage-soft'],
};

const LAB_MANAGED_CSS_VARIABLES = [
  ...THEME_TOKEN_DEFINITIONS.map(({ cssVariable }) => cssVariable),
  ...Object.values(ALIASED_VARIABLES).flatMap((aliases) => aliases ?? []),
  '--atelier-shadow',
  '--atelier-key-shadow',
  '--atelier-lift-shadow',
];

const BACKWARD_COMPATIBLE_THEME_KEYS: readonly ThemeTokenKey[] = [
  'homeEndedCard',
  'upcomingSection',
  'upcomingDateBadge',
];

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (!/^#[0-9a-f]{6}$/i.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

export function hexToRgb(value: string): [number, number, number] | null {
  const normalized = normalizeHex(value);
  if (!normalized) return null;
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function rgbTriplet(value: string): string | null {
  const rgb = hexToRgb(value);
  return rgb ? rgb.join(' ') : null;
}

export function sanitizeThemePalette(value: unknown): ThemePalette | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const entries = THEME_TOKEN_KEYS.map((key) => {
    const normalized = typeof source[key] === 'string'
      ? normalizeHex(source[key])
      : BACKWARD_COMPATIBLE_THEME_KEYS.includes(key) && source[key] === undefined
        ? DEFAULT_THEME_PALETTE[key]
        : null;
    return normalized ? [key, normalized] : null;
  });
  if (entries.some((entry) => entry === null)) return null;
  return Object.fromEntries(entries as [ThemeTokenKey, string][]) as ThemePalette;
}

function sanitizePreset(value: unknown): ThemePreset | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const palette = sanitizeThemePalette(source.palette);
  if (!palette || typeof source.name !== 'string' || !source.name.trim()) return null;
  return {
    id: typeof source.id === 'string' && source.id ? source.id : `saved-${Date.now()}`,
    name: source.name.trim().slice(0, 40),
    description: typeof source.description === 'string' ? source.description.slice(0, 120) : undefined,
    palette,
  };
}

export function loadThemeLabState(): ThemeLabState {
  const fallback: ThemeLabState = {
    version: 1,
    palette: { ...DEFAULT_THEME_PALETTE },
    customPresets: [],
    hasOverrides: false,
  };
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(THEME_LAB_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const palette = sanitizeThemePalette(parsed.palette);
    if (!palette) return fallback;
    const customPresets = Array.isArray(parsed.customPresets)
      ? parsed.customPresets.map(sanitizePreset).filter((preset): preset is ThemePreset => Boolean(preset))
      : [];
    return {
      version: 1,
      palette,
      customPresets,
      hasOverrides: parsed.hasOverrides === true,
    };
  } catch {
    return fallback;
  }
}

export function saveThemeLabState(state: ThemeLabState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_LAB_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The lab remains usable for the current session when storage is unavailable.
  }
}

function updateThemeMeta(color: string): void {
  if (typeof document === 'undefined') return;
  for (const selector of ['meta[name="theme-color"]', 'meta[name="msapplication-TileColor"]']) {
    const meta = document.querySelector<HTMLMetaElement>(selector);
    if (!meta) continue;
    if (!meta.dataset.themeLabOriginalContent) {
      meta.dataset.themeLabOriginalContent = meta.content;
    }
    meta.content = color;
  }
}

export function applyThemePalette(palette: ThemePalette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  for (const definition of THEME_TOKEN_DEFINITIONS) {
    const triplet = rgbTriplet(palette[definition.key]);
    if (!triplet) continue;
    root.style.setProperty(definition.cssVariable, triplet);
    for (const alias of ALIASED_VARIABLES[definition.key] ?? []) {
      root.style.setProperty(alias, triplet);
    }
  }

  const primary = rgbTriplet(palette.primary);
  if (primary) {
    root.style.setProperty('--atelier-shadow', `0 10px 28px rgb(${primary} / 0.10)`);
    root.style.setProperty('--atelier-key-shadow', `0 2px 0 rgb(${primary} / 0.10), 0 8px 18px rgb(${primary} / 0.10)`);
    root.style.setProperty('--atelier-lift-shadow', `0 18px 42px rgb(${primary} / 0.15)`);
  }
  updateThemeMeta(palette.primary);
}

export function clearThemePaletteOverrides(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const variable of LAB_MANAGED_CSS_VARIABLES) {
    root.style.removeProperty(variable);
  }
  for (const selector of ['meta[name="theme-color"]', 'meta[name="msapplication-TileColor"]']) {
    const meta = document.querySelector<HTMLMetaElement>(selector);
    if (!meta?.dataset.themeLabOriginalContent) continue;
    meta.content = meta.dataset.themeLabOriginalContent;
    delete meta.dataset.themeLabOriginalContent;
  }
}

const relativeLuminance = (color: string): number => {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  const channels = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

export function getContrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function createThemeLabExport(name: string, palette: ThemePalette): ThemeLabExport {
  return {
    format: 'feria-theme-lab',
    version: 1,
    name: name.trim() || '未命名配色',
    exportedAt: new Date().toISOString(),
    colors: palette,
  };
}

export function parseThemeLabImport(value: string): { name: string; palette: ThemePalette } {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  const colors = sanitizeThemePalette(parsed.colors ?? parsed);
  if (!colors) throw new Error('色票格式不完整，請確認所有色彩欄位皆為六位 HEX 色碼。');
  return {
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 40) : '匯入的配色',
    palette: colors,
  };
}
