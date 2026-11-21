export type MediaUploadKind = "image" | "video" | "document" | "file";

export type UploadedMediaAsset = {
  id: string;
  kind: MediaUploadKind;
  mimeType: string;
  name: string;
  size?: number;
  url: string;
};

export type MediaUploadContext = {
  kind: MediaUploadKind;
  onProgress: (progress: number) => void;
  signal: AbortSignal;
};

export type MediaUploaderLabels = {
  browse: string;
  cancel: (name: string) => string;
  dropzoneDescription: string;
  dropzoneTitle: string;
  fileTooLarge: (name: string, maximumSize: string) => string;
  fileTypeNotAllowed: (name: string) => string;
  maxFilesReached: (maximumFiles: number) => string;
  remove: (name: string) => string;
  removeCancel: string;
  removeConfirm: string;
  removeDescription: (name: string) => string;
  removeFailed: (name: string) => string;
  removeTitle: string;
  removing: string;
  retry: (name: string) => string;
  uploadFailed: (name: string) => string;
  uploaded: string;
  uploading: (name: string) => string;
};

export type MediaUploaderProps = {
  accept?: string;
  allowedKinds?: readonly MediaUploadKind[];
  assets: readonly UploadedMediaAsset[];
  className?: string;
  disabled?: boolean;
  labels?: Partial<MediaUploaderLabels>;
  maxFileSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  onAssetsChange: (assets: UploadedMediaAsset[]) => void;
  onRemove?: (asset: UploadedMediaAsset) => Promise<void>;
  onUploadingChange?: (uploading: boolean) => void;
  onUpload: (
    file: File,
    context: MediaUploadContext,
  ) => Promise<UploadedMediaAsset>;
};
