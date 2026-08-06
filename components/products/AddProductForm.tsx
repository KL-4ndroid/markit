'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { ProductCoverPhotoField } from '@/components/products/ProductCoverPhotoField';
import { ProductFormFields } from '@/components/products/ProductFormFields';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { createProductWithResult } from '@/lib/db/hooks';
import type { PreparedProductCoverPhoto } from '@/lib/products/product-cover-photo-model';
import { uploadOrQueueProductCoverPhoto } from '@/lib/products/product-cover-photo-pending';
import {
  createEmptyProductFormValues,
  getFirstProductFormError,
  toProductCreatedPayload,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from '@/lib/products/product-form';

interface AddProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const FORM_ID = 'add-product-form';
const FIELD_PREFIX = 'add-product';

export function AddProductForm({ isOpen, onClose, onSuccess }: AddProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showZeroStockConfirm, setShowZeroStockConfirm] = useState(false);
  const [formData, setFormData] = useState<ProductFormValues>(createEmptyProductFormValues);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<PreparedProductCoverPhoto | null>(null);

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

  const createValidatedProduct = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { productId } = await createProductWithResult(toProductCreatedPayload(formData));
      if (coverPhoto) {
        const outcome = await uploadOrQueueProductCoverPhoto(productId, coverPhoto);
        if (outcome === 'queued') {
          toast.info('商品已新增；照片已保留，待連線恢復後可再次上傳。');
        }
      }
      setFormData(createEmptyProductFormValues());
      setCoverPhoto(null);
      setErrors({});
      setShowZeroStockConfirm(false);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('建立商品失敗：', error);
      setSubmitError('商品尚未建立，請確認連線後再試一次。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProductForm(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    if (!formData.unlimitedStock && formData.stock === 0) {
      setShowZeroStockConfirm(true);
      return;
    }

    void createValidatedProduct();
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  return (
    <>
      <AppDialog
        open={isOpen}
        onClose={handleClose}
        title="新增商品"
        description="先填基本資料即可建立，庫存與說明可依需要補充。"
        size="md"
        dismissible={!isSubmitting}
        footer={(
          <>
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" form={FORM_ID} isLoading={isSubmitting}>
              建立商品
            </Button>
          </>
        )}
      >
        <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
          <ProductCoverPhotoField
            productName={formData.name}
            value={coverPhoto}
            onChange={setCoverPhoto}
            disabled={isSubmitting}
          />
          <div className="mt-5">
          <ProductFormFields
            idPrefix={FIELD_PREFIX}
            values={formData}
            errors={errors}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          </div>
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
        onConfirm={createValidatedProduct}
        title="以零庫存建立商品？"
        description="商品建立後會顯示為已售完，仍可稍後補上庫存。"
        confirmLabel="仍要建立"
      />
    </>
  );
}
