import type { Market } from '@/types/db';
import { EQUIPMENT_AVAILABILITY_LABELS, equipmentAvailability } from '@/lib/markets/market-registration-conditions';
import { formatCurrency } from '@/lib/utils';

export function MarketEquipmentSummary({ market }: { market: Market }) {
  const terms = market.registrationConditions;
  const equipment = [
    { label: '桌子', free: market.tableFree, rent: market.tableRental, status: terms?.tableFree },
    { label: '椅子', free: market.chairFree, rent: market.chairRental, status: terms?.chairFree },
    { label: '傘具', free: market.umbrellaFree, rent: market.umbrellaRental, status: terms?.umbrellaFree },
    ...(market.tableclothFree || (market.tableclothRental ?? 0) > 0
      ? [{ label: '桌巾', free: market.tableclothFree, rent: market.tableclothRental, status: undefined }]
      : []),
  ];
  return <dl className="mt-2 space-y-2 text-sm">
    {equipment.map(({ label, free, rent, status }) => {
      const availability = equipmentAvailability(free, rent, status);
      return <div key={label} className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="text-right font-medium tabular-nums">
          {EQUIPMENT_AVAILABILITY_LABELS[availability]}
          {availability === 'rental' ? ' · ' + (rent ? formatCurrency(rent) : '租金未確認') : ''}
        </dd>
      </div>;
    })}
  </dl>;
}
