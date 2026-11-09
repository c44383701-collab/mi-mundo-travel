import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApi, useApiQuery, useRefresh, errMsg, mediaUrl } from "@/lib/api";
import { useCountries, fmtNum, fmtDate } from "@/lib/geo";
import WorldGlobe from "@/components/WorldGlobe";
import TripCard from "@/components/TripCard";
import PassportStamp from "@/components/PassportStamp";
import Lightbox from "@/components/Lightbox";
import { FollowButton } from "./Discover";
import { Avatar, Flag, PageLoader, SectionTitle, inputCls } from "@/components/common";

const TripSocial = ({ trip, onClose }) => {
  const api = useApi();
  const refresh = useRefresh();
  const { isSignedIn } = useAuth();
  const { data } = useApiQuery(["trip-social", trip.id], `/social/trips/${trip.id}/comments`);
  const [text, setText] = useState("");
  const like = async () => { try { await api.post(`/social/trips/${trip.id}/like`); refresh(); } catch (e) { toast.error(errMsg(e)); } };
  const send = async () => { if (!text.trim()) return; try { await api.post(`/social/trips/${trip.id}/comments`, { text }); setText(""); refresh(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#12141C] sm:max-w-lg" data-testid="trip-social-dialog">
        <DialogHeader><DialogTitle className="font-display text-2xl">{trip.title}</DialogTitle><DialogDescription>{trip.countries.map((c) => c.name).join(", ")} · {trip.days} días</DialogDescription></DialogHeader>
        {trip.cover_url && <img src={mediaUrl(trip.cover_url)} alt="" className="h-48 w-full rounded-2xl object-cover" />}
        <div className="flex items-center gap-3">
          <button className="btn-ghost px-4 py-2 text-sm" disabled={!isSignedIn} onClick={like} data-testid="trip-like-btn"><Heart className="h-4 w-4 text-rose-400" />{data?.likes ?? 0} me gusta</button>
          <span className="flex items-center gap-1.5 text-sm text-slate-400"><MessageCircle className="h-4 w-4" />{data?.comments?.length ?? 0} comentarios</span>
        </div>
        <div className="space-y-2" data-testid="trip-comments">
          {(data?.comments || []).map((c) => <div key={c.id} className="rounded-xl bg-white/5 p-3 text-sm"><b className="text-cyan-300">@{c.author_username}</b> {c.text}<p className="text-[10px] text-slate-500">{fmtDate(c.created_at)}</p></div>)}
        </div>
        {isSignedIn ? (
          <div className="flex gap-2"><input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un comentario…" data-testid="trip-comment-input" /><button className="btn-primary px-4" onClick={send} data-testid="trip-comment-send"><Send className="h-4 w-4" /></button></div>
        ) : <p className="text-xs text-slate-500">Inicia sesión para comentar y dar me gusta.</p>}
      </DialogContent>
    </Dialog>
  );
};

export default function PublicProfile() {
  const { username } = useParams();
  const { data: d, isError } = useApiQuery(["public", username], `/public/users/${username}`, { retry: false });
  const { list } = useCountries();
  const names = useMemo(() => Object.fromEntries(list.map((c) => [c.code, c.name])), [list]);
  const [trip, setTrip] = useState(null);
  const [lb, setLb] = useState(-1);
  if (isError) return <div className="page"><div className="card-x flex flex-col items-center gap-3 p-10 text-center" data-testid="public-profile-unavailable"><Lock className="h-8 w-8 text-slate-500" /><p className="font-display text-xl font-bold">Perfil no disponible</p><p className="text-sm text-slate-400">Este perfil no existe o es privado.</p></div></div>;
  if (!d) return <PageLoader />;
  const { profile: p, stats: s } = d;

  return (
    <div className="page space-y-10" data-testid="public-profile-page">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar url={p.avatar_url} name={p.display_name} className="h-28 w-28" />
        <div className="flex-1">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="public-display-name">{p.display_name}</h1>
          <p className="font-mono-j text-sm text-cyan-300">@{p.username} · {s.level.name}</p>
          {p.is_demo && <span className="mt-1 inline-block rounded-full bg-fuchsia-400/15 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">DATOS DE EJEMPLO</span>}
          {p.bio && <p className="mt-2 max-w-xl text-slate-300">{p.bio}</p>}
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">{p.country_code && <Flag code={p.country_code} />}{d.followers} seguidores · {d.following} seguidos</div>
          {d.is_own && !d.is_public && <p className="mt-2 text-xs text-amber-300">Vista previa: tu perfil es privado y solo tú puedes verlo.</p>}
        </div>
        {!d.is_own && <FollowButton username={p.username} following={d.is_following} testId="public-follow-btn" />}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="public-stats">
        {[[s.world_percent != null ? `${fmtNum(s.world_percent)}%` : null, "del mundo"], [s.countries_visited, "países"], [s.cities_visited, "ciudades"], [s.trips, "viajes"], [s.photos, "fotos"]].map(([v, l]) => (
          <div key={l} className="card-x p-4"><p className="font-display text-3xl font-bold">{v ?? <Lock className="h-6 w-6 text-slate-600" />}</p><p className="text-sm text-slate-400">{l}</p></div>
        ))}
      </section>

      {d.countries && (
        <section className="overflow-hidden rounded-3xl border border-white/10">
          <WorldGlobe visited={d.countries.map((c) => c.code)} names={names} pins={d.countries.map((c) => ({ code: c.code, ...(list.find((x) => x.code === c.code) || {}) }))} height={440} testId="public-globe" />
          <div className="flex flex-wrap gap-2 bg-[#12141C] p-4">{d.countries.map((c) => <span key={c.code} className="chip text-xs"><Flag code={c.code} />{c.name}</span>)}</div>
        </section>
      )}

      {d.passport?.length > 0 && (
        <section id="pasaporte">
          <SectionTitle title="Pasaporte" sub={`${d.passport.length} sellos`} />
          <div className="grid grid-cols-2 gap-6 rounded-3xl bg-[#0e1017] p-6 sm:grid-cols-4 lg:grid-cols-6" data-testid="public-passport">{d.passport.map((st) => <PassportStamp key={st.code} stamp={st} />)}</div>
        </section>
      )}

      {s.achievements?.length > 0 && (
        <section>
          <SectionTitle title="Logros" />
          <div className="flex flex-wrap gap-2">{s.achievements.map((a) => <span key={a.key} className="chip border-cyan-400/30 text-xs">{a.title}</span>)}</div>
        </section>
      )}

      <section>
        <SectionTitle title="Viajes publicados" sub={`${d.trips.length} viajes`} />
        {d.trips.length ? <div className="grid gap-5 md:grid-cols-2">{d.trips.map((t) => <TripCard key={t.id} trip={t} onClick={() => setTrip(t)} />)}</div> : <p className="text-slate-500">Sin viajes publicados.</p>}
      </section>

      {d.photos?.length > 0 && (
        <section>
          <SectionTitle title="Fotografías" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{d.photos.map((ph, i) => <button key={ph.id} className="aspect-square overflow-hidden rounded-2xl" onClick={() => setLb(i)} data-testid={`public-photo-${i}`}><img src={mediaUrl(ph.url)} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}</div>
        </section>
      )}
      {trip && <TripSocial trip={trip} onClose={() => setTrip(null)} />}
      {lb >= 0 && <Lightbox photos={d.photos} index={lb} onClose={() => setLb(-1)} onIndex={setLb} />}
    </div>
  );
}
