import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, MapPin, Mountain } from "lucide-react";
import { useApiQuery, mediaUrl } from "@/lib/api";
import { fmtRange } from "@/lib/geo";
import Lightbox from "@/components/Lightbox";
import { Avatar, Flag, PageLoader, SectionTitle } from "@/components/common";

const Owner = ({ o }) => (
  <div className="flex items-center gap-3 text-sm text-slate-300">
    <Avatar url={o.avatar_url} name={o.display_name} className="h-9 w-9" />
    <span>Compartido por <b>{o.display_name}</b>{o.is_public && <> · <Link to={`/u/${o.username}`} className="text-cyan-300">ver perfil</Link></>}</span>
  </div>
);

const Grid = ({ photos }) => {
  const [lb, setLb] = useState(-1);
  return (<>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="shared-gallery">
      {photos.map((p, i) => <button key={p.id} className="aspect-square overflow-hidden rounded-2xl" onClick={() => setLb(i)} data-testid={`shared-photo-${i}`}>
        {p.media_type === "video" ? <video src={mediaUrl(p.url)} className="h-full w-full object-cover" muted /> : <img src={mediaUrl(p.url)} alt={p.caption || ""} loading="lazy" className="h-full w-full object-cover" />}
      </button>)}
    </div>
    {lb >= 0 && <Lightbox photos={photos} index={lb} onClose={() => setLb(-1)} onIndex={setLb} />}
  </>);
};

const Hero = ({ cover, children }) => (
  <section className="relative h-[46vh] min-h-[320px] overflow-hidden">
    {cover ? <img src={mediaUrl(cover)} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-[#0b2a5c] to-[#090A0F]" />}
    <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-black/30 to-black/10" />
    <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-10">{children}</div>
  </section>
);

export function SharedCity() {
  const { token } = useParams();
  const { data: d, isError } = useApiQuery(["shared-city", token], `/public/cities/${token}`, { retry: false });
  if (isError) return <div className="page text-slate-400" data-testid="shared-invalid">Este enlace no es válido.</div>;
  if (!d) return <PageLoader />;
  const c = d.city;
  return (
    <div data-testid="shared-city-page">
      <Hero cover={c.cover_url}>
        <span className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-sm"><Flag code={c.country_code} />{c.country_name}</span>
        <h1 className="mt-3 font-display text-5xl font-extrabold sm:text-6xl" data-testid="shared-city-name">{c.name}</h1>
        <div className="mt-2 flex gap-4 text-sm text-slate-300"><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-cyan-300" />{fmtRange(c.visit_date, c.end_date)}</span>{c.elevation != null && <span className="flex items-center gap-1.5"><Mountain className="h-4 w-4" />{Math.round(c.elevation)} m</span>}</div>
      </Hero>
      <div className="page space-y-8 !pt-6">
        <Owner o={d.owner} />
        {c.description && <p className="max-w-3xl whitespace-pre-line text-slate-200">{c.description}</p>}
        {c.places?.length > 0 && <div className="flex flex-wrap gap-2">{c.places.map((p) => <span key={p} className="chip text-xs"><MapPin className="h-3.5 w-3.5 text-cyan-300" />{p}</span>)}</div>}
        {c.memories && <div className="card-x p-6"><p className="label-x">Recuerdos</p><p className="mt-2 whitespace-pre-line text-slate-300">{c.memories}</p></div>}
        <section><SectionTitle title="Galería" sub={`${d.photos.length} archivos`} /><Grid photos={d.photos} /></section>
      </div>
    </div>
  );
}

export function SharedTrip() {
  const { token } = useParams();
  const { data: d, isError } = useApiQuery(["shared-trip", token], `/public/trips/${token}`, { retry: false });
  if (isError) return <div className="page text-slate-400" data-testid="shared-invalid">Este enlace no es válido.</div>;
  if (!d) return <PageLoader />;
  const t = d.trip;
  return (
    <div data-testid="shared-trip-page">
      <Hero cover={t.cover_url}>
        <div className="flex gap-1.5">{t.countries.map((c) => <Flag key={c.code} code={c.code} />)}</div>
        <h1 className="mt-3 font-display text-5xl font-extrabold sm:text-6xl" data-testid="shared-trip-title">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{fmtRange(t.start_date, t.end_date)} · {t.days} días · {t.photo_count} fotos</p>
      </Hero>
      <div className="page space-y-8 !pt-6">
        <Owner o={d.owner} />
        {t.description && <p className="max-w-3xl whitespace-pre-line text-slate-200">{t.description}</p>}
        <section>
          <SectionTitle title="Ciudades" />
          <div className="flex flex-wrap gap-2">{t.cities.map((c) => <span key={c.id} className="chip"><Flag code={c.country_code} />{c.name}</span>)}</div>
        </section>
        <section><SectionTitle title="Galería" /><Grid photos={d.photos} /></section>
      </div>
    </div>
  );
}
