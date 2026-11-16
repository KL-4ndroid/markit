import { APP_BRAND } from '@/lib/app-brand';
import type { Metadata } from 'next';

import { FeriaDemoApp } from '@/components/demo/FeriaDemoApp';

export const metadata: Metadata = {
  title: '操作展示版',
  description: `免登入、使用記憶體假資料的${APP_BRAND.name}操作展示。`,
};

export default function DemoPage() {
  return <FeriaDemoApp />;
}
