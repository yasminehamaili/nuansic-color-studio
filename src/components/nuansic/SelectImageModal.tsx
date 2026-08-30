import { useEffect, useRef, useState } from "react";

type Tab = "upload" | "url" | "camera";

const TABS: { id: Tab; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "url", label: "URL" },
  { id: "camera", label: "Camera" },
];

export function SelectImageModal({
  open,
  onClose,
  onImageSelected,
}: {
  open: boolean;
  onClose: () => void;
  onImageSelected: (file: File) => void;
}) {
  const [tab, setTab] = useState<Tab>("upload");
  const [dragging, setDragging] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset to the Upload tab and clear transient state each time the modal opens.
  useEffect(() => {
    if (open) {
      setTab("upload");
      setUrlValue("");
      setUrlError(null);
      setCameraError(null);
    }
  }, [open]);

  // Manage the camera stream: start when the Camera tab is active, always
  // stop when it isn't (tab change, modal close, or unmount) so the browser
  // releases the webcam.
  useEffect(() => {
    if (!open || tab !== "camera") {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (!cancelled) setCameraError("Couldn't access the camera — check your browser's permission settings.");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, tab]);

  if (!open) return null;

  const handleFiles = (files?: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) {
      onImageSelected(file);
      onClose();
    }
  };

  const loadFromUrl = async () => {
    if (!urlValue.trim()) return;
    setUrlLoading(true);
    setUrlError(null);
    try {
      const res = await fetch(urlValue.trim());
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error();
      const file = new File([blob], "image", { type: blob.type });
      onImageSelected(file);
      onClose();
    } catch {
      setUrlError(
        "Couldn't load that image — some sites block cross-origin loading. Try downloading it and uploading directly instead.",
      );
    } finally {
      setUrlLoading(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "capture.png", { type: "image/png" });
        onImageSelected(file);
        onClose();
      }
    }, "image/png");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-[16px] bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-[18px] font-bold" style={{ color: "#0B0B0B" }}>
            Select image
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[18px] transition-transform hover:scale-110"
            style={{ color: "#6B6863" }}
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex gap-2 border-b" style={{ borderColor: "#D9D9D9" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="rounded-t-[8px] px-4 py-2 font-display text-[14px] font-semibold transition-colors duration-150"
              style={{
                backgroundColor: tab === t.id ? "#F2E4D8" : "transparent",
                color: tab === t.id ? "#E87323" : "#6B6863",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "upload" && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed transition-colors duration-200"
              style={{
                borderColor: dragging ? "#E87323" : "#D9D9D9",
                backgroundColor: "#FAFAFA",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />
              <span className="font-display text-[15px]" style={{ color: "#6B6863" }}>
                Browse or drop image
              </span>
            </div>
          )}

          {tab === "url" && (
            <div className="flex h-[220px] flex-col items-center justify-center gap-3 px-2">
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadFromUrl()}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-[10px] border px-3 py-2 font-display text-[14px] outline-none"
                style={{ borderColor: "#D9D9D9", color: "#0B0B0B" }}
              />
              <button
                type="button"
                onClick={loadFromUrl}
                disabled={urlLoading || !urlValue.trim()}
                className="w-full rounded-[10px] py-2 font-display text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#E87323" }}
              >
                {urlLoading ? "Loading..." : "Load image"}
              </button>
              {urlError && (
                <p className="font-display text-[12px]" style={{ color: "#B3261E" }}>
                  {urlError}
                </p>
              )}
            </div>
          )}

          {tab === "camera" && (
            <div className="flex h-[220px] flex-col items-center justify-center gap-3">
              {cameraError ? (
                <p className="px-4 text-center font-display text-[13px]" style={{ color: "#B3261E" }}>
                  {cameraError}
                </p>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-[160px] w-full rounded-[10px] object-cover"
                    style={{ backgroundColor: "#0B0B0B" }}
                  />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="rounded-[10px] px-5 py-2 font-display text-[14px] font-semibold text-white"
                    style={{ backgroundColor: "#E87323" }}
                  >
                    Capture photo
                  </button>
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
