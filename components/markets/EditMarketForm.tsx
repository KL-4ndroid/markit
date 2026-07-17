'use client';

import { Clock, DollarSign, FileText, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  MarketBasicFields,
  MarketCostFields,
  MarketEquipmentFields,
  MarketNotesField,
  MarketTimelineFields,
  type MarketEquipmentField,
  type MarketEquipmentFreeField,
  type MarketTimelineField,
} from '@/components/markets/MarketFormFields';
import { Button } from '@/components/ui/Button';
import { FormSectionDisclosure } from '@/components/ui/FormSectionDisclosure';
import { FullScreenForm } from '@/components/ui/FullScreenForm';
import { updateMarket } from '@/lib/db/hooks';
import {
  calculateMarketDurationLabel,
  calculateMarketFixedCost,
  deriveMarketDateBounds,
  getFirstMarketCoreError,
  validateMarketCoreForm,
  type MarketCoreFormErrors,
} from '@/lib/markets/market-form';
import type { Market } from '@/types/db';

interface EditMarketFormProps {
  isOpen: boolean;
  onClose: () => void;
  market: Market;
  onSuccess?: () => void;
  mode?: 'owner' | 'manager';
}

interface EditMarketFormValues {
  name: string;
  location: string;
  dates: string[];
  startDate: string;
  endDate: string;
  earlyEntryTime: string;
  checkInTime: string;
  operatingStartTime: string;
  operatingEndTime: string;
  boothCost: number;
  deposit: number;
  tableRental: number;
  chairRental: number;
  umbrellaRental: number;
  commissionRate: number;
  notes: string;
}

const FORM_ID = 'edit-market-form';
const FIELD_PREFIX = 'edit-market';

function getMarketDates(market: Market): string[] {
  if (market.dates?.length) return market.dates;
  return Array.from(new Set([market.startDate, market.endDate].filter(Boolean)));
}

function createEditMarketFormValues(market: Market): EditMarketFormValues {
  return {
    name: market.name,
    location: market.location,
    dates: getMarketDates(market),
    startDate: market.startDate,
    endDate: market.endDate,
    earlyEntryTime: market.earlyEntryTime || '09:00',
    checkInTime: market.checkInTime || '09:30',
    operatingStartTime: market.operatingStartTime || '10:00',
    operatingEndTime: market.operatingEndTime || '18:00',
    boothCost: Number(market.boothCost || 0),
    deposit: Number(market.deposit || 0),
    tableRental: Number(market.tableRental || 0),
    chairRental: Number(market.chairRental || 0),
    umbrellaRental: Number(market.umbrellaRental || 0),
    commissionRate: Number(market.commissionRate || 0),
    notes: market.notes || '',
  };
}

