import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, UserPlus, UserCheck, Lock } from "lucide-react";
import { useApi, useApiQuery, useRefresh, errMsg } from "@/lib/api";
import { fmtNum } from "@/lib/geo";
import { Avatar, PageLoader, inputCls } from "@/components/common";

export const FollowButton = ({ username, following, testId }) => {
  const api = useApi();
  const refresh = useRefresh();
  const toggle = async (e) => {
    e.preventDefault();
    try {
      if (following) await api.delete(`/social/follow/${username}`);
      else await api.post(`/social/follow/${username}`);
      refresh();
    } catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <button onClick={toggle} className={`${following ? "btn-ghost" : "btn-primary"} px-4 py-2 text-xs`} data-testid={testId}>
      {following ? <><UserCheck className="h-4 w-4" />Siguiendo</> : <><UserPlus className="h-4 w-4" />Seguir</>}
    </button>
  );
};

export default function Discover() {
  const [q, setQ] = useState("");
  const { data: users } = useApiQuery(["discover", q], `/discover/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  const { data: me } = useApiQuery(["me"], "/me");

  return (
    <div className="page space-y-8" data-testid="discover-page">
      <div><p className="label-x text-cyan-300">Descubrir</p><h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">Otros viajeros</h1></div>
      {me && !me.is_public && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200" data-testid="discover-private-banner">
          <Lock className="h-4 w-4 shrink-0" />Tu perfil es privado y no aparece aquí. Puedes hacerlo público desde Perfil → Editar perfil.
        </div>
      )}
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input className={`${inputCls} pl-9`} placeholder="Buscar por nombre o usuario…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="discover-search" /></div>
      {!users ? <PageLoader /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="discover-grid">
          {users.map((u) => (
            <Link key={u.id} to={`/u/${u.username}`} className="card-x card-hover p-5" data-testid={`traveler-card-${u.username}`}>
              <div className="flex items-center gap-4">
                <Avatar url={u.avatar_url} name={u.display_name} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold">{u.display_name}</p>
                  <p className="truncate text-xs text-slate-400">@{u.username} · {u.level}</p>
                  {u.is_demo && <span className="mt-1 inline-block rounded-full bg-fuchsia-400/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">DATOS DE EJEMPLO</span>}
                </div>
                {!u.is_own && <FollowButton username={u.username} following={u.is_following} testId={`follow-btn-${u.username}`} />}
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                {[[u.countries_visited, "países"], [u.cities_visited, "ciudades"], [u.world_percent != null ? `${fmtNum(u.world_percent)}%` : null, "mundo"], [u.public_trips, "viajes"]].map(([v, l]) => (
                  <div key={l} className="rounded-xl bg-white/[0.04] py-2"><p className="font-display font-bold">{v ?? "—"}</p><p className="text-[10px] text-slate-500">{l}</p></div>
                ))}
              </div>
            </Link>
          ))}
          {!users.length && <p className="text-slate-500">No se encontraron viajeros públicos.</p>}
        </div>
      )}
    </div>
  );
}
