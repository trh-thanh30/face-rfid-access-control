import type { MediaUploaderLabels } from "./media-uploader.types";

export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const DEFAULT_MAX_FILES = 10;

export const DOCUMENT_EXTENSIONS = new Set([
  "csv",
  "doc",
  "docx",
  "odt",
  "pdf",
  "ppt",
  "pptx",
  "rtf",
  "txt",
  "xls",
  "xlsx",
]);

export const DEFAULT_LABELS: MediaUploaderLabels = {
  browse: "Choose files",
  cancel: (name) => `Cancel uploading ${name}`,
  dropzoneDescription: "Images, videos, documents, or other files",
  dropzoneTitle: "Drag and drop files here",
  fileTooLarge: (name, maximumSize) =>
    `${name} is larger than the ${maximumSize} limit.`,
  fileTypeNotAllowed: (name) => `${name} is not an accepted file type.`,
  maxFilesReached: (maximumFiles) =>
    `You can attach up to ${maximumFiles} files.`,
  remove: (name) => `Remove ${name}`,
  removeCancel: "Keep file",
  removeConfirm: "Delete file",
  removeDescription: (name) =>
    `${name} will be permanently deleted from storage. This cannot be undone.`,
  removeFailed: (name) => `Could not delete ${name}. Try again.`,
  removeTitle: "Delete uploaded file?",
  removing: "Deleting...",
  retry: (name) => `Retry uploading ${name}`,
  uploadFailed: (name) => `Could not upload ${name}. Try again.`,
  uploaded: "Uploaded",
  uploading: (name) => `Uploading ${name}`,
};
