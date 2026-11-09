import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, BarChart3, BookOpen, Pencil, Trash2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApi, useApiQuery, useRefresh, mediaUrl } from "@/lib/api";
import { useCountries, fmtDate, fmtNum, norm, CONTINENT_META } from "@/lib/geo";
import WorldGlobe from "@/components/WorldGlobe";
import AddCountryDialog from "@/components/AddCountryDialog";
import ContinentProgress from "@/components/ContinentProgress";
import { Flag, SectionTitle, inputCls } from "@/components/common";

export const WorldStatsCard = ({ s }) => (
  <div className="card-x relative overflow-hidden p-6 sm:p-8" data-testid="world-stats-card">
    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#0066FF]/25 blur-3xl" />
    <p className="label-x">Mundo explorado</p>
    <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-4">
      <p className="font-display text-6xl font-extrabold tracking-tight sm:text-7xl" data-testid="world-percent"><span className="text-gradient">{fmtNum(s.world_percent)} %</span></p>
      <p className="pb-2 font-display text-lg font-bold uppercase tracking-[0.2em] text-slate-300">Explorado</p>
    </div>
    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-[#0066FF] to-[#00F0FF]" style={{ width: `${s.world_percent}%` }} /></div>
    <div className="mt-6 grid grid-cols-3 gap-3">
      {[[`${s.countries_visited} / ${s.total_countries}`, "países", "stat-countries"], [s.cities_visited, "ciudades", "stat-cities"], [s.continents_explored, "continentes", "stat-continents"]].map(([v, l, id]) => (
        <div key={l} className="rounded-2xl bg-white/[0.04] p-3 sm:p-4" data-testid={id}>
          <p className="font-display text-2xl font-bold sm:text-3xl">{v}</p><p className="text-xs text-slate-400 sm:text-sm">{l}</p>
        </div>
      ))}
    </div>
  </div>
);

export default function MiMundo() {
  const api = useApi();
  const refresh = useRefresh();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { data: visited = [] } = useApiQuery(["visited"], "/visited");
  const { data: stats } = useApiQuery(["stats"], "/stats");
  const { data: cities = [] } = useApiQuery(["cities"], "/cities");
  const { list, byCode } = useCountries();
  const [addOpen, setAddOpen] = useState(params.get("add") === "1");
  const [initial, setInitial] = useState(null);
  const [editing, setEditing] = useState(null);
  const [info, setInfo] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [tab, setTab] = useState("visited");
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(null);

  const codes = visited.map((v) => v.country_code);
  const names = useMemo(() => Object.fromEntries(list.map((c) => [c.code, c.name])), [list]);
  const pins = useMemo(() => visited.map((v) => ({ code: v.country_code, lat: v.lat, lng: v.lng })), [visited]);
  const sorted = [...visited].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const pending = list.filter((c) => !c.territory && !codes.includes(c.code) && norm(c.name).includes(norm(q))).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const infoVisited = info && visited.find((v) => v.country_code === info.code);

  const openInfo = (code, fallback) => {
    setInfo({ code, name: byCode[code]?.name || fallback, inList: !!byCode[code] });
    if (byCode[code]) setFocus({ lat: byCode[code].lat, lng: byCode[code].lng });
  };
  const remove = async (code) => {
    if (!window.confirm("¿Eliminar este país de tus visitados? Tus ciudades se conservarán.")) return;
    await api.delete(`/visited/${code}`);
    toast.success("País eliminado");
    setInfo(null);
    refresh();
  };

  return (
    <div data-testid="mi-mundo-page">
      <section className="relative">
        <WorldGlobe visited={codes} names={names} places={list} pins={pins} cities={cities} onCityClick={(c) => nav(`/ciudades/${c.id}`)} onCountryClick={openInfo} focus={focus} height={Math.min(window.innerHeight * 0.66, 680)} />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-8">
          <div className="fade-up">
            <p className="label-x text-cyan-300">Mi Mundo</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">Tu planeta</h1>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-5 flex justify-center px-4">
          <button className="btn-primary px-6 py-3.5 text-base shadow-[0_10px_40px_-10px_rgba(0,240,255,0.7)]" onClick={() => { setInitial(null); setAddOpen(true); }} data-testid="add-visited-country-btn">
            <Plus className="h-5 w-5" /> Añadir país visitado
          </button>
        </div>
      </section>

      <div className="page space-y-12">
        {stats && <WorldStatsCard s={stats} />}
        <div className="flex flex-wrap gap-3">
          <Link to="/estadisticas" className="btn-ghost px-5 py-2.5 text-sm" data-testid="mundo-stats-link"><BarChart3 className="h-4 w-4" />Mis estadísticas</Link>
          <Link to="/pasaporte" className="btn-ghost px-5 py-2.5 text-sm" data-testid="mundo-passport-link"><BookOpen className="h-4 w-4" />Mi pasaporte</Link>
        </div>

        <section>
          <SectionTitle title="Progreso por continente" sub="Pulsa un continente para ver países visitados y pendientes" />
          {stats && <ContinentProgress continents={stats.continents} />}
        </section>

        <section>
          <SectionTitle title="Mis países" action={
            <div className="flex rounded-full bg-[#181B28] p-1 text-sm">
              {[["visited", `Visitados (${visited.length})`], ["pending", `Pendientes (${195 - (stats?.countries_visited || 0)})`]].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} data-testid={`countries-tab-${k}`} className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${tab === k ? "bg-[#0066FF] text-white" : "text-slate-400"}`}>{l}</button>
              ))}
            </div>
          } />
          {tab === "visited" ? (
            visited.length ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="visited-countries-list">
                  {(showAll ? sorted : sorted.slice(0, 9)).map((v) => (
                    <Link key={v.country_code} to={`/mundo/pais/${v.country_code}`} className="card-x card-hover flex items-center gap-4 p-4" data-testid={`visited-country-${v.country_code}`}>
                      <Flag code={v.country_code} className="h-9 w-14" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg font-semibold">{v.name}</p>
                        <p className="text-xs text-slate-400">{v.visit_date ? fmtDate(v.visit_date) : "Sin fecha"} · {v.cities_count} ciudades</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    </Link>
                  ))}
                </div>
                {sorted.length > 9 && <button className="chip mt-4 font-bold" onClick={() => setShowAll(!showAll)} data-testid="show-all-countries-btn">{showAll ? "Mostrar menos" : `Mostrar todos (${sorted.length})`}</button>}
              </>
            ) : <p className="text-slate-400" data-testid="no-countries">Todavía no has añadido países. ¡Empieza con el botón del globo!</p>
          ) : (
            <div className="space-y-3">
              <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input className={`${inputCls} pl-9`} placeholder="Buscar país pendiente…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="pending-search" /></div>
              <div className="flex flex-wrap gap-2" data-testid="pending-countries-list">
                {pending.map((c) => (
                  <button key={c.code} className="chip" onClick={() => openInfo(c.code)} data-testid={`pending-country-${c.code}`}><Flag code={c.code} />{c.name}</button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!info} onOpenChange={(o) => !o && setInfo(null)}>
        <DialogContent className="border-white/10 bg-[#12141C] sm:max-w-md" data-testid="country-info-dialog">
          {info && (<>
            <DialogHeader>
              <div className="mb-2">{info.inList && <Flag code={info.code} className="h-12 w-[72px]" w={160} />}</div>
              <DialogTitle className="font-display text-3xl">{info.name}</DialogTitle>
              <DialogDescription>{info.inList ? `${CONTINENT_META[byCode[info.code].continent].name}${byCode[info.code].territory ? " · Territorio (no cuenta en el % de 195)" : ""} · ${infoVisited ? "Visitado" : "Pendiente"}` : "Territorio fuera de la lista de 195 países de referencia"}</DialogDescription>
            </DialogHeader>
            {infoVisited && (
              <div className="space-y-3">
                {infoVisited.photo_url && <img src={mediaUrl(infoVisited.photo_url)} alt="" className="h-40 w-full rounded-2xl object-cover" />}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-white/5 p-3"><p className="label-x">Visita</p><p className="font-semibold">{infoVisited.visit_date ? fmtDate(infoVisited.visit_date) : "Sin fecha"}</p></div>
                  <div className="rounded-2xl bg-white/5 p-3"><p className="label-x">Ciudades</p><p className="font-semibold">{infoVisited.cities_count}</p></div>
                </div>
                {infoVisited.description && <p className="text-sm text-slate-300">{infoVisited.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary flex-1 px-4 py-2.5 text-sm" onClick={() => nav(`/mundo/pais/${info.code}`)} data-testid="country-info-open">Ver país</button>
                  <button className="btn-ghost px-4 py-2.5" onClick={() => { setEditing(infoVisited); setInfo(null); }} data-testid="country-info-edit"><Pencil className="h-4 w-4" /></button>
                  <button className="btn-ghost px-4 py-2.5 text-rose-300" onClick={() => remove(info.code)} data-testid="country-info-delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )}
            {!infoVisited && info.inList && (
              <button className="btn-primary w-full py-3" onClick={() => { setInitial(info.code); setInfo(null); setAddOpen(true); }} data-testid="country-info-mark-visited"><Plus className="h-4 w-4" />Marcar como visitado</button>
            )}
          </>)}
        </DialogContent>
      </Dialog>

      <AddCountryDialog open={addOpen} onOpenChange={setAddOpen} initialCode={initial} visitedCodes={codes}
        onSaved={(code) => byCode[code] && setFocus({ lat: byCode[code].lat, lng: byCode[code].lng })} />
      <AddCountryDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} existing={editing} />
    </div>
  );
}
