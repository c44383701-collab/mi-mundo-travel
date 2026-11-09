import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useApiQuery } from "@/lib/api";
import { useCountries, CONTINENT_META, fmtNum, fmtDate } from "@/lib/geo";
import { Flag, PageLoader, SectionTitle } from "@/components/common";

export default function ContinentDetail() {
  const { key } = useParams();
  const { list } = useCountries();
  const { data: visited } = useApiQuery(["visited"], "/visited");
  const m = CONTINENT_META[key];
  if (!m) return <div className="page">Continente no encontrado</div>;
  if (!visited) return <PageLoader />;
  const all = list.filter((c) => c.continent === key).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const vmap = Object.fromEntries(visited.map((v) => [v.country_code, v]));
  const done = all.filter((c) => vmap[c.code]), todo = all.filter((c) => !vmap[c.code]);
  const pct = all.length ? (done.length / all.length) * 100 : 0;
  const Icon = m.icon;

  return (
    <div className="page space-y-10" data-testid="continent-detail-page">
      <Link to="/mundo" className="btn-ghost px-4 py-2 text-sm" data-testid="continent-back-btn"><ArrowLeft className="h-4 w-4" />Mi Mundo</Link>
      <section className="card-x p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <span className="rounded-2xl p-3" style={{ background: `${m.color}22` }}><Icon className="h-8 w-8" style={{ color: m.color }} /></span>
          <div><h1 className="font-display text-4xl font-extrabold sm:text-5xl">{m.name}</h1><p className="text-slate-400" data-testid="continent-summary">{done.length} de {all.length} países · {fmtNum(pct)}%</p></div>
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full bg-gradient-to-r ${m.grad}`} style={{ width: `${pct}%` }} /></div>
      </section>
      <section>
        <SectionTitle title={`Visitados (${done.length})`} />
        <div className="flex flex-wrap gap-2" data-testid="continent-visited">
          {done.map((c) => <Link key={c.code} to={`/mundo/pais/${c.code}`} className="chip" data-testid={`continent-visited-${c.code}`}><Flag code={c.code} />{c.name}<Check className="h-4 w-4 text-cyan-300" /><span className="text-xs text-slate-500">{fmtDate(vmap[c.code].visit_date, { year: "numeric" })}</span></Link>)}
          {!done.length && <p className="text-slate-400">Ninguno todavía.</p>}
        </div>
      </section>
      <section>
        <SectionTitle title={`Pendientes (${todo.length})`} />
        <div className="flex flex-wrap gap-2" data-testid="continent-pending">
          {todo.map((c) => <Link key={c.code} to={`/mundo/pais/${c.code}`} className="chip opacity-70 hover:opacity-100" data-testid={`continent-pending-${c.code}`}><Flag code={c.code} />{c.name}</Link>)}
        </div>
      </section>
    </div>
  );
}
