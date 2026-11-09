import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useApi, useRefresh, errMsg } from "@/lib/api";
import { useCountries } from "@/lib/geo";
import CountryPicker from "./CountryPicker";
import CitySearch from "./CitySearch";
import { Avatar, Field, Flag, inputCls } from "./common";

const PRIVACY = [
  ["is_public", "Perfil público", "Aparecer en Descubrir y tener un enlace público"],
  ["show_countries", "Mostrar países", "Globo, porcentaje, pasaporte y lista de países"],
  ["show_cities", "Mostrar ciudades", "Ciudades visitadas en tu perfil público"],
  ["show_photos", "Mostrar fotografías", "Tus últimas fotos en el perfil público"],
];

export default function ProfileEditDialog({ open, onOpenChange, me }) {
  const api = useApi();
  const refresh = useRefresh();
  const { byCode } = useCountries();
  const [f, setF] = useState({});
  const [pickCountry, setPickCountry] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open && me) setF({ username: me.username, display_name: me.display_name, bio: me.bio || "", country_code: me.country_code,
      home_city: me.home_city, is_public: me.is_public, show_countries: me.show_countries, show_cities: me.show_cities, show_photos: me.show_photos });
  }, [open, me]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const onAvatar = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post("/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Foto de perfil actualizada");
      refresh();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const save = async () => {
    setSaving(true);
    try {
      await api.put("/me", f);
      toast.success("Perfil guardado");
      refresh();
      onOpenChange(false);
    } catch (e) { toast.error(errMsg(e)); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#12141C] sm:max-w-lg" data-testid="profile-edit-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Editar perfil</DialogTitle>
          <DialogDescription>Solo tú puedes editar tus datos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button className="relative" onClick={() => fileRef.current.click()} data-testid="profile-avatar-btn">
              <Avatar url={me?.avatar_url} name={me?.display_name} className="h-20 w-20" />
              <span className="absolute -bottom-1 -right-1 rounded-full bg-[#0066FF] p-1.5"><Camera className="h-4 w-4" /></span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} data-testid="profile-avatar-input" />
            <p className="text-sm text-slate-400">Toca la foto para cambiarla</p>
          </div>
          <Field label="Nombre visible"><input className={inputCls} value={f.display_name || ""} onChange={set("display_name")} data-testid="profile-display-name-input" /></Field>
          <Field label="Nombre de usuario"><input className={inputCls} value={f.username || ""} onChange={set("username")} data-testid="profile-username-input" /></Field>
          <Field label="Biografía"><textarea rows={3} className={inputCls} value={f.bio || ""} onChange={set("bio")} data-testid="profile-bio-input" /></Field>
          <Field label="País de residencia">
            {f.country_code && !pickCountry ? (
              <div className="flex items-center gap-3 rounded-xl bg-[#181B28] p-2.5">
                <Flag code={f.country_code} /><span className="flex-1 text-sm">{byCode[f.country_code]?.name}</span>
                <button className="text-xs text-cyan-300" onClick={() => setPickCountry(true)} data-testid="profile-country-change">Cambiar</button>
              </div>
            ) : <CountryPicker value={f.country_code} onChange={(c) => { setF({ ...f, country_code: c }); setPickCountry(false); }} testId="profile-country-picker" />}
          </Field>
          <Field label="Ciudad de residencia (para distancias)">
            {f.home_city && <p className="mb-2 text-sm text-cyan-200" data-testid="profile-home-city">{f.home_city.name}</p>}
            <CitySearch onSelect={(c) => c.lat != null && setF({ ...f, home_city: { name: c.name, lat: c.lat, lng: c.lng, country_code: c.country_code }, country_code: f.country_code || c.country_code })} placeholder="Buscar tu ciudad…" testId="profile-home-search" />
          </Field>
          <div className="space-y-2">
            <span className="label-x">Privacidad</span>
            {PRIVACY.map(([k, t, d]) => (
              <div key={k} className="flex items-center justify-between gap-3 rounded-2xl bg-[#181B28] p-3">
                <div><p className="text-sm font-semibold">{t}</p><p className="text-xs text-slate-400">{d}</p></div>
                <Switch checked={!!f[k]} onCheckedChange={(v) => setF({ ...f, [k]: v })} data-testid={`privacy-${k}`} />
              </div>
            ))}
          </div>
          <button className="btn-primary w-full py-3" onClick={save} disabled={saving} data-testid="profile-save-btn">{saving ? "Guardando…" : "Guardar perfil"}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
