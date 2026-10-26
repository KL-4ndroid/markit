'use client';

import { FormField } from '@/components/ui/FormField';
import { MARKET_REGIONS, isMarketRegionCode, type MarketRegionCode } from '@/lib/markets/market-region';
import { isMarketRegionWriteEnabled } from '@/lib/markets/market-region-rollout';

interface MarketRegionFieldProps {
  id: string;
  value?: MarketRegionCode | null;
  onChange: (value: MarketRegionCode | null) => void;
  disabled?: boolean;
  error?: string;
}

export function MarketRegionField({ id, value, onChange, disabled, error }: MarketRegionFieldProps) {
  const ready = isMarketRegionWriteEnabled();
  return (
    <FormField id={id} label="縣市（選填）" error={error}
      hint={ready ? undefined : '縣市分類準備中，稍後可回來補填。'}>
      {props => (
        <select {...props} value={value ?? ''} disabled={disabled || !ready}
          onChange={event => {
            const code = event.target.value;
            if (code === '' || isMarketRegionCode(code)) onChange(code === '' ? null : code);
          }}
          className="min-h-12 w-full min-w-0 rounded-2xl border border-primary/15 bg-atelier-paper px-4 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground">
          <option value="">未分類（可稍後選擇）</option>
          {MARKET_REGIONS.map(region => <option key={region.code} value={region.code}>{region.label}</option>)}
        </select>
      )}
    </FormField>
  );
}
