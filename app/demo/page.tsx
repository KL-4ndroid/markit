import type { Metadata } from 'next';

import { FeriaDemoApp } from '@/components/demo/FeriaDemoApp';

export const metadata: Metadata = {
  title: 'Feria 操作展示版',
  description: '免登入、使用記憶體假資料的 Feria 完整操作展示。',
};

export default function DemoPage() {
  return <FeriaDemoApp />;
}
