import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, MapPin, Plane } from "lucide-react";
import { useApi, useApiQuery, useRefresh, mediaUrl } from "@/lib/api";
import { fmtDate, fmtRange, CONTINENT_META } from "@/lib/geo";
import AddCityDialog from "@/components/AddCityDialog";
import AddCountryDialog from "@/components/AddCountryDialog";
import Lightbox from "@/components/Lightbox";
import { Flag, PageLoader, SectionTitle } from "@/components/common";

export default function CountryDetail() {
  const { code } = useParams();
  const api = useApi();
  const refresh = useRefresh();
  const nav = useNavigate();
  const { data: d, isError } = useApiQuery(["country", code], `/countries/${code}/detail`);
  const [addCity, setAddCity] = useState(false);
  const [mark, setMark] = useState(false);
  const [edit, setEdit] = useState(false);
  const [lb, setLb] = useState(-1);
  if (isError) return <div className="page text-slate-400">País no válido.</div>;
  if (!d) return <PageLoader />;
  const { country, visited, cities, photos, trips } = d;
  const dates = [visited?.visit_date, ...cities.map((c) => c.visit_date)].filter(Boolean).sort();

  const remove = async () => {
    if (!window.confirm("¿Eliminar este país de tus visitados? Tus ciudades se conservarán.")) return;
    await api.delete(`/visited/${code}`);
    toast.success("País eliminado");
    refresh();
  };

  return (
    <div className="page space-y-10" data-testid="country-detail-page">
      <button onClick={() => nav(-1)} className="btn-ghost px-4 py-2 text-sm" data-testid="country-back-btn"><ArrowLeft className="h-4 w-4" />Volver</button>
      <section className="card-x relative overflow-hidden p-6 sm:p-8">
        {visited?.photo_url && <img src={mediaUrl(visited.photo_url)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#12141C] via-[#12141C]/85 to-transparent" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <Flag code={code} className="h-20 w-32 rounded-lg" w={320} />
          <div className="flex-1">
            <p className="label-x">{CONTINENT_META[country.continent].name}</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="country-name">{country.name}</h1>
            <p className="mt-2 text-slate-300" data-testid="country-summary">
              {visited ? "Visitado" : "Pendiente"} · {cities.length} ciudades{dates.length ? ` · ${dates.length > 1 ? `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}` : fmtDate(dates[0])}` : ""}
            </p>
            {visited?.description && <p className="mt-2 max-w-xl text-sm text-slate-400">{visited.description}</p>}
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <button className="btn-primary px-5 py-2.5 text-sm" onClick={() => setAddCity(true)} data-testid="country-add-city-btn"><Plus className="h-4 w-4" />Añadir ciudad</button>
          {visited ? (<>
            <button className="btn-ghost px-5 py-2.5 text-sm" onClick={() => setEdit(true)} data-testid="country-edit-btn"><Pencil className="h-4 w-4" />Editar visita</button>
            <button className="btn-ghost px-4 py-2.5 text-sm text-rose-300" onClick={remove} data-testid="country-delete-btn"><Trash2 className="h-4 w-4" /></button>
          </>) : <button className="btn-ghost px-5 py-2.5 text-sm" onClick={() => setMark(true)} data-testid="country-mark-visited-btn">Marcar como visitado</button>}
        </div>
      </section>

      <section>
        <SectionTitle title={`Ciudades (${cities.length})`} />
        {cities.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="country-cities-list">
            {cities.map((c) => (
              <Link key={c.id} to={`/ciudades/${c.id}`} className="card-x card-hover flex items-center gap-4 p-3" data-testid={`country-city-${c.id}`}>
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#181B28]">{c.cover_url ? <img src={mediaUrl(c.cover_url)} alt="" className="h-full w-full object-cover" /> : <MapPin className="m-5 h-6 w-6 text-cyan-300" />}</div>
                <div className="min-w-0"><p className="truncate font-display text-lg font-semibold">{c.name}</p><p className="text-xs text-slate-400">{fmtRange(c.visit_date, c.end_date)} · {c.photo_count} fotos</p></div>
              </Link>
            ))}
          </div>
        ) : <p className="text-slate-400">Aún no has registrado ciudades en {country.name}.</p>}
      </section>

      {trips.length > 0 && (
        <section>
          <SectionTitle title="Viajes" />
          <div className="flex flex-wrap gap-2">{trips.map((t) => <Link key={t.id} to={`/viajes/${t.id}`} className="chip" data-testid={`country-trip-${t.id}`}><Plane className="h-4 w-4 text-cyan-300" />{t.title}</Link>)}</div>
        </section>
      )}

      <section>
        <SectionTitle title="Fotografías del país" sub={`${photos.length} fotos`} />
        {photos.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((p, i) => <button key={p.id} onClick={() => setLb(i)} className="aspect-square overflow-hidden rounded-2xl" data-testid={`country-photo-${i}`}><img src={mediaUrl(p.url)} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}
          </div>
        ) : <p className="text-slate-400">Sube fotos desde la ficha de cada ciudad.</p>}
      </section>
      {lb >= 0 && <Lightbox photos={photos} index={lb} onClose={() => setLb(-1)} onIndex={setLb} />}
      <AddCityDialog open={addCity} onOpenChange={setAddCity} defaultCountry={code} />
      <AddCountryDialog open={mark} onOpenChange={setMark} initialCode={code} />
      <AddCountryDialog open={edit} onOpenChange={setEdit} existing={visited} />
    </div>
  );
}
