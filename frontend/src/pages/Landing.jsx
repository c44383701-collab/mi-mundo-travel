import { Link } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/react";
import { Globe2, BookOpen, Camera, MapPin, FlaskConical } from "lucide-react";
import { useApiQuery } from "@/lib/api";
import WorldGlobe from "@/components/WorldGlobe";

const FEATURES = [
  [Globe2, "Globo 3D", "Cada país visitado se pinta con su bandera."],
  [MapPin, "Ciudades", "Organiza tus viajes por ciudades y recuerdos."],
  [Camera, "Galerías", "Sube todas tus fotos y compártelas."],
  [BookOpen, "Pasaporte", "Un sello único por cada país."],
];

const DemoCard = () => {
  const { data } = useApiQuery(["demo-info"], "/demo-info", { retry: false });
  if (!data?.available) return null;
  return (
    <div className="card-x max-w-md border-fuchsia-400/30 p-4 text-sm" data-testid="demo-credentials-card">
      <p className="flex items-center gap-2 font-semibold text-fuchsia-300"><FlaskConical className="h-4 w-4" />Cuenta de demostración (datos de ejemplo)</p>
      <p className="mt-1 font-mono-j text-xs text-slate-300">{data.email}<br />{data.password}</p>
      {data.note && <p className="mt-1 text-[11px] text-slate-500">{data.note}</p>}
    </div>
  );
};

export function Landing() {
  return (
    <div data-testid="landing-page">
      <section className="relative">
        <WorldGlobe visited={["ES", "IT", "JP", "MX", "EG", "DE", "FR", "BR", "AU"]} height={Math.min(window.innerHeight * 0.72, 720)} testId="landing-globe" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090A0F] via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-10">
          <p className="label-x fade-up text-cyan-300">Pasaporte digital y red social de viajes</p>
          <h1 className="fade-up mt-2 max-w-3xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">Tu mundo, <span className="text-gradient">país a país.</span></h1>
          <p className="fade-up mt-3 max-w-xl text-slate-300">Registra tus viajes, colorea el planeta con las banderas que has visitado y descubre cuánto del mundo conoces.</p>
          <div className="fade-up mt-6 flex flex-wrap gap-3">
            <Link to="/sign-up" className="btn-primary px-7 py-3.5" data-testid="landing-signup-btn">Crear mi pasaporte</Link>
            <Link to="/sign-in" className="btn-ghost px-7 py-3.5" data-testid="landing-signin-btn">Iniciar sesión</Link>
          </div>
        </div>
      </section>
      <section className="page grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([Icon, t, d], i) => (
          <div key={t} className="card-x fade-up p-6" style={{ animationDelay: `${i * 90}ms` }}>
            <Icon className="h-7 w-7 text-cyan-300" /><p className="mt-4 font-display text-xl font-bold">{t}</p><p className="mt-1 text-sm text-slate-400">{d}</p>
          </div>
        ))}
      </section>
      <div className="page"><DemoCard /></div>
    </div>
  );
}

const AuthLayout = ({ children }) => (
  <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-2">
    <div className="relative hidden overflow-hidden lg:block">
      <img src="https://images.unsplash.com/photo-1558271736-cd043ef2e855?w=1400&q=75" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-black/30 to-transparent" />
      <div className="absolute bottom-10 left-10 right-10"><p className="font-display text-4xl font-extrabold">Cada viaje deja un sello.</p><p className="mt-2 text-slate-300">Empieza a construir tu historial viajero.</p></div>
    </div>
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-10">{children}<DemoCard /></div>
  </div>
);

export const SignInPage = () => <AuthLayout><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp /></AuthLayout>;
export const SignUpPage = () => <AuthLayout><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" /></AuthLayout>;
