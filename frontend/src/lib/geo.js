import axios from "axios";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Sun, Mountain, Palmtree, Building2 } from "lucide-react";
import { API } from "./api";

export const flagUrl = (code, w = 160) => `https://flagcdn.com/w${w}/${String(code).toLowerCase()}.png`;

export const CONTINENT_META = {
  EU: { name: "Europa", icon: Landmark, color: "#FF4D6D", grad: "from-[#FF4D6D] to-[#FF8FA3]" },
  AS: { name: "Asia", icon: Building2, color: "#FFB800", grad: "from-[#FFB800] to-[#FFD76A]" },
  AF: { name: "África", icon: Sun, color: "#10B981", grad: "from-[#10B981] to-[#6EE7B7]" },
  AM: { name: "América", icon: Mountain, color: "#00F0FF", grad: "from-[#00C2FF] to-[#00F0FF]" },
  OC: { name: "Oceanía", icon: Palmtree, color: "#3B82F6", grad: "from-[#0066FF] to-[#60A5FA]" },
};

export const STATUS = {
  pendiente: { label: "Pendiente", cls: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
  en_curso: { label: "En curso", cls: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30" },
  completado: { label: "Completado", cls: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
};

export function useCountries() {
  const q = useQuery({
    queryKey: ["countries"],
    queryFn: () => axios.get(`${API}/countries`).then((r) => r.data),
    staleTime: Infinity,
  });
  const byCode = useMemo(() => Object.fromEntries((q.data?.countries || []).map((c) => [c.code, c])), [q.data]);
  return { list: q.data?.countries || [], byCode, total: q.data?.total || 195, loading: q.isLoading };
}

const toDate = (d) => new Date(d.length === 10 ? `${d}T12:00:00` : d);
export const fmtDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  d ? toDate(d).toLocaleDateString("es-ES", opts) : "";
export const fmtRange = (s, e) => {
  if (!s) return "Sin fecha";
  if (!e || e === s) return fmtDate(s);
  return `${fmtDate(s, { day: "numeric", month: "short" })} – ${fmtDate(e)}`;
};
export const fmtNum = (n, d = 1) => (n ?? 0).toLocaleString("es-ES", { maximumFractionDigits: d });
export const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
