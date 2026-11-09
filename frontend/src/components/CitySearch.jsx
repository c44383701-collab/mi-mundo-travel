import { useEffect, useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { useApi } from "@/lib/api";
import { Flag, inputCls } from "./common";

export default function CitySearch({ country, onSelect, placeholder = "Buscar ciudad…", testId = "city-search" }) {
  const api = useApi();
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    let stale = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const r = await api.get("/geo/cities", { params: { q, country: country || undefined } });
        if (!stale) setRes(r.data);
      } catch { if (!stale) setError("El buscador no responde. Puedes añadirla manualmente."); }
      if (!stale) setLoading(false);
    }, 350);
    return () => { stale = true; clearTimeout(t); };
  }, [q, country, api]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} data-testid={`${testId}-input`} />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-300" />}
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      {(res.length > 0 || q.trim().length >= 2) && (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-white/5 bg-[#0f1118] p-1" data-testid={`${testId}-results`}>
          {res.map((c, i) => (
            <button type="button" key={`${c.name}-${c.lat}-${i}`} onClick={() => { onSelect(c); setQ(""); setRes([]); }} data-testid={`${testId}-result-${i}`}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5">
              <Flag code={c.country_code} />
              <span className="flex-1"><span className="font-semibold">{c.name}</span><span className="text-slate-400"> · {[c.admin1, c.country].filter(Boolean).join(", ")}</span></span>
            </button>
          ))}
          {!loading && !res.length && (
            <button type="button" onClick={() => { onSelect({ name: q.trim(), manual: true }); setQ(""); }} data-testid={`${testId}-manual`}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-cyan-300 hover:bg-white/5">
              <MapPin className="h-4 w-4" /> Añadir «{q.trim()}» manualmente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
