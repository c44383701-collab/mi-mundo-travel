import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, MapPin, Calendar } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { fmtDate } from "@/lib/geo";

export default function Lightbox({ photos, index, onClose, onIndex, children }) {
  const p = photos[index];
  useEffect(() => {
    const k = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [index, photos.length, onClose, onIndex]);
  if (!p) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm" data-testid="lightbox">
      <div className="flex items-center justify-between p-4">
        <span className="font-mono-j text-xs text-slate-400">{index + 1} / {photos.length}</span>
        <button onClick={onClose} className="rounded-full bg-white/10 p-2.5 hover:bg-white/20" data-testid="lightbox-close"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-2 min-h-0">
        {p.media_type === "video"
          ? <video src={mediaUrl(p.url)} controls className="max-h-full max-w-full rounded-xl" />
          : <img src={mediaUrl(p.url)} alt={p.caption || ""} className="max-h-full max-w-full rounded-xl object-contain" data-testid="lightbox-image" />}
        {photos.length > 1 && (<>
          <button onClick={() => onIndex((index - 1 + photos.length) % photos.length)} className="absolute left-3 rounded-full bg-white/10 p-3 hover:bg-white/20" data-testid="lightbox-prev"><ChevronLeft /></button>
          <button onClick={() => onIndex((index + 1) % photos.length)} className="absolute right-3 rounded-full bg-white/10 p-3 hover:bg-white/20" data-testid="lightbox-next"><ChevronRight /></button>
        </>)}
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-3 p-4">
        {p.caption && <p className="text-center text-sm text-slate-200" data-testid="lightbox-caption">{p.caption}</p>}
        <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-400">
          {p.taken_at && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(p.taken_at)}</span>}
          {p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.location}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}
