"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "../button";
import { ConfirmDialog } from "../confirm-dialog";
import { cn } from "../lib/utils";
import {
  DEFAULT_LABELS,
  DEFAULT_MAX_FILES,
  DEFAULT_MAX_FILE_SIZE,
} from "./media-uploader.constants";
import type {
  MediaUploaderProps,
  UploadedMediaAsset,
} from "./media-uploader.types";
import { formatBytes } from "./media-uploader.utils";
import { MediaPreview } from "./media-preview";
import { useMediaUploadQueue } from "./use-media-upload-queue";

export function MediaUploader({
  accept = "*/*",
  allowedKinds = ["image", "video", "document", "file"],
  assets,
  className,
  disabled = false,
  labels: labelOverrides,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  multiple = true,
  onAssetsChange,
  onRemove,
  onUploadingChange,
  onUpload,
}: MediaUploaderProps) {
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelOverrides }),
    [labelOverrides],
  );
  const [dragActive, setDragActive] = useState(false);
  const [assetPendingRemoval, setAssetPendingRemoval] =
    useState<UploadedMediaAsset>();
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    addFiles,
    cancelUpload,
    canAddMore,
    error,
    queue,
    removeAsset,
    setError,
    startUpload,
  } = useMediaUploadQueue({
    accept,
    allowedKinds,
    assets,
    labels,
    maxFileSize,
    maxFiles,
    multiple,
    onAssetsChange,
    onUploadingChange,
    onUpload,
  });

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    addFiles(Array.from(event.dataTransfer.files));
  };

  const handleRemove = async () => {
    if (!assetPendingRemoval || !onRemove) return;
    setRemoving(true);
    setError(undefined);

    try {
      await onRemove(assetPendingRemoval);
      const nextAssets = removeAsset(assetPendingRemoval.id);
      onAssetsChange(nextAssets);
      setAssetPendingRemoval(undefined);
    } catch {
      setError(labels.removeFailed(assetPendingRemoval.name));
      setAssetPendingRemoval(undefined);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {canAddMore ? (
        <div
          aria-disabled={disabled}
          className={cn(
            "flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-input bg-card px-5 py-7 text-center transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            dragActive && "border-primary bg-primary/5",
            disabled &&
              "cursor-not-allowed bg-disabled text-disabled-foreground",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!disabled) setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDragActive(false);
            }
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
            <UploadCloud aria-hidden className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {labels.dropzoneTitle}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {labels.dropzoneDescription}
          </p>
          <Button
            className="mt-4"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {labels.browse}
          </Button>
          <input
            ref={inputRef}
            accept={accept}
            className="sr-only"
            disabled={disabled}
            multiple={multiple}
            onChange={handleInputChange}
            tabIndex={-1}
            type="file"
          />
        </div>
      ) : null}

      {error ? (
        <p
          className="flex items-start gap-2 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      {assets.length > 0 || queue.length > 0 ? (
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
          {assets.map((asset) => (
            <li
              className="overflow-hidden rounded-lg border border-border bg-card shadow-xs"
              key={asset.id}
            >
              <div className="relative aspect-video overflow-hidden border-b border-border bg-muted">
                <MediaPreview
                  kind={asset.kind}
                  name={asset.name}
                  url={asset.url}
                />
                {onRemove ? (
                  <Button
                    aria-label={labels.remove(asset.name)}
                    className="absolute right-2 top-2 rounded-full bg-card/95 shadow-sm"
                    disabled={disabled || removing}
                    onClick={() => setAssetPendingRemoval(asset)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="flex items-start gap-3 p-3">
                <CheckCircle2
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-success"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {asset.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {labels.uploaded}
                    {asset.size === undefined
                      ? null
                      : ` · ${formatBytes(asset.size)}`}
                  </p>
                </div>
              </div>
            </li>
          ))}

          {queue.map((item) => (
            <li
              className="overflow-hidden rounded-lg border border-border bg-card shadow-xs"
              key={item.clientId}
            >
              <div className="relative aspect-video overflow-hidden border-b border-border bg-muted">
                <MediaPreview
                  kind={item.kind}
                  name={item.file.name}
                  url={item.previewUrl}
                />
                <Button
                  aria-label={labels.cancel(item.file.name)}
                  className="absolute right-2 top-2 rounded-full bg-card/95 shadow-sm"
                  onClick={() => cancelUpload(item)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <X aria-hidden className="size-4" />
                </Button>
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-start gap-3">
                  {item.status === "uploading" ? (
                    <LoaderCircle
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 animate-spin text-primary"
                    />
                  ) : (
                    <AlertCircle
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-destructive"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.file.name}
                    </p>
                    <p
                      className={cn(
                        "text-xs text-muted-foreground",
                        item.status === "error" && "text-destructive",
                      )}
                    >
                      {item.status === "error"
                        ? item.error
                        : `${labels.uploading(item.file.name)} · ${item.progress}%`}
                    </p>
                  </div>
                  {item.status === "error" ? (
                    <Button
                      aria-label={labels.retry(item.file.name)}
                      onClick={() => void startUpload(item)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <RefreshCw aria-hidden className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <div
                  aria-label={labels.uploading(item.file.name)}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={item.progress}
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                >
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary transition-[width]",
                      item.status === "error" && "bg-destructive",
                    )}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        cancelLabel={labels.removeCancel}
        confirmDisabled={removing}
        confirmLabel={removing ? labels.removing : labels.removeConfirm}
        description={labels.removeDescription(assetPendingRemoval?.name ?? "")}
        onConfirm={handleRemove}
        onOpenChange={(open) => {
          if (!open && !removing) setAssetPendingRemoval(undefined);
        }}
        open={Boolean(assetPendingRemoval)}
        title={labels.removeTitle}
      />
    </div>
  );
}
