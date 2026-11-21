import { File, FileText, Image as ImageIcon, Video } from "lucide-react";
import type { MediaUploadKind } from "./media-uploader.types";

function MediaKindIcon({ kind }: { kind: MediaUploadKind }) {
  const className = "size-6 text-muted-foreground";

  if (kind === "image") return <ImageIcon aria-hidden className={className} />;
  if (kind === "video") return <Video aria-hidden className={className} />;
  if (kind === "document") {
    return <FileText aria-hidden className={className} />;
  }
  return <File aria-hidden className={className} />;
}

export function MediaPreview({
  kind,
  name,
  url,
}: {
  kind: MediaUploadKind;
  name: string;
  url?: string;
}) {
  if (kind === "image" && url) {
    return <img alt="" className="size-full object-cover" src={url} />;
  }

  if (kind === "video" && url) {
    return (
      <video
        aria-label={name}
        className="size-full object-cover"
        muted
        preload="metadata"
        src={url}
      />
    );
  }

  return (
    <div className="flex size-full items-center justify-center bg-muted">
      <MediaKindIcon kind={kind} />
    </div>
  );
}
