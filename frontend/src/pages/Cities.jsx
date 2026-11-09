import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, MapPin } from "lucide-react";
import { useApiQuery, mediaUrl } from "@/lib/api";
import { useCountries, fmtDate } from "@/lib/geo";
import AddCityDialog from "@/components/AddCityDialog";
import { Flag, PageLoader, SectionTitle, Empty } from "@/components/common";

export default function Cities() {
  const { data: cities } = useApiQuery(["cities"], "/cities");
  const { byCode } = useCountries();
  const [open, setOpen] = useState(false);
  if (!cities) return <PageLoader />;
  const groups = cities.reduce((acc, c) => ({ ...acc, [c.country_code]: [...(acc[c.country_code] || []), c] }), {});
  const order = Object.keys(groups).sort((a, b) => (byCode[a]?.name || a).localeCompare(byCode[b]?.name || b, "es"));

  return (
    <div className="page space-y-10" data-testid="cities-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="label-x text-cyan-300">Ciudades</p><h1 className="font-display text-4xl font-extrabold sm:text-5xl">Mis ciudades</h1><p className="mt-1 text-slate-400">{cities.length} registros en {order.length} países</p></div>
        <button className="btn-primary px-5 py-3" onClick={() => setOpen(true)} data-testid="cities-add-btn"><Plus className="h-4 w-4" />Añadir ciudad</button>
      </div>
      {!cities.length && <Empty icon={MapPin} title="Sin ciudades todavía" text="Añade ciudades para ver tus estadísticas de ciudades." testId="cities-empty" />}
      {order.map((code) => (
        <section key={code} data-testid={`cities-group-${code}`}>
          <SectionTitle title={<Link to={`/mundo/pais/${code}`} className="flex items-center gap-3"><Flag code={code} className="h-6 w-9" />{byCode[code]?.name}<span className="text-base font-medium text-slate-500">{groups[code].length}</span></Link>} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {groups[code].map((c) => (
              <Link key={c.id} to={`/ciudades/${c.id}`} className="card-hover relative h-40 overflow-hidden rounded-3xl bg-[#181B28]" data-testid={`city-card-${c.id}`}>
                {c.cover_url && <img src={mediaUrl(c.cover_url)} alt={c.name} className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                <div className="absolute inset-x-3 bottom-3"><p className="font-display text-lg font-bold">{c.name}</p><p className="text-[11px] text-slate-400">{fmtDate(c.visit_date) || "Sin fecha"} · {c.photo_count} fotos</p></div>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <AddCityDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
