import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, MapPin, Trophy, Plus } from "lucide-react";
import { useApiQuery } from "@/lib/api";
import { useCountries, norm, fmtNum, CONTINENT_META } from "@/lib/geo";
import WorldGlobe from "@/components/WorldGlobe";
import CitySearch from "@/components/CitySearch";
import AddCityDialog from "@/components/AddCityDialog";
import { Avatar, Flag, SectionTitle, inputCls } from "@/components/common";

const TABS = [["paises", "Países"], ["ciudades", "Ciudades"], ["destacados", "Destacados"], ["mapa", "Mapa"], ["viajeros", "Viajeros"]];

export default function Explore() {
  const [tab, setTab] = useState("paises");
  const [q, setQ] = useState("");
  const [cont, setCont] = useState("");
  const [city, setCity] = useState(null);
  const [addCity, setAddCity] = useState(false);
  const { list } = useCountries();
  const { data: ex } = useApiQuery(["explore"], "/explore");
  const countries = list.filter((c) => (!cont || c.continent === cont) && norm(c.name).includes(norm(q))).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const names = useMemo(() => Object.fromEntries(list.map((c) => [c.code, c.name])), [list]);

  return (
    <div className="page space-y-8" data-testid="explore-page">
      <div><p className="label-x text-cyan-300">Explorar</p><h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">Descubre el planeta</h1></div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${tab === k ? "bg-[#0066FF] text-white" : "bg-[#181B28] text-slate-400 hover:text-white"}`} data-testid={`explore-tab-${k}`}>{l}</button>)}
      </div>

      {tab === "paises" && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input className={`${inputCls} pl-9`} placeholder="Buscar país…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="explore-country-search" /></div>
            {[["", "Todos"], ...Object.entries(CONTINENT_META).map(([k, v]) => [k, v.name])].map(([k, l]) => (
              <button key={k || "all"} onClick={() => setCont(k)} className={`chip ${cont === k ? "border-cyan-400/50 text-cyan-300" : ""}`} data-testid={`explore-continent-${k || "all"}`}>{l}</button>
            ))}
          </div>
          <p className="text-sm text-slate-500">{countries.length} países</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="explore-countries-grid">
            {countries.map((c) => (
              <Link key={c.code} to={`/mundo/pais/${c.code}`} className="card-x card-hover overflow-hidden" data-testid={`explore-country-${c.code}`}>
                <img src={`https://flagcdn.com/w320/${c.code.toLowerCase()}.png`} alt={c.name} loading="lazy" className="h-24 w-full object-cover" />
                <div className="p-3"><p className="truncate font-semibold">{c.name}</p><p className="text-xs text-slate-500">{CONTINENT_META[c.continent].name}</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {tab === "ciudades" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card-x space-y-4 p-6">
            <SectionTitle title="Buscar ciudades del mundo" />
            <CitySearch onSelect={(c) => !c.manual && setCity(c)} testId="explore-city-search" />
            {city && (
              <div className="rounded-2xl bg-[#181B28] p-4" data-testid="explore-city-result">
                <div className="flex items-center gap-3"><Flag code={city.country_code} className="h-6 w-9" /><div><p className="font-display text-xl font-bold">{city.name}</p><p className="text-xs text-slate-400">{[city.admin1, city.country].filter(Boolean).join(", ")}</p></div></div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white/5 p-2"><p className="label-x">Lat</p>{fmtNum(city.lat, 2)}</div>
                  <div className="rounded-xl bg-white/5 p-2"><p className="label-x">Lng</p>{fmtNum(city.lng, 2)}</div>
                  <div className="rounded-xl bg-white/5 p-2"><p className="label-x">Altitud</p>{city.elevation != null ? `${Math.round(city.elevation)} m` : "—"}</div>
                </div>
                <button className="btn-primary mt-4 w-full py-2.5 text-sm" onClick={() => setAddCity(true)} data-testid="explore-city-add"><Plus className="h-4 w-4" />Registrar una ciudad de {city.country}</button>
              </div>
            )}
          </div>
          <div className="card-x p-6">
            <SectionTitle title="Más visitadas por la comunidad" />
            <div className="space-y-2">{(ex?.top_cities || []).slice(0, 10).map((c, i) => (
              <div key={`${c.name}${c.country_code}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5"><span className="w-6 font-mono-j text-xs text-slate-500">{i + 1}</span><Flag code={c.country_code} /><span className="flex-1 font-semibold">{c.name}</span><span className="text-xs text-slate-400">{c.travelers} viajeros</span></div>
            ))}{!ex?.top_cities?.length && <p className="text-sm text-slate-500">Aún no hay datos públicos.</p>}</div>
          </div>
        </section>
      )}

      {tab === "destacados" && (
        <section className="space-y-6">
          <SectionTitle title="Países más visitados" sub="Según los perfiles públicos de MI MUNDO" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="explore-top-countries">
            {(ex?.top_countries || []).slice(0, 12).map((c, i) => (
              <Link key={c.code} to={`/mundo/pais/${c.code}`} className="card-x card-hover relative overflow-hidden p-4">
                <span className="absolute right-3 top-3 font-display text-3xl font-extrabold text-white/10">#{i + 1}</span>
                <Flag code={c.code} className="h-8 w-12" w={160} /><p className="mt-3 font-display text-lg font-bold">{c.name}</p><p className="text-xs text-cyan-300">{c.travelers} viajeros</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {tab === "mapa" && (
        <section className="overflow-hidden rounded-3xl border border-white/10" data-testid="explore-map">
          <WorldGlobe visited={(ex?.top_countries || []).map((c) => c.code)} names={names} height={560} testId="explore-globe" />
          <p className="bg-[#12141C] p-4 text-sm text-slate-400">Países visitados por la comunidad de viajeros públicos de MI MUNDO.</p>
        </section>
      )}

      {tab === "viajeros" && (
        <section>
          <SectionTitle title="Ranking de viajeros" sub={`${ex?.community?.travelers || 0} perfiles públicos`} />
          <div className="card-x divide-y divide-white/5" data-testid="explore-ranking">
            {(ex?.ranking || []).map((u, i) => (
              <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-4 p-4 hover:bg-white/[0.03]" data-testid={`ranking-${u.username}`}>
                <span className={`w-8 font-display text-xl font-bold ${i < 3 ? "text-amber-300" : "text-slate-500"}`}>{i < 3 ? <Trophy className="h-5 w-5" /> : i + 1}</span>
                <Avatar url={u.avatar_url} name={u.display_name} className="h-11 w-11" />
                <div className="flex-1"><p className="font-semibold">{u.display_name}</p><p className="text-xs text-slate-400">@{u.username} · {u.level}</p></div>
                <div className="text-right"><p className="font-display text-lg font-bold">{u.countries_visited} <span className="text-xs text-slate-400">países</span></p><p className="text-xs text-cyan-300">{fmtNum(u.world_percent)}%</p></div>
              </Link>
            ))}
            {!ex?.ranking?.length && <p className="flex items-center gap-2 p-6 text-sm text-slate-500"><Users className="h-4 w-4" />Todavía no hay viajeros públicos.</p>}
          </div>
          <Link to="/descubrir" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300"><MapPin className="h-4 w-4" />Ver todos los perfiles</Link>
        </section>
      )}
      <AddCityDialog open={addCity} onOpenChange={setAddCity} defaultCountry={city?.country_code} />
    </div>
  );
}
