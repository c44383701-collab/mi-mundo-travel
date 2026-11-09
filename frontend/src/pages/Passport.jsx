import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Share2, BookOpen, Plus } from "lucide-react";
import { useApiQuery, copyLink } from "@/lib/api";
import PassportStamp from "@/components/PassportStamp";
import { Avatar, PageLoader, Empty } from "@/components/common";

export default function Passport() {
  const { data } = useApiQuery(["passport"], "/passport");
  const { data: me } = useApiQuery(["me"], "/me");
  if (!data || !me) return <PageLoader />;
  const { owner, stamps } = data;
  const share = async () => {
    if (!me.is_public || !me.show_countries) return toast.info("Para compartir tu pasaporte, activa «Perfil público» y «Mostrar países» en Editar perfil.");
    if ((await copyLink(`${window.location.origin}/u/${me.username}#pasaporte`, "Mi pasaporte · MI MUNDO")) === "copied") toast.success("Enlace del pasaporte copiado");
  };
  return (
    <div className="page space-y-10" data-testid="passport-page">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1a3a] via-[#0d1020] to-[#12141C] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full border-[18px] border-cyan-400/10" />
        <p className="label-x text-cyan-300">Pasaporte digital · MI MUNDO</p>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <Avatar url={owner.avatar_url} name={owner.display_name} className="h-20 w-20 rounded-2xl" />
          <div className="font-mono-j text-sm">
            <p className="font-display text-3xl font-extrabold sm:text-4xl">{owner.display_name}</p>
            <p className="text-slate-400">@{owner.username} · Nº {String(owner.id).slice(0, 8).toUpperCase()}</p>
            <p className="mt-1 text-cyan-300" data-testid="passport-count">{stamps.length} SELLOS OFICIALES</p>
          </div>
          <button className="btn-ghost ml-auto px-5 py-2.5 text-sm" onClick={share} data-testid="passport-share-btn"><Share2 className="h-4 w-4" />Compartir</button>
        </div>
      </section>
      {stamps.length ? (
        <section className="grid grid-cols-2 gap-x-4 gap-y-8 rounded-3xl border border-white/5 bg-[#0e1017] p-6 sm:grid-cols-3 lg:grid-cols-5" data-testid="passport-stamps">
          {stamps.map((s) => <Link key={s.code} to={`/mundo/pais/${s.code}`}><PassportStamp stamp={s} /></Link>)}
        </section>
      ) : <Empty icon={BookOpen} title="Tu pasaporte está vacío" text="Cada país que marques como visitado generará un sello." action={<Link to="/mundo?add=1" className="btn-primary px-5 py-2.5 text-sm" data-testid="passport-add-country"><Plus className="h-4 w-4" />Añadir país</Link>} testId="passport-empty" />}
    </div>
  );
}
