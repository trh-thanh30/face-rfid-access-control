import { DOCUMENT_EXTENSIONS } from "./media-uploader.constants";
import type { MediaUploadKind } from "./media-uploader.types";

export function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function getMediaKind(
  file: Pick<File, "name" | "type">,
): MediaUploadKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";

  if (
    DOCUMENT_EXTENSIONS.has(extensionOf(file.name)) ||
    file.type.startsWith("text/") ||
    file.type.includes("document") ||
    file.type.includes("pdf") ||
    file.type.includes("presentation") ||
    file.type.includes("sheet")
  ) {
    return "document";
  }

  return "file";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function matchesAccept(file: File, accept: string) {
  const rules = accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);

  if (rules.length === 0 || rules.includes("*/*")) return true;

  const mimeType = file.type.toLowerCase();
  const extension = `.${extensionOf(file.name)}`;

  return rules.some((rule) => {
    if (rule.startsWith(".")) return extension === rule;
    if (rule.endsWith("/*")) return mimeType.startsWith(rule.slice(0, -1));
    return mimeType === rule;
  });
}
