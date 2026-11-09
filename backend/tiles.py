import io
import json
import math
from functools import lru_cache
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageEnhance, ImageOps

SAT_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
FLAG_URL = "https://flagcdn.com/w2560/{code}.png"
TS = 256
_http = requests.Session()
_http.headers["User-Agent"] = "mi-mundo-tiles"


def _px(lon, lat, z):
    n = TS * 2 ** z
    lat = max(min(lat, 85.0511), -85.0511)
    r = math.radians(lat)
    return (lon + 180) / 360 * n, (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n


def _load_features():
    data = json.loads((Path(__file__).parent / "data" / "countries50.geojson").read_text())
    feats = []
    for f in data["features"]:
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        items = []
        for poly in polys:
            xs = [c[0] for c in poly[0]]
            ys = [c[1] for c in poly[0]]
            items.append((poly, (min(xs), min(ys), max(xs), max(ys))))
        feats.append((f["properties"]["code"], items))
    return feats


FEATURES = _load_features()


@lru_cache(maxsize=4096)
def _sat(z, x, y) -> bytes:
    r = _http.get(SAT_URL.format(z=z, x=x, y=y), timeout=20)
    r.raise_for_status()
    return r.content


@lru_cache(maxsize=256)
def _flag(code):
    try:
        r = _http.get(FLAG_URL.format(code=code.lower()), timeout=20)
        r.raise_for_status()
        return Image.open(io.BytesIO(r.content)).convert("RGB")
    except Exception:
        return None


def _tile_lonlat_bbox(z, x, y):
    n = 2 ** z
    lon0, lon1 = x / n * 360 - 180, (x + 1) / n * 360 - 180
    lat = lambda t: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * t / n))))
    return lon0, lat(y + 1), lon1, lat(y)


@lru_cache(maxsize=2048)
def render_tile(z: int, x: int, y: int, visited: frozenset) -> bytes:
    sat = Image.open(io.BytesIO(_sat(z, x, y))).convert("RGB")
    if sat.size != (TS, TS):
        sat = sat.resize((TS, TS))
    dim = ImageEnhance.Brightness(ImageOps.grayscale(sat).convert("RGB")).enhance(0.72)
    out = Image.blend(dim, Image.new("RGB", (TS, TS), (8, 22, 48)), 0.22)
    ox, oy = x * TS, y * TS
    tb = _tile_lonlat_bbox(z, x, y)
    borders = []
    for code, items in FEATURES:
        for poly, (bx0, by0, bx1, by1) in items:
            if bx1 < tb[0] or bx0 > tb[2] or by1 < tb[1] or by0 > tb[3]:
                continue
            rings = [[(px - ox, py - oy) for px, py in (_px(lo, la, z) for lo, la in ring)] for ring in poly]
            borders.append(rings[0])
            if code not in visited:
                continue
            mask = Image.new("L", (TS, TS), 0)
            d = ImageDraw.Draw(mask)
            d.polygon(rings[0], fill=255)
            for hole in rings[1:]:
                d.polygon(hole, fill=0)
            flag = _flag(code)
            if flag is None:
                layer = Image.new("RGB", (TS, TS), (0, 180, 216))
            else:
                gx0, gy1 = _px(bx0, by0, z)
                gx1, gy0 = _px(bx1, by1, z)
                bw, bh = max(gx1 - gx0, 1), max(gy1 - gy0, 1)
                s = max(bw / flag.width, bh / flag.height)
                fx0 = gx0 + (bw - flag.width * s) / 2
                fy0 = gy0 + (bh - flag.height * s) / 2
                box = ((ox - fx0) / s, (oy - fy0) / s, (ox + TS - fx0) / s, (oy + TS - fy0) / s)
                layer = flag.transform((TS, TS), Image.EXTENT, box, Image.BICUBIC, fillcolor=(0, 0, 0))
                layer = Image.blend(sat, layer, 0.82)
            out.paste(layer, (0, 0), mask)
    d = ImageDraw.Draw(out, "RGBA")
    width = 1 if z < 5 else 2
    for ring in borders:
        d.line(ring + [ring[0]], fill=(255, 255, 255, 110), width=width)
    buf = io.BytesIO()
    out.save(buf, "JPEG", quality=88)
    return buf.getvalue()
