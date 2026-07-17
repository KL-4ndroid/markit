export type PlatformFile = {
  filename: string;
  data: Blob;
};

export type FilePreviewResult =
  | { opened: true }
  | { opened: false; reason: 'blocked' | 'unsupported' };

export interface FilePort {
  saveFile(file: PlatformFile): Promise<void>;
  previewFile(file: PlatformFile): Promise<FilePreviewResult>;
}
