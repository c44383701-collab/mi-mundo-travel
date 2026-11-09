import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { useCountries, norm } from "@/lib/geo";
import { Flag, inputCls } from "./common";

export default function CountryPicker({ value, onChange, disabledCodes = [], multi = false, testId = "country-picker" }) {
  const { list } = useCountries();
  const [q, setQ] = useState("");
  const selected = multi ? value || [] : [value];
  const items = useMemo(() => list.filter((c) => norm(c.name).includes(norm(q))).sort((a, b) => a.name.localeCompare(b.name, "es")), [list, q]);
  const pick = (code) => {
    if (!multi) return onChange(code);
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };
  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input className={`${inputCls} pl-9`} placeholder="Buscar país por nombre…" value={q} onChange={(e) => setQ(e.target.value)} data-testid={`${testId}-search`} />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-xl border border-white/5 bg-[#0f1118] p-1">
        {items.map((c) => {
          const dis = disabledCodes.includes(c.code), sel = selected.includes(c.code);
          return (
            <button type="button" key={c.code} disabled={dis} onClick={() => pick(c.code)} data-testid={`${testId}-option-${c.code}`}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${sel ? "bg-[#0066FF]/20 text-cyan-200" : "hover:bg-white/5"} ${dis ? "cursor-not-allowed opacity-40" : ""}`}>
              <Flag code={c.code} />
              <span className="flex-1">{c.name}</span>
              {c.territory && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">Territorio</span>}
              {dis && <span className="text-[11px] text-slate-500">Ya visitado</span>}
              {sel && <Check className="h-4 w-4 text-cyan-300" />}
            </button>
          );
        })}
        {!items.length && <p className="p-3 text-sm text-slate-500">Sin resultados</p>}
      </div>
    </div>
  );
}
