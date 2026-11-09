import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Share2, Plus, CalendarDays, Camera, MapPin } from "lucide-react";
import { useApi, useApiQuery, useRefresh, copyLink, mediaUrl } from "@/lib/api";
import { STATUS, fmtRange, fmtDate } from "@/lib/geo";
import TripDialog from "@/components/TripDialog";
import AddCityDialog from "@/components/AddCityDialog";
import PhotoGallery from "@/components/PhotoGallery";
import { Flag, PageLoader, SectionTitle } from "@/components/common";

export default function TripDetail() {
  const { id } = useParams();
  const api = useApi();
  const refresh = useRefresh();
  const nav = useNavigate();
  const { data: t, isError } = useApiQuery(["trip", id], `/trips/${id}`);
  const [edit, setEdit] = useState(false);
  const [addCity, setAddCity] = useState(false);
  if (isError) return <div className="page text-slate-400">Viaje no encontrado.</div>;
  if (!t) return <PageLoader />;
  const st = STATUS[t.status] || STATUS.pendiente;

  const del = async () => {
    if (!window.confirm("¿Eliminar este viaje? Las ciudades y fotos se conservarán sin viaje asignado.")) return;
    await api.delete(`/trips/${id}`);
    toast.success("Viaje eliminado");
    refresh();
    nav("/perfil");
  };
  const share = async () => {
    const { data } = await api.post(`/trips/${id}/share`);
    if ((await copyLink(`${window.location.origin}/compartir/viaje/${data.share_token}`, t.title)) === "copied") toast.success("Enlace del viaje copiado");
  };

  return (
    <div data-testid="trip-detail-page">
      <section className="relative h-[46vh] min-h-[320px] overflow-hidden">
        {t.cover_url ? <img src={mediaUrl(t.cover_url)} alt={t.title} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#0b2a5c] to-[#090A0F]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-black/40 to-black/20" />
        <button onClick={() => nav(-1)} className="absolute left-4 top-4 rounded-full bg-black/50 p-2.5 backdrop-blur" data-testid="trip-back-btn"><ArrowLeft className="h-5 w-5" /></button>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-10">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${st.cls}`} data-testid="trip-status">{st.label}</span>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl" data-testid="trip-title">{t.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-cyan-300" />{fmtRange(t.start_date, t.end_date)}</span>
            <span><b className="text-white">{t.days}</b> días</span>
            <span className="flex items-center gap-1.5"><Camera className="h-4 w-4 text-cyan-300" />{t.photo_count} fotos</span>
            <span className="flex gap-1.5">{t.countries.map((c) => <Flag key={c.code} code={c.code} />)}</span>
          </div>
        </div>
      </section>
      <div className="page space-y-10 !pt-6">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary px-5 py-2.5 text-sm" onClick={() => setAddCity(true)} data-testid="trip-add-city-btn"><Plus className="h-4 w-4" />Añadir ciudad</button>
          <button className="btn-ghost px-5 py-2.5 text-sm" onClick={() => setEdit(true)} data-testid="trip-edit-btn"><Pencil className="h-4 w-4" />Editar</button>
          <button className="btn-ghost px-5 py-2.5 text-sm" onClick={share} data-testid="trip-share-btn"><Share2 className="h-4 w-4" />Compartir</button>
          <button className="btn-ghost px-4 py-2.5 text-sm text-rose-300" onClick={del} data-testid="trip-delete-btn"><Trash2 className="h-4 w-4" /></button>
        </div>
        {t.description && <p className="max-w-3xl whitespace-pre-line text-slate-300" data-testid="trip-description">{t.description}</p>}

        <section>
          <SectionTitle title={`Ciudades del viaje (${t.cities.length})`} />
          {t.cities.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="trip-cities-list">
              {t.cities.map((c, i) => (
                <Link key={c.id} to={`/ciudades/${c.id}`} className="card-hover group relative h-56 overflow-hidden rounded-3xl bg-[#181B28]" data-testid={`trip-city-${c.id}`}>
                  {c.cover_url && <img src={mediaUrl(c.cover_url)} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                  <span className="absolute left-4 top-4 font-mono-j text-xs text-white/70">{String(i + 1).padStart(2, "0")}</span>
                  <div className="absolute inset-x-4 bottom-4">
                    <div className="flex items-center gap-2"><Flag code={c.country_code} /><span className="text-xs text-slate-300">{c.country_name}</span></div>
                    <p className="font-display text-2xl font-bold">{c.name}</p>
                    <p className="text-xs text-slate-400">{fmtDate(c.visit_date)} · {c.photo_count} fotos</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <button onClick={() => setAddCity(true)} className="flex w-full flex-col items-center gap-2 rounded-3xl border border-dashed border-white/15 py-10 text-slate-400 hover:border-cyan-400/40" data-testid="trip-empty-add-city">
              <MapPin className="h-7 w-7 text-cyan-300" />Añade la primera ciudad de este viaje
            </button>
          )}
        </section>
        <section>
          <SectionTitle title="Galería del viaje" sub="Todas las fotos del viaje, incluidas las de sus ciudades" />
          <PhotoGallery tripId={id} coverId={t.cover_photo_id} onSetCover={async (pid) => { await api.put(`/trips/${id}`, { cover_photo_id: pid }); refresh(); }} />
        </section>
      </div>
      <TripDialog open={edit} onOpenChange={setEdit} trip={t} />
      <AddCityDialog open={addCity} onOpenChange={setAddCity} tripId={id} defaultCountry={t.country_codes?.length === 1 ? t.country_codes[0] : undefined} />
    </div>
  );
}
