export type EquipmentAvailability = 'unknown' | 'free' | 'rental' | 'self';
export type EquipmentAvailabilityField = 'tableFree' | 'chairFree' | 'umbrellaFree';
export type MarketRegistrationConditions = Partial<Record<EquipmentAvailabilityField, EquipmentAvailability>>;

export const EQUIPMENT_AVAILABILITY_LABELS: Record<EquipmentAvailability, string> = {
  unknown: '未確認',
  free: '主辦免費提供',
  rental: '付費租用',
  self: '需自備',
};

export function equipmentAvailability(
  free: boolean | undefined, rent: number | undefined, selected?: EquipmentAvailability,
): EquipmentAvailability {
  // Recognize useful values already stored by older clients and recurring arrangements.
  if (free) return 'free';
  if ((rent ?? 0) > 0) return 'rental';
  return selected === 'self' || selected === 'rental' ? selected : 'unknown';
}

export function changedRegistrationConditions(
  initial: MarketRegistrationConditions | undefined, current: MarketRegistrationConditions | undefined,
) {
  const entries = Object.entries(current ?? {}).filter(([key, value]) => (
    initial?.[key as keyof MarketRegistrationConditions] !== value
  ));
  return entries.length ? { registrationConditions: Object.fromEntries(entries) as MarketRegistrationConditions } : {};
}