export function EditMarketForm({
  isOpen,
  onClose,
  market,
  onSuccess,
  mode = 'owner',
}: EditMarketFormProps) {
  const isManagerMode = mode === 'manager';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableFree, setTableFree] = useState(Boolean(market.tableFree));
  const [chairFree, setChairFree] = useState(Boolean(market.chairFree));
  const [umbrellaFree, setUmbrellaFree] = useState(Boolean(market.umbrellaFree));
  const [noEarlyEntry, setNoEarlyEntry] = useState(!market.earlyEntryEnabled);
  const [formData, setFormData] = useState<EditMarketFormValues>(() => createEditMarketFormValues(market));
  const [errors, setErrors] = useState<MarketCoreFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(createEditMarketFormValues(market));
    setTableFree(Boolean(market.tableFree));
    setChairFree(Boolean(market.chairFree));
    setUmbrellaFree(Boolean(market.umbrellaFree));
    setNoEarlyEntry(!market.earlyEntryEnabled);
    setErrors({});
    setSubmitError(null);
  }, [isOpen, market]);

  const handleChange = (
    field: keyof EditMarketFormValues,
    value: string | number | string[],
  ) => {
    setFormData(previous => {
      const updated = { ...previous, [field]: value } as EditMarketFormValues;
      if (field === 'dates' && Array.isArray(value)) {
        Object.assign(updated, deriveMarketDateBounds(value));
      }
      return updated;
    });
    if (field === 'name' || field === 'location' || field === 'dates') {
      setErrors(previous => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    }
    setSubmitError(null);
  };

  const handleEquipmentFreeChange = (field: MarketEquipmentFreeField, value: boolean) => {
    const rentalField: Record<MarketEquipmentFreeField, MarketEquipmentField> = {
      tableFree: 'tableRental',
      chairFree: 'chairRental',
      umbrellaFree: 'umbrellaRental',
    };
    if (field === 'tableFree') setTableFree(value);
    if (field === 'chairFree') setChairFree(value);
    if (field === 'umbrellaFree') setUmbrellaFree(value);
    if (value) handleChange(rentalField[field], 0);
  };

  const focusFirstError = (nextErrors: MarketCoreFormErrors) => {
    const firstError = getFirstMarketCoreError(nextErrors);
    if (!firstError) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`${FIELD_PREFIX}-${firstError}`)?.focus();
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateMarketCoreForm(formData, { requireIdentity: !isManagerMode });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const managerUpdates = {
        dates: formData.dates,
        startDate: formData.startDate,
        endDate: formData.endDate,
        earlyEntryEnabled: !noEarlyEntry,
        earlyEntryTime: formData.earlyEntryTime,
        checkInTime: formData.checkInTime,
        operatingStartTime: formData.operatingStartTime,
        operatingEndTime: formData.operatingEndTime,
        notes: formData.notes.trim(),
      };
      const ownerUpdates = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        dates: formData.dates,
        startDate: formData.startDate,
        endDate: formData.endDate,
        earlyEntryEnabled: !noEarlyEntry,
        earlyEntryTime: formData.earlyEntryTime,
        checkInTime: formData.checkInTime,
        operatingStartTime: formData.operatingStartTime,
        operatingEndTime: formData.operatingEndTime,
        boothCost: formData.boothCost,
        deposit: formData.deposit,
        tableRental: tableFree ? 0 : formData.tableRental,
        chairRental: chairFree ? 0 : formData.chairRental,
        umbrellaRental: umbrellaFree ? 0 : formData.umbrellaRental,
        tableFree,
        chairFree,
        umbrellaFree,
        commissionRate: formData.commissionRate,
        notes: formData.notes.trim(),
      };

      await updateMarket(market.id!, isManagerMode ? managerUpdates : ownerUpdates);
      toast.success('市集資訊已更新');
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('更新市集失敗：', error);
      setSubmitError('變更尚未儲存，請確認連線後再試一次。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fixedCostTotal = calculateMarketFixedCost({
    boothCost: formData.boothCost,
    tableRental: formData.tableRental,
    chairRental: formData.chairRental,
    umbrellaRental: formData.umbrellaRental,
    tableFree,
    chairFree,
    umbrellaFree,
  });
  const totalStartTime = noEarlyEntry ? formData.checkInTime : formData.earlyEntryTime;

  return (
    <FullScreenForm
      open={isOpen}
      onClose={onClose}
      eyebrow="市集管理"
      title="編輯市集"
      description={isManagerMode ? '調整營業日期、時間與現場備註。' : '基本資料優先，其餘設定可按需要展開。'}
      dismissible={!isSubmitting}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            取消
          </Button>
          <Button type="submit" form={FORM_ID} isLoading={isSubmitting}>
            儲存變更
          </Button>
        </>
      )}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
        <div className="japanese-surface-card p-5 sm:p-6">
          <MarketBasicFields
            idPrefix={FIELD_PREFIX}
            name={formData.name}
            location={formData.location}
            dates={formData.dates}
            errors={errors}
            mode={mode}
            disabled={isSubmitting}
            onNameChange={value => handleChange('name', value)}
            onLocationChange={value => handleChange('location', value)}
            onDatesChange={value => handleChange('dates', value)}
          />
        </div>

        <div className="mt-6">
          <div className="mb-3 px-1">
            <p className="text-sm font-semibold text-foreground">細節設定</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">依主辦資訊調整，未變動的設定會維持原樣。</p>
          </div>

          <div className="space-y-3">

          {!isManagerMode && (
            <>
              <FormSectionDisclosure
                title="成本與抽成"
                description="攤位費、保證金與營業額抽成"
                icon={DollarSign}
                tone="yellow"
              >
                <MarketCostFields
                  idPrefix={FIELD_PREFIX}
                  boothCost={formData.boothCost}
                  deposit={formData.deposit}
                  commissionRate={formData.commissionRate}
                  fixedCostTotal={fixedCostTotal}
                  disabled={isSubmitting}
                  onChange={(field, value) => handleChange(field, value)}
                />
              </FormSectionDisclosure>

              <FormSectionDisclosure
                title="設備"
                description="桌椅與傘具租金或免費提供狀態"
                icon={Package}
                tone="green"
              >
                <MarketEquipmentFields
                  idPrefix={FIELD_PREFIX}
                  rentals={{
                    tableRental: formData.tableRental,
                    chairRental: formData.chairRental,
                    umbrellaRental: formData.umbrellaRental,
                  }}
                  free={{ tableFree, chairFree, umbrellaFree }}
                  disabled={isSubmitting}
                  onRentalChange={(field, value) => handleChange(field, value)}
                  onFreeChange={handleEquipmentFreeChange}
                />
              </FormSectionDisclosure>
            </>
          )}

          <FormSectionDisclosure
            title="時間軸"
            description="進場、報到與營業起訖時間"
            icon={Clock}
            tone="blue"
          >
            <MarketTimelineFields
              idPrefix={FIELD_PREFIX}
              noEarlyEntry={noEarlyEntry}
              earlyEntryTime={formData.earlyEntryTime}
              checkInTime={formData.checkInTime}
              operatingStartTime={formData.operatingStartTime}
              operatingEndTime={formData.operatingEndTime}
              operatingDuration={calculateMarketDurationLabel(formData.operatingStartTime, formData.operatingEndTime)}
              totalDuration={calculateMarketDurationLabel(totalStartTime, formData.operatingEndTime)}
              disabled={isSubmitting}
              onNoEarlyEntryChange={setNoEarlyEntry}
              onChange={(field: MarketTimelineField, value) => handleChange(field, value)}
            />
          </FormSectionDisclosure>

          <FormSectionDisclosure
            title="備註"
            description="主辦規定與現場注意事項"
            icon={FileText}
            tone="pink"
          >
            <MarketNotesField
              idPrefix={FIELD_PREFIX}
              value={formData.notes}
              disabled={isSubmitting}
              onChange={value => handleChange('notes', value)}
            />
          </FormSectionDisclosure>
          </div>
        </div>

        {submitError && (
          <p className="mt-5 rounded-control border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-text" role="alert">
            {submitError}
          </p>
        )}
      </form>
    </FullScreenForm>
  );
}
