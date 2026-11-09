import { useEffect, useState } from "react";
import { flagUrl, fmtDate, CONTINENT_META } from "@/lib/geo";

const cache = {};
function useFlagColors(code) {
  const [c, setC] = useState(cache[code] || ["#00F0FF", "#e2e8f0"]);
  useEffect(() => {
    if (cache[code]) return setC(cache[code]);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = 40; cv.height = 27;
      const x = cv.getContext("2d");
      x.drawImage(img, 0, 0, 40, 27);
      const d = x.getImageData(0, 0, 40, 27).data, m = {};
      for (let i = 0; i < d.length; i += 4) {
        const k = [d[i], d[i + 1], d[i + 2]].map((v) => Math.min(255, Math.round(v / 40) * 40)).join(",");
        m[k] = (m[k] || 0) + 1;
      }
      const sat = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
      const vivid = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k]) => k.split(",").map(Number)).filter((v) => sat(v) > 60 && Math.max(...v) > 90);
      const pick = vivid.slice(0, 2).map(([r, g, b]) => `rgb(${r},${g},${b})`);
      while (pick.length < 2) pick.push(pick.length ? "#e2e8f0" : "#00F0FF");
      cache[code] = pick;
      setC(pick);
    };
    img.src = flagUrl(code, 80);
  }, [code]);
  return c;
}

const hash = (s) => [...s].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);

export default function PassportStamp({ stamp }) {
  const [c1, c2] = useFlagColors(stamp.code);
  const h = Math.abs(hash(stamp.code));
  const rot = (h % 15) - 7;
  const round = h % 2 === 0;
  const date = stamp.visit_date ? fmtDate(stamp.visit_date, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : "SIN FECHA";
  const no = String(stamp.number).padStart(3, "0");
  const cont = CONTINENT_META[stamp.continent]?.name?.toUpperCase();
  return (
    <div className="flex flex-col items-center" data-testid={`passport-stamp-${stamp.code}`}>
      <svg viewBox="0 0 200 200" className="w-full max-w-[190px] drop-shadow-[0_0_14px_rgba(0,0,0,0.5)]" style={{ transform: `rotate(${rot}deg)`, opacity: 0.95 }}>
        <defs>
          <path id={`arc-${stamp.code}`} d="M 32,100 A 68,68 0 0,1 168,100" />
          <path id={`arcb-${stamp.code}`} d="M 26,100 A 74,74 0 0,0 174,100" />
          <clipPath id={`clip-${stamp.code}`}><rect x="68" y="78" width="64" height="43" rx="5" /></clipPath>
        </defs>
        {round ? (<>
          <circle cx="100" cy="100" r="93" fill="none" stroke={c1} strokeWidth="5" />
          <circle cx="100" cy="100" r="83" fill="none" stroke={c1} strokeWidth="1.5" strokeDasharray="5 4" />
          <circle cx="100" cy="100" r="56" fill="none" stroke={c2} strokeWidth="2" />
          <text fill={c1} fontSize="15" fontWeight="700" letterSpacing="3" fontFamily="JetBrains Mono, monospace">
            <textPath href={`#arc-${stamp.code}`} startOffset="50%" textAnchor="middle">{stamp.name.toUpperCase().slice(0, 18)}</textPath>
          </text>
          <text fill={c2} fontSize="10" letterSpacing="2" fontFamily="JetBrains Mono, monospace">
            <textPath href={`#arcb-${stamp.code}`} startOffset="50%" textAnchor="middle">{`ENTRADA · Nº ${no}`}</textPath>
          </text>
        </>) : (<>
          <rect x="10" y="22" width="180" height="156" rx="18" fill="none" stroke={c1} strokeWidth="5" />
          <rect x="20" y="32" width="160" height="136" rx="12" fill="none" stroke={c2} strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="100" y="62" textAnchor="middle" fill={c1} fontSize="15" fontWeight="700" letterSpacing="2" fontFamily="JetBrains Mono, monospace">{stamp.name.toUpperCase().slice(0, 16)}</text>
          <text x="100" y="148" textAnchor="middle" fill={c2} fontSize="10" letterSpacing="2" fontFamily="JetBrains Mono, monospace">{`${cont || ""} · Nº ${no}`}</text>
        </>)}
        <image href={flagUrl(stamp.code, 160)} x="68" y="78" width="64" height="43" preserveAspectRatio="xMidYMid slice" clipPath={`url(#clip-${stamp.code})`} />
        <text x="100" y={round ? 138 : 168} textAnchor="middle" fill={c1} fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace" letterSpacing="1">{date}</text>
      </svg>
    </div>
  );
}
