import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Globe2, MapPin, BookOpen, Camera, ArrowRight, Plane } from "lucide-react";
import { useApiQuery, mediaUrl } from "@/lib/api";
import { fmtNum, fmtDate } from "@/lib/geo";
import TripDialog from "@/components/TripDialog";
import TripCard from "@/components/TripCard";
import { Avatar, Flag, PageLoader, SectionTitle, Empty } from "@/components/common";

const HERO = "https://images.unsplash.com/photo-1536420124392-79a70082fbe5?crop=entropy&cs=srgb&fm=jpg&q=80&w=1600";

export default function HomePage() {
  const { data, isLoading } = useApiQuery(["home"], "/home");
  const [tripOpen, setTripOpen] = useState(false);
  if (isLoading || !data) return <PageLoader />;
  const { profile: p, stats: s, last_trip, latest_countries, latest_photos, latest_cities } = data;
  const first = (p.display_name || p.username).split(" ")[0];

  return (
    <div className="page space-y-12" data-testid="home-page">
      <section className="fade-up flex items-center gap-4">
        <Avatar url={p.avatar_url} name={p.display_name} className="h-16 w-16 sm:h-20 sm:w-20" testId="home-avatar" />
        <div>
          <p className="label-x text-cyan-300">Nivel {s.level.index} · {s.level.name}</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl" data-testid="home-greeting">Hola, {first}</h1>
          <p className="mt-1 text-slate-400">{s.countries_visited ? "Tu mundo sigue creciendo. ¿A dónde vamos ahora?" : "Tu pasaporte está en blanco. Marca tu primer país."}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link to="/mundo" className="card-hover group relative col-span-2 min-h-[260px] overflow-hidden rounded-3xl border border-white/10" data-testid="home-world-card">
          <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
            <p className="label-x text-cyan-300">Mi Mundo</p>
            <div>
              <p className="font-display text-6xl font-extrabold sm:text-7xl" data-testid="home-world-percent">{fmtNum(s.world_percent)}%</p>
              <p className="text-lg font-semibold text-slate-200">del mundo explorado</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="chip">{s.countries_visited}/195 países</span><span className="chip">{s.cities_visited} ciudades</span><span className="chip">{s.continents_explored} continentes</span>
              </div>
            </div>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">Abrir el globo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </div>
        </Link>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <button className="btn-primary col-span-2 rounded-3xl py-5 text-base lg:col-span-1" onClick={() => setTripOpen(true)} data-testid="home-new-trip-btn"><Plus className="h-5 w-5" />Nuevo viaje</button>
          {[["/mundo?add=1", "Añadir país", Globe2, "home-add-country"], ["/ciudades", "Mis ciudades", MapPin, "home-cities-link"], ["/pasaporte", "Mi pasaporte", BookOpen, "home-passport-link"], ["/estadisticas", `${s.photos} fotos`, Camera, "home-stats-link"]].map(([to, l, Icon, id]) => (
            <Link key={id} to={to} className="card-x card-hover flex items-center gap-3 p-4 text-sm font-semibold" data-testid={id}><Icon className="h-5 w-5 text-cyan-300" />{l}</Link>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Último viaje" action={<Link to="/perfil" className="text-sm font-semibold text-cyan-300" data-testid="home-all-trips">Ver todos</Link>} />
        {last_trip ? <TripCard trip={last_trip} big /> : <Empty icon={Plane} title="Aún no tienes viajes" text="Crea tu primer viaje y organízalo por ciudades." action={<button className="btn-primary px-5 py-2.5 text-sm" onClick={() => setTripOpen(true)} data-testid="home-empty-new-trip">Crear viaje</button>} testId="home-no-trips" />}
      </section>

      {latest_countries.length > 0 && (
        <section>
          <SectionTitle title="Últimos países añadidos" />
          <div className="flex flex-wrap gap-2">
            {latest_countries.map((c) => <Link key={c.country_code} to={`/mundo/pais/${c.country_code}`} className="chip" data-testid={`home-country-${c.country_code}`}><Flag code={c.country_code} />{c.name}</Link>)}
          </div>
        </section>
      )}

      {latest_cities.length > 0 && (
        <section>
          <SectionTitle title="Ciudades visitadas" action={<Link to="/ciudades" className="text-sm font-semibold text-cyan-300">Ver todas</Link>} />
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {latest_cities.map((c) => (
              <Link key={c.id} to={`/ciudades/${c.id}`} className="card-hover relative h-44 w-40 shrink-0 overflow-hidden rounded-3xl bg-[#181B28]" data-testid={`home-city-${c.id}`}>
                {c.cover_url && <img src={mediaUrl(c.cover_url)} alt={c.name} className="absolute inset-0 h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3"><Flag code={c.country_code} /><p className="mt-1 font-display font-bold">{c.name}</p><p className="text-[11px] text-slate-400">{fmtDate(c.visit_date)}</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {latest_photos.length > 0 && (
        <section>
          <SectionTitle title="Últimas fotografías" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {latest_photos.map((ph) => (
              <Link key={ph.id} to={ph.city_id ? `/ciudades/${ph.city_id}` : ph.trip_id ? `/viajes/${ph.trip_id}` : "#"} className="aspect-square overflow-hidden rounded-2xl" data-testid={`home-photo-${ph.id}`}>
                <img src={mediaUrl(ph.url)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
              </Link>
            ))}
          </div>
        </section>
      )}
      <TripDialog open={tripOpen} onOpenChange={setTripOpen} />
    </div>
  );
}
