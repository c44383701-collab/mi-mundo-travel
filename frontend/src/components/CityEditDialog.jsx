import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApi, useApiQuery, useRefresh, errMsg } from "@/lib/api";
import { Field, inputCls } from "./common";

export default function CityEditDialog({ open, onOpenChange, city }) {
  const api = useApi();
  const refresh = useRefresh();
  const { data: trips = [] } = useApiQuery(["trips"], "/trips", { enabled: open });
  const [f, setF] = useState({});
  useEffect(() => {
    if (open && city) setF({ name: city.name, visit_date: city.visit_date || "", end_date: city.end_date || "", description: city.description || "",
      memories: city.memories || "", places: (city.places || []).join(", "), trip_id: city.trip_id || "" });
  }, [open, city]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    try {
      await api.put(`/cities/${city.id}`, { ...f, visit_date: f.visit_date || null, end_date: f.end_date || null, trip_id: f.trip_id || null,
        places: f.places.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) });
      toast.success("Ciudad actualizada");
      refresh();
      onOpenChange(false);
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#12141C] sm:max-w-lg" data-testid="city-edit-dialog">
        <DialogHeader><DialogTitle className="font-display text-2xl">Editar ciudad</DialogTitle><DialogDescription>Actualiza fechas, lugares y recuerdos.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <Field label="Nombre"><input className={inputCls} value={f.name || ""} onChange={set("name")} data-testid="city-edit-name" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde"><input type="date" className={inputCls} value={f.visit_date || ""} onChange={set("visit_date")} data-testid="city-edit-start" /></Field>
            <Field label="Hasta"><input type="date" className={inputCls} value={f.end_date || ""} onChange={set("end_date")} data-testid="city-edit-end" /></Field>
          </div>
          <Field label="Viaje">
            <select className={inputCls} value={f.trip_id || ""} onChange={set("trip_id")} data-testid="city-edit-trip">
              <option value="">Sin viaje</option>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </Field>
          <Field label="Descripción personal"><textarea rows={3} className={inputCls} value={f.description || ""} onChange={set("description")} data-testid="city-edit-description" /></Field>
          <Field label="Lugares visitados (separados por comas)"><textarea rows={2} className={inputCls} value={f.places || ""} onChange={set("places")} data-testid="city-edit-places" /></Field>
          <Field label="Experiencias y recuerdos"><textarea rows={4} className={inputCls} value={f.memories || ""} onChange={set("memories")} data-testid="city-edit-memories" /></Field>
          <button className="btn-primary w-full py-3" onClick={save} data-testid="city-edit-save">Guardar cambios</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
