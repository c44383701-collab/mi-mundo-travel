import { Link, NavLink } from "react-router-dom";
import { UserButton, useAuth } from "@clerk/react";
import { Home, User, Globe2, Compass, Users, BarChart3, BookOpen, MapPin } from "lucide-react";

const NAV = [
  { to: "/", label: "Inicio", icon: Home, end: true, id: "inicio" },
  { to: "/perfil", label: "Perfil", icon: User, id: "perfil" },
  { to: "/mundo", label: "Mi Mundo", icon: Globe2, id: "mundo" },
  { to: "/explorar", label: "Explorar", icon: Compass, id: "explorar" },
  { to: "/descubrir", label: "Descubrir", icon: Users, id: "descubrir" },
];
const EXTRA = [
  { to: "/estadisticas", label: "Mis estadísticas", icon: BarChart3, id: "estadisticas" },
  { to: "/pasaporte", label: "Mi pasaporte", icon: BookOpen, id: "pasaporte" },
  { to: "/ciudades", label: "Mis ciudades", icon: MapPin, id: "ciudades" },
];

export const Logo = () => (
  <Link to="/" className="flex items-center gap-2.5" data-testid="app-logo">
    <span className="logo-orb" />
    <span className="font-display text-lg font-extrabold tracking-tight">MI <span className="text-gradient">MUNDO</span></span>
  </Link>
);

const SideLink = ({ to, label, icon: Icon, end, id }) => (
  <NavLink to={to} end={end} data-testid={`sidebar-nav-${id}`}
    className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${isActive ? "bg-[#0066FF]/15 text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
    <Icon className="h-[18px] w-[18px]" />{label}
  </NavLink>
);

export default function AppShell({ children }) {
  const { isSignedIn } = useAuth();
  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100">
      {isSignedIn && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-[#0c0e15] px-4 py-7 lg:flex">
          <div className="px-3"><Logo /></div>
          <nav className="mt-10 space-y-1">{NAV.map((n) => <SideLink key={n.to} {...n} />)}</nav>
          <div className="mt-6 space-y-1 border-t border-white/5 pt-6">{EXTRA.map((n) => <SideLink key={n.to} {...n} />)}</div>
          <div className="mt-auto flex items-center gap-3 px-3" data-testid="sidebar-user-button"><UserButton /><span className="text-xs text-slate-500">Mi cuenta</span></div>
        </aside>
      )}
      <header className={`sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#090A0F]/80 px-4 py-3 backdrop-blur-xl ${isSignedIn ? "lg:hidden" : ""}`}>
        <Logo />
        <div className="flex items-center gap-1.5">
          {isSignedIn ? (
            <>
              {EXTRA.map(({ to, icon: Icon, id, label }) => (
                <Link key={to} to={to} aria-label={label} data-testid={`topbar-${id}`} className="rounded-full p-2.5 text-slate-300 hover:bg-white/5"><Icon className="h-5 w-5" /></Link>
              ))}
              <div className="ml-1" data-testid="topbar-user-button"><UserButton /></div>
            </>
          ) : (
            <>
              <Link to="/sign-in" className="btn-ghost px-4 py-2 text-sm" data-testid="header-signin-btn">Entrar</Link>
              <Link to="/sign-up" className="btn-primary px-4 py-2 text-sm" data-testid="header-signup-btn">Crear cuenta</Link>
            </>
          )}
        </div>
      </header>
      <main className={isSignedIn ? "pb-28 lg:pb-14 lg:pl-64" : "pb-14"}>{children}</main>
      {isSignedIn && (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0c0e15]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" data-testid="bottom-nav">
          <div className="grid grid-cols-5">
            {NAV.map(({ to, label, icon: Icon, end, id }) => (
              <NavLink key={to} to={to} end={end} data-testid={`bottom-nav-${id}`}
                className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${isActive ? "text-cyan-300" : "text-slate-400"}`}>
                {({ isActive }) => (<>
                  <span className={`rounded-full px-4 py-1 transition-colors ${isActive ? "bg-[#0066FF]/20" : ""}`}><Icon className="h-5 w-5" /></span>
                  {label}
                </>)}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
