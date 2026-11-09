import axios from "axios";
import { useMemo } from "react";
import { useAuth } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const mediaUrl = (u) => (!u ? null : u.startsWith("http") ? u : `${BACKEND_URL}${u}`);

export const errMsg = (e, fallback = "Algo ha fallado. Inténtalo de nuevo.") => {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(", ");
  return fallback;
};

export function useApi() {
  const { getToken, isSignedIn } = useAuth();
  return useMemo(() => {
    const inst = axios.create({ baseURL: API });
    inst.interceptors.request.use(async (c) => {
      if (isSignedIn) {
        const t = await getToken();
        if (t) c.headers.Authorization = `Bearer ${t}`;
      }
      return c;
    });
    return inst;
  }, [getToken, isSignedIn]);
}

export function useApiQuery(key, url, opts = {}) {
  const api = useApi();
  return useQuery({ queryKey: key, queryFn: () => api.get(url).then((r) => r.data), ...opts });
}

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "countries" });
}

export async function uploadFiles(api, files, fields = {}) {
  const fd = new FormData();
  [...files].forEach((f) => fd.append("files", f));
  Object.entries(fields).forEach(([k, v]) => v != null && fd.append(k, v));
  const r = await api.post("/photos", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return r.data;
}

export async function copyLink(url, title = "MI MUNDO") {
  if (navigator.share) {
    try { await navigator.share({ title, url }); return "shared"; } catch { /* cancelled */ }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}
