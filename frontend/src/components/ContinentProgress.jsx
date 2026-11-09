import { Link } from "react-router-dom";
import { CONTINENT_META, fmtNum } from "@/lib/geo";

export default function ContinentProgress({ continents = [], linkable = true }) {
  return (
    <div className="card-x divide-y divide-white/5 p-2 sm:p-3" data-testid="continent-progress">
      {continents.map((c) => {
        const m = CONTINENT_META[c.key];
        const Icon = m.icon;
        const Row = (
          <div className="rounded-2xl px-3 py-4 transition-colors hover:bg-white/[0.03] sm:px-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl p-2" style={{ background: `${m.color}1f` }}><Icon className="h-5 w-5" style={{ color: m.color }} /></span>
              <span className="flex-1 font-display text-lg font-semibold">{m.name}</span>
              <span className="text-sm text-slate-400">{c.visited}/{c.total} países</span>
              <span className="w-16 text-right font-display text-xl font-bold" style={{ color: c.visited ? m.color : "#64748B" }}>{fmtNum(c.percent)}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/5">
              <div className={`h-full rounded-full bg-gradient-to-r ${m.grad} transition-[width] duration-1000`} style={{ width: `${Math.max(c.percent, c.visited ? 2 : 0)}%` }} />
            </div>
          </div>
        );
        return linkable
          ? <Link key={c.key} to={`/mundo/continente/${c.key}`} className="block" data-testid={`continent-row-${c.key}`}>{Row}</Link>
          : <div key={c.key} data-testid={`continent-row-${c.key}`}>{Row}</div>;
      })}
    </div>
  );
}
