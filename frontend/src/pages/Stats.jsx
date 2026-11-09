import { MapPin, Globe2, CalendarDays, Plane, Camera, Video, Route, Mountain, Navigation, Flag as FlagIcon, Building2, Lock, Map, Compass, Crown, Earth, Trophy, Landmark, Medal } from "lucide-react";
import { useApiQuery } from "@/lib/api";
import { fmtNum } from "@/lib/geo";
import ContinentProgress from "@/components/ContinentProgress";
import { Flag, PageLoader, SectionTitle } from "@/components/common";

const ICONS = { plane: Plane, flag: FlagIcon, map: Map, compass: Compass, globe: Globe2, crown: Crown, mountain: Mountain, earth: Earth, trophy: Trophy, building: Building2, landmark: Landmark, medal: Medal, camera: Camera };
const IMG_SPACE = "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=900&q=70";
const IMG_FOREST = "https://images.unsplash.com/photo-1536420124392-79a70082fbe5?w=900&q=70";

const BigTile = ({ img, value, label, testId }) => (
  <div className="relative aspect-square overflow-hidden rounded-3xl" data-testid={testId}>
    <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
    <div className="absolute inset-0 bg-black/40" />
    <div className="relative flex h-full flex-col items-center justify-center text-center">
      <p className="font-display text-6xl font-extrabold sm:text-7xl">{value}</p><p className="text-lg font-bold">{label}</p>
    </div>
  </div>
);

const Neon = ({ icon: Icon, color, value, label, sub, testId }) => (
  <div className="card-x flex flex-col items-center p-6 text-center" data-testid={testId}>
    <Icon className="h-12 w-12" style={{ color }} strokeWidth={1.4} />
    <p className="mt-3 font-display text-3xl font-bold" style={{ color }}>{value ?? "—"}</p>
    <p className="text-sm" style={{ color }}>{label}</p>
    {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
  </div>
);

export default function Stats() {
  const { data: s } = useApiQuery(["stats"], "/stats");
  if (!s) return <PageLoader />;
  const grid = [[MapPin, s.cities_visited, "ciudades"], [Globe2, s.continents_explored, "continentes"], [CalendarDays, s.days_traveling, "días viajando"], [Plane, s.trips, "viajes"], [Camera, s.photos, "fotos"], [Video, s.videos, "vídeos"]];
  const unlocked = s.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="page space-y-12" data-testid="stats-page">
      <div><p className="label-x text-cyan-300">Estadísticas</p><h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">Mis estadísticas</h1></div>
      <section className="grid grid-cols-2 gap-3 sm:gap-5">
        <BigTile img={IMG_SPACE} value={s.countries_visited} label="países" testId="stats-countries-tile" />
        <BigTile img={IMG_FOREST} value={`${fmtNum(s.world_percent)}%`} label="del mundo visto" testId="stats-percent-tile" />
      </section>
      <section className="grid grid-cols-3 divide-x divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 sm:grid-cols-6 sm:divide-y-0" data-testid="stats-icon-grid">
        {grid.map(([Icon, v, l]) => (
          <div key={l} className="flex flex-col items-center gap-1 p-5"><Icon className="h-7 w-7 text-[#00b4ff]" strokeWidth={1.6} /><p className="font-display text-2xl font-bold">{v}</p><p className="text-xs text-slate-400">{l}</p></div>
        ))}
      </section>
      <section className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        <Neon icon={Route} color="#00F0FF" value={s.km_traveled != null ? `${fmtNum(s.km_traveled, 0)} km` : null} label="Kilómetros recorridos" sub={s.km_traveled == null ? "Registra al menos 2 ciudades" : "Entre ciudades por fecha"} testId="stats-km" />
        <Neon icon={Navigation} color="#E040FB" value={s.farthest_place ? `${fmtNum(s.farthest_place.km, 0)} km` : null} label="Más distante de casa" sub={s.farthest_place?.name || "Indica tu ciudad en el perfil"} testId="stats-farthest" />
        <Neon icon={Mountain} color="#84CC16" value={s.max_altitude ? `${fmtNum(s.max_altitude.meters, 0)} m` : null} label="Mayor altitud" sub={s.max_altitude?.name || "Sin datos de altitud"} testId="stats-altitude" />
        <div className="card-x flex flex-col items-center p-6 text-center" data-testid="stats-most-country">
          {s.most_visited_country ? <Flag code={s.most_visited_country.code} className="h-10 w-14" w={160} /> : <FlagIcon className="h-10 w-10 text-amber-300" />}
          <p className="mt-3 font-display text-2xl font-bold text-amber-300">{s.most_visited_country?.name || "—"}</p><p className="text-sm text-amber-300">País más visitado</p>
        </div>
        <Neon icon={Building2} color="#FF4D6D" value={s.most_visited_city?.name} label="Ciudad más visitada" sub={s.most_visited_city ? `${s.most_visited_city.count} visita(s)` : null} testId="stats-most-city" />
        <div className="card-x col-span-2 flex flex-col justify-center p-6 lg:col-span-1" data-testid="stats-level">
          <p className="label-x">Nivel {s.level.index}</p><p className="font-display text-3xl font-bold text-gradient">{s.level.name}</p>
          <p className="mt-2 text-sm text-slate-400">{s.level.next_at ? `Siguiente nivel a ${s.level.next_at} países (${s.countries_visited}/${s.level.next_at})` : "Has alcanzado el nivel máximo"}</p>
          {s.level.next_at && <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-gradient-to-r from-[#0066FF] to-[#00F0FF]" style={{ width: `${(s.countries_visited / s.level.next_at) * 100}%` }} /></div>}
        </div>
      </section>
      <section>
        <SectionTitle title="Progreso por continente" />
        <ContinentProgress continents={s.continents} />
      </section>
      <section>
        <SectionTitle title="Logros" sub={`${unlocked} de ${s.achievements.length} desbloqueados`} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="achievements-grid">
          {s.achievements.map((a) => {
            const Icon = ICONS[a.icon] || Trophy;
            return (
              <div key={a.key} className={`card-x relative p-5 ${a.unlocked ? "border-cyan-400/30" : "opacity-60"}`} data-testid={`achievement-${a.key}`} data-unlocked={a.unlocked}>
                <div className={`mb-3 inline-flex rounded-2xl p-3 ${a.unlocked ? "bg-gradient-to-br from-[#0066FF] to-[#00F0FF] shadow-[0_0_24px_rgba(0,240,255,0.35)]" : "bg-white/5"}`}>
                  {a.unlocked ? <Icon className="h-6 w-6 text-white" /> : <Lock className="h-6 w-6 text-slate-500" />}
                </div>
                <p className="font-display font-bold">{a.title}</p><p className="text-xs text-slate-400">{a.description}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-cyan-400" style={{ width: `${(a.progress / a.goal) * 100}%` }} /></div>
                <p className="mt-1 font-mono-j text-[10px] text-slate-500">{a.progress}/{a.goal}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
