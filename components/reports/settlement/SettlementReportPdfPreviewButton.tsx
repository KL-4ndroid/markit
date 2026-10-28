'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import type { DocumentProps } from '@react-pdf/renderer';

import type { SettlementReportPdfViewModel } from '@/lib/reporting/settlement-report-pdf-view-model';
import { previewPlatformFile, savePlatformFile } from '@/lib/platform/file-operations';
import { FileOperationError } from '@/lib/platform/contracts/files';
import { createPdfFileActions } from '@/lib/reporting/pdf-file-actions';

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const actions = useRef<ReturnType<typeof createPdfFileActions<SettlementReportPdfViewModel>> | null>(null);
  if (!actions.current) actions.current = createPdfFileActions<SettlementReportPdfViewModel>();
  const current = useRef<{ model: SettlementReportPdfViewModel | null; allowed: boolean } | null>(null);
  current.current = { model: viewModel, allowed: canPreview };
  useEffect(() => {
    current.current = { model: viewModel, allowed: canPreview };
    return () => { current.current = null; };
  }, [viewModel, canPreview]);

  const isDisabled = !canPreview || !viewModel || isOpening;

  const handleFileAction = async (action: 'preview' | 'save') => {
    if (!canPreview || !viewModel || isOpening) return;
    if (inFlight.current) return;
    inFlight.current = true;

    setIsOpening(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await actions.current!.run({
        model: viewModel,
        action,
        isCurrent: () => current.current?.allowed === true && current.current.model === viewModel,
        files: { previewFile: previewPlatformFile, saveFile: savePlatformFile },
        build: async () => {
          const [{ pdf }, { SettlementReportPdfDocument }] = await Promise.all([
            import('@react-pdf/renderer'),
            import('./SettlementReportPdfDocument'),
          ]);
          const documentElement = React.createElement(SettlementReportPdfDocument, {
            viewModel,
            fontSource: viewModel.font.assetPath,
          }) as React.ReactElement<DocumentProps>;
          const blob = await pdf(documentElement).toBlob();
          return { filename: buildPdfFileName(viewModel), data: blob };
        },
      });
      if (result === 'saved') {
        setStatusMessage('PDF 已交由裝置儲存，請查看下載或分享結果。');
        return;
      }
      if (result === 'blocked' || result === 'unsupported') {
        setErrorMessage(result === 'blocked'
          ? '無法開啟預覽，請允許開啟新分頁，或選擇「儲存 PDF」。'
          : '目前裝置無法開啟預覽，可以改用「儲存 PDF」。');
      }
    } catch (error) {
      if (current.current?.allowed && current.current.model === viewModel) {
        setErrorMessage(error instanceof FileOperationError ? error.message : 'PDF 建立失敗，請稍後再試。');
      }
    } finally {
      inFlight.current = false;
      setIsOpening(false);
    }
  };

  if (!canPreview) return null;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => handleFileAction('preview')}
        disabled={isDisabled}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-accent-green-deep bg-accent-green-deep px-4 text-sm font-medium text-white transition hover:bg-accent-green disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted"
      >
        {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
        {isOpening ? '正在建立 PDF' : '預覽 PDF 報告'}
      </button>
      <button type="button" onClick={() => handleFileAction('save')} disabled={isDisabled}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-accent-green-deep px-4 text-sm font-medium text-accent-green-deep disabled:cursor-not-allowed disabled:opacity-50">
        <Download className="h-4 w-4" aria-hidden="true" />儲存 PDF
      </button>
      </div>
      {errorMessage ? (
        <p className="max-w-xs text-xs leading-5 text-danger" role="alert">{errorMessage}</p>
      ) : statusMessage ? (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground" role="status">{statusMessage}</p>
      ) : (
        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          報告在目前裝置產生，可預覽或儲存。
        </p>
      )}
    </div>
  );
}
