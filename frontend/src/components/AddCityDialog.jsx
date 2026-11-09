import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApi, useRefresh, errMsg, uploadFiles, useApiQuery } from "@/lib/api";
import { useCountries } from "@/lib/geo";
import CitySearch from "./CitySearch";
import CountryPicker from "./CountryPicker";
import { Field, Flag, inputCls } from "./common";

export default function AddCityDialog({ open, onOpenChange, defaultCountry, tripId, onSaved }) {
  const api = useApi();
  const refresh = useRefresh();
  const { byCode } = useCountries();
  const { data: visited = [] } = useApiQuery(["visited"], "/visited", { enabled: open });
  const [city, setCity] = useState(null);
  const [form, setForm] = useState({});
  const [files, setFiles] = useState([]);
  const [ask, setAsk] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCity(null); setFiles([]); setAsk(false);
    setForm({ visit_date: "", end_date: "", description: "", memories: "", places: "" });
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const countryCode = city?.country_code || (city?.manual ? city.country_code : null);

  const submit = async (markCountry) => {
    setSaving(true);
    try {
      const body = {
        name: city.name, country_code: countryCode, lat: city.lat ?? null, lng: city.lng ?? null,
        elevation: city.elevation ?? null, admin1: city.admin1 || null,
        visit_date: form.visit_date || null, end_date: form.end_date || null,
        description: form.description || null, memories: form.memories || null,
        places: form.places.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        trip_id: tripId || null, mark_country_visited: markCountry,
      };
      const r = await api.post("/cities", body);
      if (files.length) await uploadFiles(api, files, { city_id: r.data.city.id });
      toast.success(`${city.name} guardada${r.data.country_added ? ` y ${byCode[countryCode]?.name} marcado como visitado` : ""}`);
      refresh();
      onOpenChange(false);
      onSaved?.(r.data.city);
    } catch (e) { toast.error(errMsg(e)); }
    setSaving(false);
    setAsk(false);
  };

  const onSave = () => {
    if (!city?.name || !countryCode) return toast.error("Selecciona la ciudad y su país");
    if (!visited.some((v) => v.country_code === countryCode)) return setAsk(true);
    submit(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#12141C] sm:max-w-lg" data-testid="add-city-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Añadir ciudad</DialogTitle>
          <DialogDescription>Busca la ciudad en el mapa mundial y guarda tus recuerdos.</DialogDescription>
        </DialogHeader>
        {!city ? (
          <CitySearch country={defaultCountry} onSelect={(c) => setCity(c.manual ? { ...c, country_code: defaultCountry || null } : c)} testId="add-city-search" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-[#181B28] p-3" data-testid="add-city-selected">
              {countryCode && <Flag code={countryCode} className="h-7 w-10" />}
              <div className="flex-1">
                <p className="font-display text-lg font-semibold">{city.name}</p>
                <p className="text-xs text-slate-400">{[city.admin1, byCode[countryCode]?.name].filter(Boolean).join(", ")}{city.elevation != null ? ` · ${Math.round(city.elevation)} m` : ""}</p>
              </div>
              <button className="text-xs text-cyan-300" onClick={() => setCity(null)} data-testid="add-city-change">Cambiar</button>
            </div>
            {city.manual && (
              <Field label="País de la ciudad">
                <CountryPicker value={city.country_code} onChange={(c) => setCity({ ...city, country_code: c })} testId="add-city-country-picker" />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde"><input type="date" className={inputCls} value={form.visit_date} onChange={set("visit_date")} data-testid="add-city-date-start" /></Field>
              <Field label="Hasta"><input type="date" className={inputCls} value={form.end_date} onChange={set("end_date")} data-testid="add-city-date-end" /></Field>
            </div>
            <Field label="Descripción personal"><textarea rows={2} className={inputCls} value={form.description} onChange={set("description")} data-testid="add-city-description" /></Field>
            <Field label="Lugares visitados (separados por comas)"><textarea rows={2} className={inputCls} value={form.places} onChange={set("places")} placeholder="Coliseo, Fontana di Trevi…" data-testid="add-city-places" /></Field>
            <Field label="Experiencias y recuerdos"><textarea rows={3} className={inputCls} value={form.memories} onChange={set("memories")} data-testid="add-city-memories" /></Field>
            <Field label="Fotografías">
              <input type="file" multiple accept="image/*,video/*" className={`${inputCls} file:mr-3 file:rounded-full file:border-0 file:bg-[#0066FF] file:px-3 file:py-1 file:text-white`} onChange={(e) => setFiles([...e.target.files])} data-testid="add-city-photos" />
              {files.length > 0 && <span className="text-xs text-slate-400">{files.length} archivo(s) seleccionados</span>}
            </Field>
            {ask ? (
              <div className="space-y-3 rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4" data-testid="add-city-country-prompt">
                <p className="text-sm"><b>{byCode[countryCode]?.name}</b> todavía no está en tus países visitados. ¿Quieres marcarlo también?</p>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary px-4 py-2 text-sm" disabled={saving} onClick={() => submit(true)} data-testid="add-city-mark-country-yes">Sí, marcar país y guardar</button>
                  <button className="btn-ghost px-4 py-2 text-sm" disabled={saving} onClick={() => submit(false)} data-testid="add-city-mark-country-no">Solo la ciudad</button>
                </div>
              </div>
            ) : (
              <button className="btn-primary w-full py-3" disabled={saving} onClick={onSave} data-testid="add-city-save">{saving ? "Guardando…" : "Guardar ciudad"}</button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
