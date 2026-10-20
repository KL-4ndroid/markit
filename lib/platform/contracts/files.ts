export type PlatformFile = {
  filename: string;
  data: Blob;
};

export type FileOperationErrorCode = 'cancelled' | 'unavailable' | 'invalid_file' | 'busy' | 'failed' | 'cleanup_failed';

export class FileOperationError extends Error {
  constructor(public readonly code: FileOperationErrorCode) {
    const messages: Record<FileOperationErrorCode, string> = {
      cancelled: '已取消檔案匯出。',
      unavailable: '目前無法使用裝置的檔案功能，請重新開啟 App 後再試。',
      invalid_file: '此檔案無法匯出，請確認格式與大小（上限 25 MB）。',
      busy: '請先關閉目前的分享或預覽視窗，再試一次。',
      failed: '檔案操作失敗，原始資料仍保留，請稍後再試。',
      cleanup_failed: '裝置暫存檔清理未完成，請重新開啟 App 後再試。',
    };
    super(messages[code]);
    this.name = 'FileOperationError';
  }
}

export type FilePreviewResult =
  | { opened: true }
  | { opened: false; reason: 'blocked' | 'unsupported' };

export interface FilePort {
  saveFile(file: PlatformFile): Promise<void>;
  previewFile(file: PlatformFile): Promise<FilePreviewResult>;
}
