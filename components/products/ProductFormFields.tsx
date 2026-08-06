'use client';

import {
  BookOpen,
  Cookie,
  FileText,
  Gem,
  Hand,
  MoreHorizontal,
  Package,
  Palette,
  Shirt,
} from 'lucide-react';

import { FormField } from '@/components/ui/FormField';
import { cn } from '@/lib/utils';
import type {
  ProductFormErrors,
  ProductFormValues,
} from '@/lib/products/product-form';
import type { ProductCategory } from '@/types/db';

interface ProductCategoryOption {
  value: ProductCategory;
  label: string;
  icon: typeof Package;
  color: string;
}

const PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  { value: 'handmade', label: '手作', icon: Hand, color: 'bg-soft-pink' },
  { value: 'food', label: '食品', icon: Cookie, color: 'bg-soft-yellow' },
  { value: 'accessory', label: '飾品', icon: Gem, color: 'bg-soft-green' },
  { value: 'clothing', label: '服飾', icon: Shirt, color: 'bg-cat-clothing' },
  { value: 'art', label: '藝術品', icon: Palette, color: 'bg-cat-art' },
  { value: 'stationery', label: '文具', icon: BookOpen, color: 'bg-cat-stationery' },
  { value: 'other', label: '其他', icon: MoreHorizontal, color: 'bg-cat-other' },
];

interface ProductFormFieldsProps {
  idPrefix: string;
  values: ProductFormValues;
  errors: ProductFormErrors;
  mode?: 'owner' | 'manager';
  disabled?: boolean;
  onChange: <Field extends keyof ProductFormValues>(
    field: Field,
    value: ProductFormValues[Field],
  ) => void;
}

const inputClassName =
  'min-h-11 w-full rounded-control border border-primary/20 bg-white px-3 text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted/40 disabled:text-muted-foreground';

export function ProductFormFields({
  idPrefix,
  values,
  errors,
  mode = 'owner',
  disabled = false,
  onChange,
}: ProductFormFieldsProps) {
  const isManagerMode = mode === 'manager';

  return (
    <div className="space-y-6">
      <section className="space-y-4" aria-labelledby={`${idPrefix}-required-heading`}>
        <div>
          <h3 id={`${idPrefix}-required-heading`} className="text-sm font-medium text-foreground">
            基本資料
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            先完成銷售時一定會用到的資料。
          </p>
        </div>

        {!isManagerMode && (
          <FormField
            id={`${idPrefix}-name`}
            label="商品名稱"
            required
            error={errors.name}
          >
            {(fieldProps) => (
              <input
                {...fieldProps}
                type="text"
                value={values.name}
                onChange={event => onChange('name', event.target.value)}
                placeholder="例如：手工陶杯"
                autoComplete="off"
                disabled={disabled}
                className={inputClassName}
              />
            )}
          </FormField>
        )}

        {!isManagerMode && (
          <FormField id={`${idPrefix}-category`} label="分類" required>
            {(fieldProps) => (
              <div
                id={fieldProps.id}
                role="group"
                aria-label="商品分類"
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {PRODUCT_CATEGORIES.map(option => {
                  const Icon = option.icon;
                  const selected = values.category === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      disabled={disabled}
                      onClick={() => onChange('category', option.value)}
                      className={cn(
                        'flex min-h-11 items-center gap-2 rounded-control border px-3 text-left text-sm font-medium transition-colors',
                        option.color,
                        selected
                          ? 'border-primary text-foreground ring-2 ring-primary/15'
                          : 'border-transparent text-foreground/75 hover:border-primary/25',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </FormField>
        )}

        <div className={cn('grid gap-4', isManagerMode ? 'grid-cols-1' : 'sm:grid-cols-2')}>
          <FormField
            id={`${idPrefix}-price`}
            label="售價"
            required
            error={errors.price}
          >
            {(fieldProps) => (
              <input
                {...fieldProps}
                type="number"
                value={values.price}
                onChange={event => onChange('price', Number(event.target.value))}
                min="0"
                step="1"
                inputMode="decimal"
                disabled={disabled}
                className={inputClassName}
              />
            )}
          </FormField>

          {!isManagerMode && (
            <FormField
              id={`${idPrefix}-cost`}
              label="成本"
              hint="只有老闆可查看與修改"
              error={errors.cost}
            >
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  type="number"
                  value={values.cost}
                  onChange={event => onChange('cost', Number(event.target.value))}
                  min="0"
                  step="1"
                  inputMode="decimal"
                  disabled={disabled}
                  className={inputClassName}
                />
              )}
            </FormField>
          )}
        </div>
      </section>

      <section className="space-y-4 border-t border-primary/10 pt-5" aria-labelledby={`${idPrefix}-optional-heading`}>
        <div>
          <h3 id={`${idPrefix}-optional-heading`} className="text-sm font-medium text-foreground">
            庫存與說明
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            依商品需要調整，不影響快速建立。
          </p>
        </div>

        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-primary/15 px-3">
            <input
              type="checkbox"
              checked={values.unlimitedStock}
              onChange={event => onChange('unlimitedStock', event.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/40"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">不限庫存</span>
              <span className="block text-xs text-muted-foreground">適合服務或接單訂製商品</span>
            </span>
          </label>
        </div>

        {!values.unlimitedStock && (
          <FormField
            id={`${idPrefix}-stock`}
            label="庫存數量"
            error={errors.stock}
          >
            {(fieldProps) => (
              <input
                {...fieldProps}
                type="number"
                value={values.stock}
                onChange={event => onChange('stock', Number(event.target.value))}
                min="0"
                step="1"
                inputMode="numeric"
                disabled={disabled}
                className={inputClassName}
              />
            )}
          </FormField>
        )}

        <FormField id={`${idPrefix}-description`} label="商品描述">
          {(fieldProps) => (
            <div className="relative">
              <FileText
                className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <textarea
                {...fieldProps}
                value={values.description}
                onChange={event => onChange('description', event.target.value)}
                placeholder="尺寸、材質或其他銷售時需要知道的資訊"
                rows={3}
                disabled={disabled}
                className={`${inputClassName} resize-none py-2.5 pl-9`}
              />
            </div>
          )}
        </FormField>
      </section>
    </div>
  );
}
