import { Loader2 } from "lucide-react";
import { flagUrl } from "@/lib/geo";
import { mediaUrl } from "@/lib/api";

export const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center" data-testid="page-loader">
    <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
  </div>
);

export const Flag = ({ code, className = "h-4 w-6", w = 80 }) =>
  code ? <img src={flagUrl(code, w)} alt={code} className={`${className} rounded-[3px] object-cover shadow-sm`} loading="lazy" /> : null;

export const Avatar = ({ url, name, className = "h-12 w-12", testId }) => (
  <div data-testid={testId} className={`${className} shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 bg-gradient-to-br from-[#0066FF] to-[#00F0FF]`}>
    {url ? <img src={mediaUrl(url)} alt={name} className="h-full w-full object-cover" />
      : <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-white">{(name || "?").slice(0, 1).toUpperCase()}</div>}
  </div>
);

export const SectionTitle = ({ title, action, sub }) => (
  <div className="mb-4 flex items-end justify-between gap-4">
    <div>
      <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </div>
    {action}
  </div>
);

export const Empty = ({ icon: Icon, title, text, action, testId }) => (
  <div data-testid={testId} className="card-x flex flex-col items-center gap-3 px-6 py-10 text-center">
    {Icon && <div className="rounded-2xl bg-white/5 p-3"><Icon className="h-6 w-6 text-cyan-300" /></div>}
    <p className="font-display text-lg font-semibold">{title}</p>
    {text && <p className="max-w-sm text-sm text-slate-400">{text}</p>}
    {action}
  </div>
);

export const Field = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className="label-x">{label}</span>
    {children}
  </label>
);

export const inputCls = "w-full rounded-xl border border-white/10 bg-[#181B28] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20";
