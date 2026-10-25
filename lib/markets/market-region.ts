/** Product-owned stable codes. Labels and spelling aliases never act as identities. */
export const MARKET_REGIONS = [
  { code: 'tw-taipei-city', label: '臺北市' },
  { code: 'tw-new-taipei-city', label: '新北市' },
  { code: 'tw-keelung-city', label: '基隆市' },
  { code: 'tw-taoyuan-city', label: '桃園市' },
  { code: 'tw-hsinchu-city', label: '新竹市' },
  { code: 'tw-hsinchu-county', label: '新竹縣' },
  { code: 'tw-miaoli-county', label: '苗栗縣' },
  { code: 'tw-taichung-city', label: '臺中市' },
  { code: 'tw-changhua-county', label: '彰化縣' },
  { code: 'tw-nantou-county', label: '南投縣' },
  { code: 'tw-yunlin-county', label: '雲林縣' },
  { code: 'tw-chiayi-city', label: '嘉義市' },
  { code: 'tw-chiayi-county', label: '嘉義縣' },
  { code: 'tw-tainan-city', label: '臺南市' },
  { code: 'tw-kaohsiung-city', label: '高雄市' },
  { code: 'tw-pingtung-county', label: '屏東縣' },
  { code: 'tw-yilan-county', label: '宜蘭縣' },
  { code: 'tw-hualien-county', label: '花蓮縣' },
  { code: 'tw-taitung-county', label: '臺東縣' },
  { code: 'tw-penghu-county', label: '澎湖縣' },
  { code: 'tw-kinmen-county', label: '金門縣' },
  { code: 'tw-lienchiang-county', label: '連江縣' },
] as const;

export type MarketRegionCode = typeof MARKET_REGIONS[number]['code'];
const regionCodes = new Set<string>(MARKET_REGIONS.map(region => region.code));

export function isMarketRegionCode(value: unknown): value is MarketRegionCode {
  return typeof value === 'string' && regionCodes.has(value);
}

export function isOptionalMarketRegion(value: unknown): value is MarketRegionCode | null | undefined {
  return value == null || isMarketRegionCode(value);
}

export function marketRegionLabel(value: unknown): string {
  return MARKET_REGIONS.find(region => region.code === value)?.label ?? '未分類';
}

/** Exact full-name lookup for input assistance; never infer from an address. */
export function marketRegionCodeForLabel(value: string): MarketRegionCode | undefined {
  const label = value.trim().replaceAll('台', '臺');
  return MARKET_REGIONS.find(region => region.label === label)?.code;
}

/** Preserve null (clear) and undefined (unchanged); reject conflicting aliases. */
export function readMarketRegion(record: Record<string, unknown>): MarketRegionCode | null | undefined {
  const camel = record.regionCode;
  const snake = record.region_code;
  if (!isOptionalMarketRegion(camel) || !isOptionalMarketRegion(snake)) {
    throw new Error('請選擇有效的縣市，或選擇未分類');
  }
  if (camel !== undefined && snake !== undefined && camel !== snake) {
    throw new Error('縣市欄位不一致，請重新確認');
  }
  return camel !== undefined ? camel : snake;
}

/** Normalize only the new field; retain all existing update semantics. */
export function marketRegionFieldsToLocal<T extends Record<string, unknown>>(record: T) {
  const regionCode = readMarketRegion(record);
  const { region_code: _wireRegion, ...local } = record;
  return regionCode === undefined ? local : { ...local, regionCode };
}
