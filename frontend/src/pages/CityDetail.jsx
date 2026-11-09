import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Share2, CalendarDays, Mountain, MapPin, Send, Plane } from "lucide-react";
import { useApi, useApiQuery, useRefresh, copyLink, mediaUrl, errMsg } from "@/lib/api";
import { fmtRange, fmtDate } from "@/lib/geo";
import PhotoGallery from "@/components/PhotoGallery";
import CityEditDialog from "@/components/CityEditDialog";
import { Flag, PageLoader, SectionTitle, inputCls } from "@/components/common";

export default function CityDetail() {
  const { id } = useParams();
  const api = useApi();
  const refresh = useRefresh();
  const nav = useNavigate();
  const { data: c, isError } = useApiQuery(["city", id], `/cities/${id}`);
  const [edit, setEdit] = useState(false);
  const [comment, setComment] = useState("");
  if (isError) return <div className="page text-slate-400">Ciudad no encontrada.</div>;
  if (!c) return <PageLoader />;

  const del = async () => {
    if (!window.confirm(`¿Eliminar ${c.name} y su galería?`)) return;
    await api.delete(`/cities/${id}`);
    toast.success("Ciudad eliminada");
    refresh();
    nav(-1);
  };
  const share = async () => {
    const { data } = await api.post(`/cities/${id}/share`);
    if ((await copyLink(`${window.location.origin}/compartir/ciudad/${data.share_token}`, c.name)) === "copied") toast.success("Enlace de la galería copiado");
  };
  const addComment = async () => {
    if (!comment.trim()) return;
    try { await api.post(`/cities/${id}/comments`, { text: comment }); setComment(""); refresh(); } catch (e) { toast.error(errMsg(e)); }
  };
  const delComment = async (cid) => { await api.delete(`/cities/${id}/comments/${cid}`); refresh(); };

  return (
    <div data-testid="city-detail-page">
      <section className="relative h-[52vh] min-h-[340px] overflow-hidden">
        {c.cover_url ? <img src={mediaUrl(c.cover_url)} alt={c.name} className="absolute inset-0 h-full w-full object-cover" data-testid="city-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#003a66] to-[#090A0F]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-black/30 to-black/20" />
        <button onClick={() => nav(-1)} className="absolute left-4 top-4 rounded-full bg-black/50 p-2.5 backdrop-blur" data-testid="city-back-btn"><ArrowLeft className="h-5 w-5" /></button>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-10">
          <Link to={`/mundo/pais/${c.country_code}`} className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-sm backdrop-blur" data-testid="city-country-link"><Flag code={c.country_code} />{c.country_name}</Link>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight sm:text-6xl" data-testid="city-name">{c.name}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-cyan-300" />{fmtRange(c.visit_date, c.end_date)}</span>
            {c.elevation != null && <span className="flex items-center gap-1.5"><Mountain className="h-4 w-4 text-emerald-300" />{Math.round(c.elevation)} m</span>}
            {c.trip && <Link to={`/viajes/${c.trip.id}`} className="flex items-center gap-1.5 text-cyan-300" data-testid="city-trip-link"><Plane className="h-4 w-4" />{c.trip.title}</Link>}
          </div>
        </div>
      </section>
      <div className="page space-y-10 !pt-6">
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost px-5 py-2.5 text-sm" onClick={() => setEdit(true)} data-testid="city-edit-btn"><Pencil className="h-4 w-4" />Editar</button>
          <button className="btn-ghost px-5 py-2.5 text-sm" onClick={share} data-testid="city-share-btn"><Share2 className="h-4 w-4" />Compartir galería</button>
          <button className="btn-ghost px-4 py-2.5 text-sm text-rose-300" onClick={del} data-testid="city-delete-btn"><Trash2 className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-x p-6 lg:col-span-2">
            <p className="label-x">Descripción personal</p>
            <p className="mt-2 whitespace-pre-line text-slate-200" data-testid="city-description">{c.description || "Sin descripción todavía."}</p>
            <p className="label-x mt-6">Experiencias y recuerdos</p>
            <p className="mt-2 whitespace-pre-line text-slate-300" data-testid="city-memories">{c.memories || "Añade tus recuerdos desde «Editar»."}</p>
          </div>
          <div className="card-x p-6">
            <p className="label-x">Lugares visitados</p>
            <div className="mt-3 flex flex-wrap gap-2" data-testid="city-places">
              {(c.places || []).length ? c.places.map((p) => <span key={p} className="chip text-xs"><MapPin className="h-3.5 w-3.5 text-cyan-300" />{p}</span>) : <p className="text-sm text-slate-500">Ninguno aún</p>}
            </div>
          </div>
        </div>
        <section>
          <SectionTitle title="Galería" sub={`${c.photo_count} archivos`} />
          <PhotoGallery cityId={id} coverId={c.cover_photo_id} onSetCover={async (pid) => { await api.put(`/cities/${id}`, { cover_photo_id: pid }); refresh(); }} />
        </section>
        <section>
          <SectionTitle title="Comentarios personales" />
          <div className="space-y-3" data-testid="city-comments">
            {(c.comments || []).map((cm) => (
              <div key={cm.id} className="card-x flex items-start gap-3 p-4">
                <div className="flex-1"><p className="text-sm text-slate-200">{cm.text}</p><p className="mt-1 text-[11px] text-slate-500">{fmtDate(cm.created_at)}</p></div>
                <button onClick={() => delComment(cm.id)} className="text-slate-500 hover:text-rose-300" data-testid={`city-comment-delete-${cm.id}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Escribe una nota o comentario…" data-testid="city-comment-input" />
              <button className="btn-primary px-4" onClick={addComment} data-testid="city-comment-submit"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
      </div>
      <CityEditDialog open={edit} onOpenChange={setEdit} city={c} />
    </div>
  );
}
