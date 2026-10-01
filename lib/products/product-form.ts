import type { Product, ProductCategory, ProductCreatedPayload } from '@/types/db';

export interface ProductFormValues {
  name: string;
  category: ProductCategory;
  price: number;
  cost: number;
  stock: number;
  unlimitedStock: boolean;
  description: string;
  isActive: boolean;
}

export type ProductFormErrorKey = 'name' | 'price' | 'cost' | 'stock';
export type ProductFormErrors = Partial<Record<ProductFormErrorKey, string>>;

const PRODUCT_ERROR_ORDER: ProductFormErrorKey[] = ['name', 'price', 'cost', 'stock'];

export function createEmptyProductFormValues(): ProductFormValues {
  return {
    name: '',
    category: 'handmade',
    price: 0,
    cost: 0,
    stock: 0,
    unlimitedStock: true,
    description: '',
    isActive: true,
  };
}

export function createProductFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    category: product.category,
    price: Number(product.price || 0),
    cost: Number(product.cost || 0),
    stock: Number(product.stock || 0),
    unlimitedStock: Boolean(product.unlimitedStock),
    description: product.description || '',
    isActive: product.isActive,
  };
}

export function validateProductForm(
  values: ProductFormValues,
  options: { requireIdentity?: boolean } = {},
): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const requireIdentity = options.requireIdentity ?? true;

  if (requireIdentity && !values.name.trim()) {
    errors.name = '請輸入商品名稱';
  }

  if (!Number.isFinite(values.price) || values.price <= 0) {
    errors.price = '售價必須大於 0';
  }

  if (requireIdentity && (!Number.isFinite(values.cost) || values.cost < 0)) {
    errors.cost = '成本不可小於 0';
  }

  if (!values.unlimitedStock && (!Number.isFinite(values.stock) || values.stock < 0)) {
    errors.stock = '庫存不可小於 0';
  }

  return errors;
}

export function getFirstProductFormError(errors: ProductFormErrors): ProductFormErrorKey | null {
  return PRODUCT_ERROR_ORDER.find(field => Boolean(errors[field])) ?? null;
}

export function toProductCreatedPayload(values: ProductFormValues): ProductCreatedPayload {
  return {
    name: values.name.trim(),
    category: values.category,
    price: values.price,
    cost: values.cost,
    stock: values.unlimitedStock ? 0 : values.stock,
    unlimitedStock: values.unlimitedStock,
    description: values.description.trim(),
  };
}
