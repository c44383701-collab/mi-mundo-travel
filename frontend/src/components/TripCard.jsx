import { Link } from "react-router-dom";
import { Lock, Camera, CalendarDays, Plane } from "lucide-react";
import { mediaUrl } from "@/lib/api";
import { STATUS, fmtRange } from "@/lib/geo";
import { Flag } from "./common";

export default function TripCard({ trip, to, big = false, onClick }) {
  const st = STATUS[trip.status] || STATUS.pendiente;
  const Inner = (
    <div className={`card-hover group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#181B28] ${big ? "h-80 sm:h-96" : "h-72"}`}>
      {trip.cover_url
        ? <img src={mediaUrl(trip.cover_url)} alt={trip.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        : <div className="absolute inset-0 bg-gradient-to-br from-[#0b2a5c] via-[#0a1530] to-[#090A0F]"><Plane className="absolute right-6 top-6 h-16 w-16 text-white/10" /></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold backdrop-blur ${st.cls}`} data-testid="trip-card-status">{st.label}</span>
        {!trip.is_public && <span className="rounded-full bg-black/50 p-1.5"><Lock className="h-3.5 w-3.5" /></span>}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="mb-2 flex flex-wrap gap-1.5">{(trip.countries || []).slice(0, 6).map((c) => <Flag key={c.code} code={c.code} className="h-4 w-6" />)}</div>
        <h3 className="font-display text-2xl font-bold leading-tight" data-testid="trip-card-title">{trip.title}</h3>
        <p className="mt-1 line-clamp-1 text-sm text-slate-300">
          {(trip.countries || []).map((c) => c.name).join(", ") || "Sin países"}{trip.cities?.length ? ` · ${trip.cities.map((c) => c.name).join(", ")}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-cyan-300" />{fmtRange(trip.start_date, trip.end_date)}</span>
          <span><b className="text-white">{trip.days}</b> días</span>
          <span className="flex items-center gap-1.5"><Camera className="h-3.5 w-3.5 text-cyan-300" />{trip.photo_count} fotos</span>
        </div>
      </div>
    </div>
  );
  if (onClick) return <button className="block w-full text-left" onClick={onClick} data-testid={`trip-card-${trip.id}`}>{Inner}</button>;
  return <Link to={to || `/viajes/${trip.id}`} className="block" data-testid={`trip-card-${trip.id}`}>{Inner}</Link>;
}
