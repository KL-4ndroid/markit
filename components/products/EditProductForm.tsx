'use client';

import { Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ProductFormFields } from '@/components/products/ProductFormFields';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteProduct, updateProduct } from '@/lib/db/hooks';
import {
  createProductFormValues,
  getFirstProductFormError,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from '@/lib/products/product-form';
import type { Product } from '@/types/db';

interface EditProductFormProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode?: 'owner' | 'manager';
}

const FORM_ID = 'edit-product-form';
const FIELD_PREFIX = 'edit-product';

export function EditProductForm({
  product,
  isOpen,
  onClose,
  onSuccess,
  mode = 'owner',
}: EditProductFormProps) {
  const isManagerMode = mode === 'manager';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showZeroStockConfirm, setShowZeroStockConfirm] = useState(false);
  const [formData, setFormData] = useState<ProductFormValues>(() => createProductFormValues(product));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(createProductFormValues(product));
    setErrors({});
    setSubmitError(null);
  }, [product, isOpen]);

  const handleChange = <Field extends keyof ProductFormValues>(
    field: Field,
    value: ProductFormValues[Field],
  ) => {
    setFormData(previous => ({ ...previous, [field]: value }));
    setErrors(previous => {
      if (!(field in previous)) return previous;
      const next = { ...previous };
      delete next[field as keyof ProductFormErrors];
      return next;
    });
    setSubmitError(null);
  };

  const focusFirstError = (nextErrors: ProductFormErrors) => {
    const firstError = getFirstProductFormError(nextErrors);
    if (!firstError) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`${FIELD_PREFIX}-${firstError}`)?.focus();
    });
  };

  const updateValidatedProduct = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const managerUpdates: Partial<Product> = {
        price: formData.price,
        stock: formData.unlimitedStock ? 0 : formData.stock,
        unlimitedStock: formData.unlimitedStock,
        description: formData.description.trim(),
        isActive: formData.isActive,
      };
      const ownerUpdates: Partial<Product> = {
        name: formData.name.trim(),
        category: formData.category,
        price: formData.price,
        cost: formData.cost,
        stock: formData.unlimitedStock ? 0 : formData.stock,
        unlimitedStock: formData.unlimitedStock,
        description: formData.description.trim(),
        isActive: formData.isActive,
      };

      await updateProduct(product.id!, isManagerMode ? managerUpdates : ownerUpdates);
      setShowZeroStockConfirm(false);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('更新商品失敗：', error);
      setSubmitError('變更尚未儲存，請確認連線後再試一次。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProductForm(formData, { requireIdentity: !isManagerMode });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    if (!formData.unlimitedStock && formData.stock === 0) {
      setShowZeroStockConfirm(true);
      return;
    }

    void updateValidatedProduct();
  };

  const handleToggleActive = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const nextActive = !formData.isActive;
      await updateProduct(product.id!, { isActive: nextActive });
      setFormData(previous => ({ ...previous, isActive: nextActive }));
      onSuccess?.();
    } catch (error) {
      console.error('更新商品狀態失敗：', error);
      setSubmitError('商品狀態尚未更新，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(product.id!);
      setShowDeleteConfirm(false);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('刪除商品失敗：', error);
      setSubmitError('商品尚未刪除，請稍後再試。');
      throw error;
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSubmitError(null);
    onClose();
  };

  return (
    <>
      <AppDialog
        open={isOpen}
        onClose={handleClose}
        title="編輯商品"
        description={isManagerMode ? '可調整銷售、庫存與現場需要的資訊。' : '更新商品資料與販售狀態。'}
        size="md"
        dismissible={!isSubmitting}
        footer={(
          <>
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" form={FORM_ID} isLoading={isSubmitting}>
              儲存變更
            </Button>
          </>
        )}
      >
        <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
          <ProductFormFields
            idPrefix={FIELD_PREFIX}
            values={formData}
            errors={errors}
            mode={mode}
            onChange={handleChange}
            disabled={isSubmitting}
          />

          <section className="mt-6 space-y-3 border-t border-primary/10 pt-5" aria-labelledby="product-management-heading">
            <h3 id="product-management-heading" className="text-sm font-medium text-foreground">
              商品狀態
            </h3>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleToggleActive}
              disabled={isSubmitting}
              leadingIcon={formData.isActive
                ? <Ban className="h-4 w-4" aria-hidden="true" />
                : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            >
              {formData.isActive ? '停用商品' : '啟用商品'}
            </Button>

            {!isManagerMode && (
              <Button
                variant="ghost"
                className="w-full text-danger hover:bg-status-danger-bg"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
              >
                刪除商品
              </Button>
            )}
          </section>

          {submitError && (
            <p className="mt-5 rounded-control border border-status-danger-border bg-status-danger-bg p-3 text-sm text-status-danger-text" role="alert">
              {submitError}
            </p>
          )}
        </form>
      </AppDialog>

      <ConfirmDialog
        open={showZeroStockConfirm}
        onClose={() => setShowZeroStockConfirm(false)}
        onConfirm={updateValidatedProduct}
        title="儲存為零庫存？"
        description="儲存後商品會顯示為已售完，仍可稍後補上庫存。"
        confirmLabel="仍要儲存"
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="確認刪除商品？"
        description="刪除後商品將無法繼續販售，此操作無法復原。"
        confirmLabel="刪除商品"
        tone="danger"
      />
    </>
  );
}
