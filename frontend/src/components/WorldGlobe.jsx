import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { flagUrl } from "@/lib/geo";
import { BACKEND_URL } from "@/lib/api";

let geoPromise;
const loadGeo = () => (geoPromise ||= fetch("/countries.geojson").then((r) => r.json()).then((d) => d.features));

export const featureCode = (f) => {
  const p = f.properties;
  return p.ISO_A2_EH && p.ISO_A2_EH !== "-99" ? p.ISO_A2_EH : p.ISO_A2;
};
const polysOf = (f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);
const TINY_R = { VA: 0.02, MC: 0.03, GI: 0.06, SM: 0.08, LI: 0.1, AD: 0.12 };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function WorldGlobe({ visited = [], names = {}, places = [], pins = [], cities = [], onCountryClick, onCityClick, height = 520, focus, testId = "world-globe" }) {
  const wrap = useRef(null);
  const globe = useRef(null);
  const clickRef = useRef(onCountryClick);
  const cityRef = useRef(onCityClick);
  clickRef.current = onCountryClick;
  cityRef.current = onCityClick;
  const [width, setWidth] = useState(0);
  const [features, setFeatures] = useState([]);
  const [hover, setHover] = useState(null);
  const [near, setNear] = useState(false);
  const small = window.innerWidth < 768;
  const visitedKey = [...visited].sort().join(",");
  const tileUrl = useMemo(() => (x, y, l) => `${BACKEND_URL}/api/tiles/${l}/${x}/${y}.jpg?s=2&v=${visitedKey}`, [visitedKey]);

  useEffect(() => { loadGeo().then(setFeatures); }, []);
  useEffect(() => { globe.current?.globeTileEngineClearCache?.(); }, [visitedKey]);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (focus && globe.current) globe.current.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 1.4 }, 1200);
  }, [focus]);

  const featureCodes = useMemo(() => new Set(features.map(featureCode)), [features]);
  // flag pins only for countries too small to see from far away; city names only when zoomed in
  const html = useMemo(() => {
    const wide = new Set();
    features.forEach((f) => {
      const xs = polysOf(f).flatMap((p) => p[0].map((c) => c[0]));
      if (Math.max(...xs) - Math.min(...xs) > 3.5) wide.add(featureCode(f));
    });
    if (near) return cities.filter((c) => c.lat != null && c.lng != null).map((c) => ({ ...c, kind: "city" }));
    return pins.filter((p) => !wide.has(p.code) && p.lat != null).map((p) => ({ ...p, kind: "pin" }));
  }, [features, pins, cities, near]);

  const onReady = () => {
    const g = globe.current;
    if (!g) return;
    window.__miMundoGlobe = g;
    const c = g.controls();
    c.autoRotate = true;
    c.autoRotateSpeed = 0.45;
    c.minDistance = 101.2;
    c.maxDistance = 520;
    c.zoomSpeed = 0.8;
    let t;
    c.addEventListener("start", () => { c.autoRotate = false; clearTimeout(t); });
    c.addEventListener("end", () => { t = setTimeout(() => { if (g.pointOfView().altitude > 1.2) c.autoRotate = true; }, 5000); });
    g.pointOfView({ lat: 32, lng: 8, altitude: small ? 2.7 : 2.15 }, 0);
  };

  return (
    <div ref={wrap} className="relative w-full overflow-hidden stars-bg" style={{ height }} data-testid={testId}>
      {width > 0 && (
        <Globe
          ref={globe}
          width={width}
          height={height}
          backgroundColor="rgba(0,0,0,0)"
          globeTileEngineUrl={tileUrl}
          showAtmosphere
          atmosphereColor="#1e90ff"
          atmosphereAltitude={0.2}
          onGlobeReady={onReady}
          onZoom={(pov) => setNear(pov.altitude < 0.9)}
          polygonsData={features}
          polygonCapColor={(d) => (d === hover ? "rgba(0,240,255,0.22)" : "rgba(0,0,0,0)")}
          polygonSideColor={() => "rgba(0,0,0,0)"}
          polygonStrokeColor={() => "rgba(0,0,0,0)"}
          polygonAltitude={0.002}
          polygonLabel={(d) => `<div class="globe-tip">${esc(names[featureCode(d)] || d.properties.NAME_ES || d.properties.NAME)}</div>`}
          onPolygonHover={near ? undefined : setHover}
          onPolygonClick={(d, _e, at) => {
            const code = featureCode(d);
            // tiny countries/territories (Gibraltar, Vaticano…) have no click polygon: pick them when clicked nearby
            const tiny = at && places.find((p) => p.code !== code && !featureCodes.has(p.code) && Math.hypot(p.lat - at.lat, p.lng - at.lng) < (TINY_R[p.code] ?? 0.2));
            if (tiny) return clickRef.current?.(tiny.code);
            clickRef.current?.(code, d.properties.NAME_ES || d.properties.NAME);
          }}
          htmlElementsData={html}
          htmlAltitude={0.003}
          htmlElement={(d) => {
            const el = document.createElement("div");
            if (d.kind === "city") {
              el.innerHTML = `<div style="display:flex;align-items:center;gap:6px;transform:translate(-5px,-50%)"><span style="width:10px;height:10px;border-radius:9999px;background:#00F0FF;box-shadow:0 0 0 2px #fff,0 0 12px #00F0FF"></span><span style="font:600 12px 'Plus Jakarta Sans',sans-serif;color:#fff;text-shadow:0 1px 3px #000,0 0 6px #000;white-space:nowrap">${esc(d.name)}</span></div>`;
              el.onclick = () => cityRef.current?.(d);
            } else {
              el.innerHTML = `<img src="${flagUrl(d.code, 40)}" style="width:22px;height:15px;border-radius:3px;box-shadow:0 0 0 1.5px #fff,0 4px 10px rgba(0,0,0,.6);object-fit:cover;transform:translate(-50%,-50%)" />`;
              el.onclick = () => clickRef.current?.(d.code);
            }
            el.style.cssText = "pointer-events:auto;cursor:pointer";
            el.dataset.testid = d.kind === "city" ? "globe-city-label" : "globe-flag-pin";
            return el;
          }}
        />
      )}
    </div>
  );
}
