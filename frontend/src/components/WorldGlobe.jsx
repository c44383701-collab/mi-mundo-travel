import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import { flagUrl } from "@/lib/geo";

let geoPromise;
const loadGeo = () => (geoPromise ||= fetch("/countries.geojson").then((r) => r.json()).then((d) => d.features));
const flagImgs = {};
const loadFlag = (code) => (flagImgs[code] ||= new Promise((res) => {
  const i = new Image();
  i.crossOrigin = "anonymous";
  i.onload = () => res(i);
  i.onerror = () => res(null);
  i.src = flagUrl(code, 640);
}));

export const featureCode = (f) => {
  const p = f.properties;
  return p.ISO_A2_EH && p.ISO_A2_EH !== "-99" ? p.ISO_A2_EH : p.ISO_A2;
};
const polysOf = (f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);

async function paint(canvas, features, visited) {
  const W = canvas.width, H = canvas.height, ctx = canvas.getContext("2d");
  const flags = {};
  await Promise.all([...visited].map(async (c) => { flags[c] = await loadFlag(c); }));
  ctx.fillStyle = "#06101f";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(0,240,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 24; i++) { ctx.beginPath(); ctx.moveTo((i / 24) * W, 0); ctx.lineTo((i / 24) * W, H); ctx.stroke(); }
  for (let i = 0; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(0, (i / 12) * H); ctx.lineTo(W, (i / 12) * H); ctx.stroke(); }
  const px = (lng) => ((lng + 180) / 360) * W, py = (lat) => ((90 - lat) / 180) * H;
  for (const f of features) {
    const code = featureCode(f), isVisited = visited.has(code), img = flags[code];
    for (const poly of polysOf(f)) {
      const path = new Path2D();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      poly.forEach((ring, ri) => {
        ring.forEach(([lng, lat], i) => {
          const x = px(lng), y = py(lat);
          if (ri === 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
          i ? path.lineTo(x, y) : path.moveTo(x, y);
        });
        path.closePath();
      });
      if (isVisited && img) {
        ctx.save();
        ctx.clip(path, "evenodd");
        const bw = maxX - minX, bh = maxY - minY, s = Math.max(bw / img.width, bh / img.height);
        ctx.drawImage(img, minX + (bw - img.width * s) / 2, minY + (bh - img.height * s) / 2, img.width * s, img.height * s);
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = W / 2048 * 1.4;
      } else {
        ctx.fillStyle = isVisited ? "#00b4d8" : "#262b3a";
        ctx.fill(path, "evenodd");
        ctx.strokeStyle = "#4c556d";
        ctx.lineWidth = W / 2048;
      }
      ctx.stroke(path);
    }
  }
}

export default function WorldGlobe({ visited = [], names = {}, pins = [], onCountryClick, height = 520, focus, testId = "world-globe" }) {
  const wrap = useRef(null);
  const globe = useRef(null);
  const clickRef = useRef(onCountryClick);
  clickRef.current = onCountryClick;
  const [width, setWidth] = useState(0);
  const [features, setFeatures] = useState([]);
  const [hover, setHover] = useState(null);
  const small = window.innerWidth < 768;

  const canvas = useMemo(() => { const c = document.createElement("canvas"); c.width = small ? 2048 : 4096; c.height = c.width / 2; return c; }, [small]);
  const material = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return new THREE.MeshPhongMaterial({ map: tex, shininess: 6, specular: new THREE.Color("#0a2a4a") });
  }, [canvas]);
  const visitedKey = [...visited].sort().join(",");

  useEffect(() => { loadGeo().then(setFeatures); }, []);
  useEffect(() => {
    if (!features.length) return;
    let off = false;
    paint(canvas, features, new Set(visited)).then(() => { if (!off) material.map.needsUpdate = true; });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, visitedKey, canvas, material]);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (focus && globe.current) globe.current.pointOfView({ lat: focus.lat, lng: focus.lng, altitude: 1.6 }, 1200);
  }, [focus]);

  // pins only for countries too small to see their flag fill
  const pinData = useMemo(() => {
    const wide = new Set();
    features.forEach((f) => {
      const xs = polysOf(f).flatMap((p) => p[0].map((c) => c[0]));
      if (Math.max(...xs) - Math.min(...xs) > 3.5) wide.add(featureCode(f));
    });
    return pins.filter((p) => !wide.has(p.code));
  }, [features, pins]);

  const onReady = () => {
    const g = globe.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = true;
    c.autoRotateSpeed = 0.45;
    c.minDistance = 130;
    c.maxDistance = 520;
    let t;
    c.addEventListener("start", () => { c.autoRotate = false; clearTimeout(t); });
    c.addEventListener("end", () => { t = setTimeout(() => { c.autoRotate = true; }, 4000); });
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
          globeMaterial={material}
          showAtmosphere
          atmosphereColor="#1e90ff"
          atmosphereAltitude={0.22}
          onGlobeReady={onReady}
          polygonsData={features}
          polygonCapColor={(d) => (d === hover ? "rgba(0,240,255,0.30)" : "rgba(0,0,0,0)")}
          polygonSideColor={() => "rgba(0,0,0,0)"}
          polygonStrokeColor={() => "rgba(0,0,0,0)"}
          polygonAltitude={(d) => (d === hover ? 0.014 : 0.004)}
          polygonsTransitionDuration={200}
          polygonLabel={(d) => `<div class="globe-tip">${names[featureCode(d)] || d.properties.NAME_ES || d.properties.NAME}</div>`}
          onPolygonHover={setHover}
          onPolygonClick={(d) => clickRef.current?.(featureCode(d), d.properties.NAME_ES || d.properties.NAME)}
          htmlElementsData={pinData}
          htmlAltitude={0.02}
          htmlElement={(d) => {
            const el = document.createElement("div");
            el.innerHTML = `<img src="${flagUrl(d.code, 40)}" style="width:22px;height:15px;border-radius:3px;box-shadow:0 0 0 1.5px #fff,0 4px 10px rgba(0,0,0,.6);object-fit:cover" />`;
            el.style.cssText = "pointer-events:auto;cursor:pointer;transform:translate(-50%,-50%)";
            el.onclick = () => clickRef.current?.(d.code);
            return el;
          }}
        />
      )}
    </div>
  );
}
