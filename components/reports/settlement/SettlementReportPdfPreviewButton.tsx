'use client';

import React, { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';

import { SettlementReportPdfDocument } from './SettlementReportPdfDocument';
import type { SettlementReportPdfViewModel } from '@/lib/reporting/settlement-report-pdf-view-model';

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
      const documentElement = React.createElement(SettlementReportPdfDocument, {
        viewModel,
        fontSource: viewModel.font.assetPath,
      }) as React.ReactElement<DocumentProps>;
      const blob = await pdf(documentElement).toBlob();
      const url = URL.createObjectURL(blob);
      const openedWindow = window.open(url, '_blank');

      if (!openedWindow) {
        URL.revokeObjectURL(url);
        setErrorMessage('瀏覽器封鎖了 PDF 預覽視窗，請允許此網站開啟新分頁後再試一次。');
        return;
      }

      openedWindow.opener = null;
      try {
        openedWindow.document.title = buildPdfFileName(viewModel);
      } catch {
        // Some browser PDF viewers do not expose the blob document immediately.
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error('開啟結算報告 PDF 預覽失敗:', error);
      setErrorMessage('PDF 預覽產生失敗，請稍後再試。');
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
        className="inline-flex h-10 items-center justify-center gap-2 border border-[#26392F] bg-[#26392F] px-4 text-sm font-medium text-white transition hover:bg-accent-green disabled:cursor-not-allowed disabled:border-[#BDB5AA] disabled:bg-[#BDB5AA]"
      >
        {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
        {isOpening ? '正在產生 PDF' : '開啟 PDF 預覽'}
      </button>
      {errorMessage ? (
        <p className="max-w-xs text-xs leading-5 text-danger">{errorMessage}</p>
      ) : (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          會以瀏覽器 PDF viewer 開啟，不會上傳或儲存報告。
        </p>
      )}
    </div>
  );
}
