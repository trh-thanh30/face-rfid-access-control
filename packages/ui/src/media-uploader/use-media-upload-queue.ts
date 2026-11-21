import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MediaUploadKind,
  MediaUploaderLabels,
  MediaUploaderProps,
  UploadedMediaAsset,
} from "./media-uploader.types";
import {
  clampProgress,
  formatBytes,
  getMediaKind,
  matchesAccept,
} from "./media-uploader.utils";

type UploadStatus = "error" | "uploading";

export type UploadQueueItem = {
  clientId: string;
  error?: string;
  file: File;
  kind: MediaUploadKind;
  previewUrl?: string;
  progress: number;
  status: UploadStatus;
};

type UseMediaUploadQueueOptions = Pick<
  MediaUploaderProps,
  "assets" | "onAssetsChange" | "onUploadingChange" | "onUpload"
> &
  Required<
    Pick<
      MediaUploaderProps,
      "accept" | "allowedKinds" | "maxFileSize" | "maxFiles" | "multiple"
    >
  > & {
    labels: MediaUploaderLabels;
  };

export function useMediaUploadQueue({
  accept = "*/*",
  allowedKinds = ["image", "video", "document", "file"],
  assets,
  labels,
  maxFileSize,
  maxFiles,
  multiple = true,
  onAssetsChange,
  onUploadingChange,
  onUpload,
}: UseMediaUploadQueueOptions) {
  const [error, setError] = useState<string>();
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const assetsRef = useRef<UploadedMediaAsset[]>([...assets]);
  const controllersRef = useRef(new Map<string, AbortController>());
  const previewUrlsRef = useRef(new Set<string>());
  const uploading = queue.some((item) => item.status === "uploading");
  const canAddMore = assets.length + queue.length < maxFiles;

  useEffect(() => {
    assetsRef.current = [...assets];
  }, [assets]);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [onUploadingChange, uploading]);

  useEffect(
    () => () => {
      controllersRef.current.forEach((controller) => controller.abort());
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const releasePreview = useCallback((previewUrl?: string) => {
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl);
    previewUrlsRef.current.delete(previewUrl);
  }, []);

  const startUpload = useCallback(
    async (item: UploadQueueItem) => {
      const controller = new AbortController();
      controllersRef.current.set(item.clientId, controller);
      setQueue((current) =>
        current.map((candidate) =>
          candidate.clientId === item.clientId
            ? {
                ...candidate,
                error: undefined,
                progress: 0,
                status: "uploading",
              }
            : candidate,
        ),
      );

      try {
        const uploadedAsset = await onUpload(item.file, {
          kind: item.kind,
          onProgress: (progress) => {
            setQueue((current) =>
              current.map((candidate) =>
                candidate.clientId === item.clientId
                  ? { ...candidate, progress: clampProgress(progress) }
                  : candidate,
              ),
            );
          },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const nextAssets = [...assetsRef.current, uploadedAsset];
        assetsRef.current = nextAssets;
        onAssetsChange(nextAssets);
        setQueue((current) =>
          current.filter((candidate) => candidate.clientId !== item.clientId),
        );
        releasePreview(item.previewUrl);
      } catch {
        if (controller.signal.aborted) return;
        setQueue((current) =>
          current.map((candidate) =>
            candidate.clientId === item.clientId
              ? {
                  ...candidate,
                  error: labels.uploadFailed(item.file.name),
                  status: "error",
                }
              : candidate,
          ),
        );
      } finally {
        controllersRef.current.delete(item.clientId);
      }
    },
    [labels, onAssetsChange, onUpload, releasePreview],
  );

  const addFiles = useCallback(
    (selectedFiles: File[]) => {
      setError(undefined);
      const availableSlots = Math.max(
        0,
        maxFiles - assetsRef.current.length - queue.length,
      );
      const requestedFiles = multiple
        ? selectedFiles
        : selectedFiles.slice(0, 1);

      if (availableSlots === 0 || requestedFiles.length > availableSlots) {
        setError(labels.maxFilesReached(maxFiles));
      }

      const acceptedFiles = requestedFiles.slice(0, availableSlots);
      const nextItems: UploadQueueItem[] = [];

      for (const file of acceptedFiles) {
        const kind = getMediaKind(file);

        if (!allowedKinds.includes(kind) || !matchesAccept(file, accept)) {
          setError(labels.fileTypeNotAllowed(file.name));
          continue;
        }

        if (file.size > maxFileSize) {
          setError(labels.fileTooLarge(file.name, formatBytes(maxFileSize)));
          continue;
        }

        const previewUrl =
          kind === "image" || kind === "video"
            ? URL.createObjectURL(file)
            : undefined;
        if (previewUrl) previewUrlsRef.current.add(previewUrl);

        nextItems.push({
          clientId: crypto.randomUUID(),
          file,
          kind,
          previewUrl,
          progress: 0,
          status: "uploading",
        });
      }

      if (nextItems.length === 0) return;
      setQueue((current) => [...current, ...nextItems]);
      nextItems.forEach((item) => void startUpload(item));
    },
    [
      accept,
      allowedKinds,
      labels,
      maxFileSize,
      maxFiles,
      multiple,
      queue.length,
      startUpload,
    ],
  );

  const cancelUpload = useCallback(
    (item: UploadQueueItem) => {
      controllersRef.current.get(item.clientId)?.abort();
      controllersRef.current.delete(item.clientId);
      setQueue((current) =>
        current.filter((candidate) => candidate.clientId !== item.clientId),
      );
      releasePreview(item.previewUrl);
    },
    [releasePreview],
  );

  const removeAsset = useCallback((assetId: string) => {
    assetsRef.current = assetsRef.current.filter(
      (asset) => asset.id !== assetId,
    );
    return assetsRef.current;
  }, []);

  return {
    addFiles,
    cancelUpload,
    canAddMore,
    error,
    queue,
    removeAsset,
    setError,
    startUpload,
  };
}
