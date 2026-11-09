import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Star, Trash2, ArrowLeft, ArrowRight, ArrowUpDown, Play, ImageIcon } from "lucide-react";
import { useApi, useApiQuery, useRefresh, errMsg, uploadFiles, mediaUrl } from "@/lib/api";
import Lightbox from "./Lightbox";
import { inputCls } from "./common";

const PhotoEditor = ({ photo, onSaved, onDelete, onCover, isCover }) => {
  const api = useApi();
  const [f, setF] = useState({});
  useEffect(() => setF({ caption: photo.caption || "", taken_at: photo.taken_at || "", location: photo.location || "" }), [photo]);
  const save = async () => {
    try {
      await api.put(`/photos/${photo.id}`, { caption: f.caption || null, taken_at: f.taken_at || null, location: f.location || null });
      toast.success("Foto actualizada");
      onSaved();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="grid gap-2 rounded-2xl bg-white/5 p-3 sm:grid-cols-[1fr_150px_1fr_auto]" data-testid="photo-editor">
      <input className={inputCls} placeholder="Descripción" value={f.caption || ""} onChange={(e) => setF({ ...f, caption: e.target.value })} data-testid="photo-editor-caption" />
      <input type="date" className={inputCls} value={f.taken_at || ""} onChange={(e) => setF({ ...f, taken_at: e.target.value })} data-testid="photo-editor-date" />
      <input className={inputCls} placeholder="Ubicación" value={f.location || ""} onChange={(e) => setF({ ...f, location: e.target.value })} data-testid="photo-editor-location" />
      <div className="flex gap-2">
        <button className="btn-primary px-4 py-2 text-sm" onClick={save} data-testid="photo-editor-save">Guardar</button>
        {onCover && photo.media_type === "image" && (
          <button className={`btn-ghost px-3 py-2 ${isCover ? "text-amber-300" : ""}`} onClick={onCover} title="Usar como portada" data-testid="photo-editor-cover"><Star className="h-4 w-4" fill={isCover ? "currentColor" : "none"} /></button>
        )}
        <button className="btn-ghost px-3 py-2 text-rose-300" onClick={onDelete} title="Eliminar" data-testid="photo-editor-delete"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

export default function PhotoGallery({ cityId, tripId, coverId, onSetCover, editable = true }) {
  const api = useApi();
  const refresh = useRefresh();
  const params = cityId ? `city_id=${cityId}` : `trip_id=${tripId}`;
  const { data: photos = [] } = useApiQuery(["photos", cityId || tripId], `/photos?${params}`);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(-1);
  const [sorting, setSorting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const input = useRef(null);
  useEffect(() => setItems(photos), [photos]);

  const onFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const up = await uploadFiles(api, files, cityId ? { city_id: cityId } : { trip_id: tripId });
      toast.success(`${up.length} archivo(s) subidos`);
      refresh();
    } catch (e) { toast.error(errMsg(e, "No se pudieron subir las fotos")); }
    setUploading(false);
    input.current.value = "";
  };
  const move = async (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    await api.post("/photos/reorder", { ids: next.map((p) => p.id) });
    refresh();
  };
  const remove = async (p) => {
    if (!window.confirm("¿Eliminar esta fotografía?")) return;
    await api.delete(`/photos/${p.id}`);
    toast.success("Foto eliminada");
    setOpen(-1);
    refresh();
  };

  return (
    <div data-testid="photo-gallery">
      {editable && (
        <div className="mb-4 flex flex-wrap gap-2">
          <input ref={input} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => onFiles([...e.target.files])} data-testid="gallery-file-input" />
          <button className="btn-primary px-4 py-2 text-sm" onClick={() => input.current.click()} disabled={uploading} data-testid="gallery-upload-btn">
            <Upload className="h-4 w-4" />{uploading ? "Subiendo…" : "Subir fotografías"}
          </button>
          {items.length > 1 && cityId && (
            <button className={`btn-ghost px-4 py-2 text-sm ${sorting ? "border-cyan-400/50 text-cyan-300" : ""}`} onClick={() => setSorting(!sorting)} data-testid="gallery-sort-toggle">
              <ArrowUpDown className="h-4 w-4" />{sorting ? "Listo" : "Ordenar"}
            </button>
          )}
        </div>
      )}
      {!items.length ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-white/10 py-12 text-slate-500" data-testid="gallery-empty">
          <ImageIcon className="h-8 w-8" /><p className="text-sm">Aún no hay fotografías</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-[#181B28]" data-testid={`gallery-item-${i}`}>
              <button className="h-full w-full" onClick={() => !sorting && setOpen(i)} data-testid={`gallery-open-${i}`}>
                {p.media_type === "video"
                  ? <div className="relative h-full w-full"><video src={mediaUrl(p.url)} className="h-full w-full object-cover" muted /><Play className="absolute inset-0 m-auto h-10 w-10 text-white/90" /></div>
                  : <img src={mediaUrl(p.url)} alt={p.caption || ""} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
              </button>
              {coverId === p.id && <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-black">PORTADA</span>}
              {sorting && (
                <div className="absolute inset-x-2 bottom-2 flex justify-between">
                  <button className="rounded-full bg-black/70 p-2" onClick={() => move(i, -1)} data-testid={`gallery-move-left-${i}`}><ArrowLeft className="h-4 w-4" /></button>
                  <button className="rounded-full bg-black/70 p-2" onClick={() => move(i, 1)} data-testid={`gallery-move-right-${i}`}><ArrowRight className="h-4 w-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {open >= 0 && (
        <Lightbox photos={items} index={open} onClose={() => setOpen(-1)} onIndex={setOpen}>
          {editable && items[open] && (
            <PhotoEditor photo={items[open]} onSaved={refresh} onDelete={() => remove(items[open])} isCover={coverId === items[open].id}
              onCover={onSetCover ? async () => { await onSetCover(items[open].id); toast.success("Portada actualizada"); } : null} />
          )}
        </Lightbox>
      )}
    </div>
  );
}
