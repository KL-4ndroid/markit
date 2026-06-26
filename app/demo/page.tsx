import type { Metadata } from 'next';
import { FeriaDemoApp } from '@/components/demo/FeriaDemoApp';

export const metadata: Metadata = {
  title: 'Féria Demo｜出攤筆記',
  description: '體驗 Féria｜出攤筆記的互動示範介面。',
};

export default function DemoPage() {
  return <FeriaDemoApp />;
}
