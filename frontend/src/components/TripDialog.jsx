import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useApi, useRefresh, errMsg, uploadFiles } from "@/lib/api";
import { STATUS } from "@/lib/geo";
import CountryPicker from "./CountryPicker";
import { Field, inputCls } from "./common";

const EMPTY = { title: "", description: "", country_codes: [], start_date: "", end_date: "", status: "pendiente", is_public: false };

export default function TripDialog({ open, onOpenChange, trip, onSaved }) {
  const api = useApi();
  const refresh = useRefresh();
  const [f, setF] = useState(EMPTY);
  const [cover, setCover] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(trip ? { ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, trip[k] ?? EMPTY[k]])) } : EMPTY);
    setCover(null);
  }, [open, trip]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.title.trim()) return toast.error("Ponle un nombre al viaje");
    if (f.start_date && f.end_date && f.end_date < f.start_date) return toast.error("La fecha final es anterior a la inicial");
    setSaving(true);
    try {
      const body = { ...f, start_date: f.start_date || null, end_date: f.end_date || null };
      const r = trip ? await api.put(`/trips/${trip.id}`, body) : await api.post("/trips", body);
      if (cover) {
        const [p] = await uploadFiles(api, [cover], { trip_id: r.data.id, kind: "cover" });
        await api.put(`/trips/${r.data.id}`, { cover_photo_id: p.id });
      }
      toast.success(trip ? "Viaje actualizado" : "Viaje creado");
      refresh();
      onOpenChange(false);
      onSaved?.(r.data);
    } catch (e) { toast.error(errMsg(e)); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#12141C] sm:max-w-lg" data-testid="trip-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{trip ? "Editar viaje" : "Nuevo viaje"}</DialogTitle>
          <DialogDescription>Organiza tu viaje por países y ciudades.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Nombre del viaje"><input className={inputCls} value={f.title} onChange={set("title")} placeholder="Viaje a Italia" data-testid="trip-title-input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio"><input type="date" className={inputCls} value={f.start_date || ""} onChange={set("start_date")} data-testid="trip-start-input" /></Field>
            <Field label="Fin"><input type="date" className={inputCls} value={f.end_date || ""} onChange={set("end_date")} data-testid="trip-end-input" /></Field>
          </div>
          <Field label="Estado">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(STATUS).map(([k, v]) => (
                <button type="button" key={k} onClick={() => setF({ ...f, status: k })} data-testid={`trip-status-${k}`}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${f.status === k ? v.cls : "border-white/10 text-slate-400 hover:bg-white/5"}`}>{v.label}</button>
              ))}
            </div>
          </Field>
          <Field label={`Países (${f.country_codes.length})`}>
            <CountryPicker multi value={f.country_codes} onChange={(v) => setF({ ...f, country_codes: v })} testId="trip-country-picker" />
          </Field>
          <Field label="Descripción"><textarea rows={3} className={inputCls} value={f.description || ""} onChange={set("description")} data-testid="trip-description-input" /></Field>
          <Field label="Foto de portada (opcional)">
            <input type="file" accept="image/*" className={`${inputCls} file:mr-3 file:rounded-full file:border-0 file:bg-[#0066FF] file:px-3 file:py-1 file:text-white`} onChange={(e) => setCover(e.target.files?.[0] || null)} data-testid="trip-cover-input" />
          </Field>
          <div className="flex items-center justify-between rounded-2xl bg-[#181B28] p-3">
            <div><p className="text-sm font-semibold">Compartir en mi perfil público</p><p className="text-xs text-slate-400">Visible para otros viajeros si tu perfil es público</p></div>
            <Switch checked={f.is_public} onCheckedChange={(v) => setF({ ...f, is_public: v })} data-testid="trip-public-switch" />
          </div>
          <button className="btn-primary w-full py-3" onClick={save} disabled={saving} data-testid="trip-save-btn">{saving ? "Guardando…" : trip ? "Guardar cambios" : "Crear viaje"}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
