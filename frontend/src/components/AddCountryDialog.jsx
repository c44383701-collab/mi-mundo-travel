import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApi, useRefresh, errMsg, uploadFiles } from "@/lib/api";
import { useCountries } from "@/lib/geo";
import CountryPicker from "./CountryPicker";
import { Field, Flag, inputCls } from "./common";

export default function AddCountryDialog({ open, onOpenChange, initialCode, existing, visitedCodes = [], onSaved }) {
  const api = useApi();
  const refresh = useRefresh();
  const { byCode } = useCountries();
  const [code, setCode] = useState(null);
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(existing?.country_code || initialCode || null);
    setDate(existing?.visit_date || "");
    setDesc(existing?.description || "");
    setFile(null);
  }, [open, existing, initialCode]);

  const save = async () => {
    if (!code) return toast.error("Selecciona un país");
    setSaving(true);
    try {
      const body = { visit_date: date || null, description: desc || null };
      if (existing) await api.put(`/visited/${code}`, body);
      else await api.post("/visited", { country_code: code, ...body });
      if (file) {
        const [p] = await uploadFiles(api, [file], { country_code: code });
        await api.put(`/visited/${code}`, { photo_id: p.id });
      }
      toast.success(existing ? "País actualizado" : `${byCode[code]?.name} añadido a tu mundo`);
      refresh();
      onOpenChange(false);
      onSaved?.(code);
    } catch (e) { toast.error(errMsg(e)); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#12141C] sm:max-w-lg" data-testid="add-country-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{existing ? "Editar país" : "Añadir país visitado"}</DialogTitle>
          <DialogDescription>Se pintará con los colores de su bandera en tu globo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {existing || initialCode ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[#181B28] p-3" data-testid="add-country-selected">
              <Flag code={code} className="h-8 w-12" />
              <span className="font-display text-lg font-semibold">{byCode[code]?.name}</span>
              {!existing && <button className="ml-auto text-xs text-cyan-300" onClick={() => { setCode(null); }} data-testid="add-country-change">Cambiar</button>}
            </div>
          ) : null}
          {!existing && !(initialCode && code) && (
            <CountryPicker value={code} onChange={setCode} disabledCodes={visitedCodes} testId="add-country-picker" />
          )}
          <Field label="Fecha de visita">
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} data-testid="add-country-date" />
          </Field>
          <Field label="Fotografía (opcional)">
            <input type="file" accept="image/*" className={`${inputCls} file:mr-3 file:rounded-full file:border-0 file:bg-[#0066FF] file:px-3 file:py-1 file:text-white`} onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="add-country-photo" />
          </Field>
          <Field label="Descripción">
            <textarea rows={3} className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="¿Qué recuerdas de este país?" data-testid="add-country-description" />
          </Field>
          <button className="btn-primary w-full py-3" disabled={saving} onClick={save} data-testid="add-country-save">
            {saving ? "Guardando…" : existing ? "Guardar cambios" : "Guardar como visitado"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
