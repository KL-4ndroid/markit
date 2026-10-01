'use client';

import React, { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import type { DocumentProps } from '@react-pdf/renderer';

import type { SettlementReportPdfViewModel } from '@/lib/reporting/settlement-report-pdf-view-model';
import { getAppPlatform } from '@/lib/platform';

export type SettlementReportPdfPreviewButtonProps = {
  viewModel: SettlementReportPdfViewModel | null;
  canPreview: boolean;
};

function buildPdfFileName(viewModel: SettlementReportPdfViewModel): string {
  return `${viewModel.meta.fileNameBase || 'settlement-report'}.pdf`;
}

export function SettlementReportPdfPreviewButton({
  viewModel,
  canPreview,
}: SettlementReportPdfPreviewButtonProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDisabled = !canPreview || !viewModel || isOpening;

  const handleOpenPreview = async () => {
    if (!canPreview || !viewModel || isOpening) return;

    setIsOpening(true);
    setErrorMessage(null);

    try {
      const [{ pdf }, { SettlementReportPdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./SettlementReportPdfDocument'),
      ]);
      const documentElement = React.createElement(SettlementReportPdfDocument, {
        viewModel,
        fontSource: viewModel.font.assetPath,
      }) as React.ReactElement<DocumentProps>;
      const blob = await pdf(documentElement).toBlob();
      const preview = await getAppPlatform().files.previewFile({
        filename: buildPdfFileName(viewModel),
        data: blob,
      });

      if (!preview.opened) {
        setErrorMessage('目前無法開啟 PDF 預覽，請確認瀏覽器允許開啟新分頁後再試一次。');
      }
    } catch (error) {
      console.error('建立結算報告 PDF 失敗:', error);
      setErrorMessage('PDF 建立失敗，請稍後再試。');
    } finally {
      setIsOpening(false);
    }
  };

  if (!canPreview) return null;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleOpenPreview}
        disabled={isDisabled}
        className="inline-flex h-10 items-center justify-center gap-2 border border-accent-green-deep bg-accent-green-deep px-4 text-sm font-medium text-white transition hover:bg-accent-green disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted"
      >
        {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
        {isOpening ? '正在建立 PDF' : '預覽 PDF 報告'}
      </button>
      {errorMessage ? (
        <p className="max-w-xs text-xs leading-5 text-danger">{errorMessage}</p>
      ) : (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          報告只會在目前裝置產生，並交由裝置的 PDF 預覽器開啟。
        </p>
      )}
    </div>
  );
}
