import { APP_BRAND } from '@/lib/app-brand';
import type { Metadata } from 'next';

import { FeriaDemoApp } from '@/components/demo/FeriaDemoApp';

export const metadata: Metadata = {
  title: '免登入體驗',
  description: `使用範例資料體驗${APP_BRAND.name}，試著安排市集、記一筆收入並回顧成交。`,
};

export default function DemoPage() {
  return <FeriaDemoApp />;
}
