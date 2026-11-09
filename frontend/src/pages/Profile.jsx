import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Share2, BarChart3, BookOpen, CalendarDays, Plane } from "lucide-react";
import { useApiQuery, copyLink } from "@/lib/api";
import { useCountries, fmtDate } from "@/lib/geo";
import TripDialog from "@/components/TripDialog";
import TripCard from "@/components/TripCard";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import { Avatar, Flag, PageLoader, SectionTitle, Empty } from "@/components/common";

export default function Profile() {
  const { data: me } = useApiQuery(["me"], "/me");
  const { data: stats } = useApiQuery(["stats"], "/stats");
  const { data: trips = [] } = useApiQuery(["trips"], "/trips");
  const { byCode } = useCountries();
  const [tripOpen, setTripOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  if (!me || !stats) return <PageLoader />;

  const share = async () => {
    if (!me.is_public) { toast.info("Tu perfil es privado. Hazlo público en «Editar perfil» para compartirlo."); return setEditOpen(true); }
    const r = await copyLink(`${window.location.origin}/u/${me.username}`, me.display_name);
    if (r === "copied") toast.success("Enlace del perfil copiado");
  };
  const row = [["viajes", stats.trips], ["países", stats.countries_visited], ["ciudades", stats.cities_visited], ["fotos", stats.photos], ["seguidores", me.followers], ["seguidos", me.following]];

  return (
    <div className="page space-y-10" data-testid="profile-page">
      <section className="fade-up flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar url={me.avatar_url} name={me.display_name} className="h-28 w-28 sm:h-32 sm:w-32" testId="profile-avatar" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="profile-display-name">{me.display_name}</h1>
          <p className="font-mono-j text-sm text-cyan-300" data-testid="profile-username">@{me.username}</p>
          {me.bio && <p className="mt-2 max-w-xl text-slate-300" data-testid="profile-bio">{me.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
            {me.country_code && <span className="flex items-center gap-2"><Flag code={me.country_code} />{me.home_city?.name ? `${me.home_city.name}, ` : ""}{byCode[me.country_code]?.name}</span>}
            <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Desde {fmtDate(me.created_at, { month: "long", year: "numeric" })}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${me.is_public ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-slate-300"}`} data-testid="profile-visibility">{me.is_public ? "Público" : "Privado"}</span>
          </div>
        </div>
      </section>

      <section className="no-scrollbar -mx-4 flex overflow-x-auto px-4 sm:mx-0 sm:px-0" data-testid="profile-stats-row">
        {row.map(([l, v], i) => (
          <div key={l} className={`min-w-[96px] flex-1 px-4 py-1 ${i ? "border-l border-white/10" : "pl-0"}`}>
            <p className="font-display text-3xl font-bold">{v}</p><p className="text-sm text-slate-400">{l}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        <button className="btn-primary px-6 py-3" onClick={() => setTripOpen(true)} data-testid="profile-new-trip-btn"><Plus className="h-4 w-4" />Nuevo viaje</button>
        <button className="btn-ghost px-5 py-3" onClick={() => setEditOpen(true)} data-testid="profile-edit-btn"><Pencil className="h-4 w-4" />Editar perfil</button>
        <Link to="/estadisticas" className="btn-ghost px-5 py-3" data-testid="profile-stats-btn"><BarChart3 className="h-4 w-4" />Estadísticas</Link>
        <Link to="/pasaporte" className="btn-ghost px-5 py-3" data-testid="profile-passport-btn"><BookOpen className="h-4 w-4" />Pasaporte</Link>
        <button className="btn-ghost px-4 py-3" onClick={share} aria-label="Compartir perfil" data-testid="profile-share-btn"><Share2 className="h-4 w-4" /></button>
      </section>

      <section>
        <SectionTitle title="Mis viajes" sub={`${trips.length} viajes registrados`} />
        {trips.length ? (
          <div className="grid gap-5 md:grid-cols-2" data-testid="profile-trips-grid">{trips.map((t) => <TripCard key={t.id} trip={t} />)}</div>
        ) : <Empty icon={Plane} title="Tu primer viaje te espera" text="Crea un viaje y añade sus ciudades, fotos y recuerdos." action={<button className="btn-primary px-5 py-2.5 text-sm" onClick={() => setTripOpen(true)} data-testid="profile-empty-new-trip">Crear viaje</button>} testId="profile-no-trips" />}
      </section>
      <TripDialog open={tripOpen} onOpenChange={setTripOpen} />
      <ProfileEditDialog open={editOpen} onOpenChange={setEditOpen} me={me} />
    </div>
  );
}
