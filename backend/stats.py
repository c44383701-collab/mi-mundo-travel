import math
from collections import Counter

from countries_data import CONTINENTS, CONTINENT_TOTALS, COUNTRY_BY_CODE, SOVEREIGN_CODES, TOTAL_COUNTRIES

LEVELS = [(0, "Turista curioso"), (5, "Explorador"), (10, "Aventurero"), (25, "Trotamundos"), (50, "Leyenda viajera")]


def haversine(a_lat, a_lng, b_lat, b_lng) -> float:
    r = 6371.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp, dl = p2 - p1, math.radians(b_lng - a_lng)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def trip_days(trip: dict, until_today: bool = False) -> int:
    from datetime import date
    try:
        s, e = date.fromisoformat(trip["start_date"][:10]), date.fromisoformat(trip["end_date"][:10])
        if until_today:
            if s > date.today():
                return 0
            e = min(e, date.today())
        return max((e - s).days + 1, 1)
    except (KeyError, TypeError, ValueError):
        return 0


def _achievements(n_countries, n_cities, n_continents, n_trips, n_photos):
    defs = [
        ("first_trip", "Primer viaje", "Crea tu primer viaje", n_trips, 1, "plane"),
        ("first_country", "Primer país", "Registra tu primer país", n_countries, 1, "flag"),
        ("countries_5", "5 países", "Visita 5 países", n_countries, 5, "map"),
        ("countries_10", "10 países", "Visita 10 países", n_countries, 10, "compass"),
        ("countries_25", "25 países", "Visita 25 países", n_countries, 25, "globe"),
        ("countries_50", "50 países", "Visita 50 países", n_countries, 50, "crown"),
        ("first_continent", "Primer continente", "Explora tu primer continente", n_continents, 1, "mountain"),
        ("continents_4", "4 continentes", "Explora 4 continentes", n_continents, 4, "earth"),
        ("continents_5", "Los 5 continentes", "Explora todos los continentes", n_continents, 5, "trophy"),
        ("first_city", "Primera ciudad", "Registra tu primera ciudad", n_cities, 1, "building"),
        ("cities_25", "25 ciudades", "Visita 25 ciudades", n_cities, 25, "landmark"),
        ("cities_100", "100 ciudades", "Visita 100 ciudades", n_cities, 100, "medal"),
        ("photos_50", "Fotógrafo viajero", "Publica 50 fotografías", n_photos, 50, "camera"),
    ]
    return [{"key": k, "title": t, "description": d, "progress": min(v, goal), "goal": goal,
             "unlocked": v >= goal, "icon": icon} for k, t, d, v, goal, icon in defs]


async def compute_stats(db, profile: dict) -> dict:
    uid = profile["user_id"]
    visited = await db.visited_countries.find({"user_id": uid}, {"_id": 0}).to_list(500)
    cities = await db.cities.find({"user_id": uid}, {"_id": 0, "comments": 0}).to_list(5000)
    trips = await db.trips.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    base = {"user_id": uid, "is_deleted": False, "kind": "gallery"}
    n_photos = await db.photos.count_documents({**base, "media_type": "image"})
    n_videos = await db.photos.count_documents({**base, "media_type": "video"})

    codes = {v["country_code"] for v in visited if v["country_code"] in SOVEREIGN_CODES}
    territories = [v["country_code"] for v in visited if v["country_code"] in COUNTRY_BY_CODE and v["country_code"] not in SOVEREIGN_CODES]
    cont_visited = Counter(COUNTRY_BY_CODE[c]["continent"] for c in codes)
    continents = [{"key": k, "name": name, "visited": cont_visited.get(k, 0), "total": CONTINENT_TOTALS[k],
                   "percent": round(cont_visited.get(k, 0) / CONTINENT_TOTALS[k] * 100, 1)}
                  for k, name in CONTINENTS.items()]
    unique_cities = {(c["name"].strip().lower(), c["country_code"]) for c in cities}

    located = sorted([c for c in cities if c.get("lat") is not None and c.get("lng") is not None],
                     key=lambda c: (c.get("visit_date") or "9999", c.get("created_at") or ""))
    km = None
    if len(located) >= 2:
        km = round(sum(haversine(a["lat"], a["lng"], b["lat"], b["lng"]) for a, b in zip(located, located[1:])))

    farthest = None
    home = profile.get("home_city") or {}
    if home.get("lat") is not None:
        points = [(c["name"], c["lat"], c["lng"]) for c in located]
        points += [(COUNTRY_BY_CODE[c]["name"], COUNTRY_BY_CODE[c]["lat"], COUNTRY_BY_CODE[c]["lng"])
                   for c in codes if not any(x["country_code"] == c for x in located)]
        if points:
            name, dist = max(((n, haversine(home["lat"], home["lng"], la, ln)) for n, la, ln in points), key=lambda x: x[1])
            farthest = {"name": name, "km": round(dist)}

    altitude = None
    with_elev = [c for c in cities if c.get("elevation") is not None]
    if with_elev:
        top = max(with_elev, key=lambda c: c["elevation"])
        altitude = {"name": top["name"], "meters": round(top["elevation"])}

    # one visit per trip that includes the country, plus each city visited outside any trip
    country_counter = Counter(c["country_code"] for c in cities if not c.get("trip_id"))
    for t in trips:
        if t.get("status") != "pendiente":
            country_counter.update(set(t.get("country_codes") or []) | {c["country_code"] for c in cities if c.get("trip_id") == t["id"]})
    most_country = None
    if country_counter:
        code, cnt = country_counter.most_common(1)[0]
        if code in COUNTRY_BY_CODE:
            most_country = {"code": code, "name": COUNTRY_BY_CODE[code]["name"], "count": cnt}
    city_counter = Counter((c["name"], c["country_code"]) for c in cities)
    most_city = None
    if city_counter:
        (name, code), cnt = city_counter.most_common(1)[0]
        most_city = {"name": name, "country_code": code, "count": cnt}

    n_countries, n_cities = len(codes), len(unique_cities)
    n_continents = sum(1 for c in continents if c["visited"] > 0)
    level_idx = max(i for i, (th, _) in enumerate(LEVELS) if n_countries >= th)
    next_th = LEVELS[level_idx + 1][0] if level_idx + 1 < len(LEVELS) else None
    return {
        "countries_visited": n_countries,
        "total_countries": TOTAL_COUNTRIES,
        "territories_visited": len(territories),
        "world_percent": round(n_countries / TOTAL_COUNTRIES * 100, 1),
        "cities_visited": n_cities,
        "continents_explored": n_continents,
        "continents": continents,
        "trips": len(trips),
        "days_traveling": sum(trip_days(t, until_today=True) for t in trips),
        "photos": n_photos,
        "videos": n_videos,
        "km_traveled": km,
        "farthest_place": farthest,
        "max_altitude": altitude,
        "most_visited_country": most_country,
        "most_visited_city": most_city,
        "level": {"index": level_idx + 1, "name": LEVELS[level_idx][1], "next_at": next_th},
        "achievements": _achievements(n_countries, n_cities, n_continents, len(trips), n_photos),
    }
