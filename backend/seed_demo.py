"""Seed the clearly-labelled demo account (Clerk dev user + sample travel data). Idempotent."""
import asyncio
import json
import os
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")
import storage  # noqa: E402

SK = os.environ["CLERK_SECRET_KEY"]
EMAIL, PASSWORD = os.environ["DEMO_EMAIL"], os.environ["DEMO_PASSWORD"]
db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
U = "https://images.unsplash.com/photo-{}?w=1400&q=75&fm=jpg"
IMG = {
    "rome1": "1555992828-ca4dbe41d294", "rome2": "1552832230-c0197dd311b5", "venice1": "1558271736-cd043ef2e855",
    "venice2": "1523906834658-6e24ef2386f9", "florence": "1476362174823-3a23f4aa6d76", "berlin": "1587330979470-3595ac045ab0",
    "nuremberg": "1793043084239-ca1ac0b04b84", "kyoto": "1578469645742-46cae010e5d4", "seville": "1688404808661-92f72f2ea258",
}


def clerk(method, path, body=None):
    req = urllib.request.Request("https://api.clerk.com/v1" + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={"Authorization": "Bearer " + SK, "Content-Type": "application/json", "User-Agent": "mi-mundo-seed"})
    return json.load(urllib.request.urlopen(req))


def ensure_clerk_user():
    found = clerk("GET", "/users?email_address=" + urllib.parse.quote(EMAIL))
    if found:
        return found[0]["id"]
    return clerk("POST", "/users", {"email_address": [EMAIL], "password": PASSWORD, "skip_password_checks": True,
                                    "first_name": "Viajero", "last_name": "Demo"})["id"]


def now():
    return datetime.now(timezone.utc).isoformat()


async def upload(uid, key, **links):
    data = requests.get(U.format(IMG[key]), timeout=60).content
    pid = str(uuid.uuid4())
    res = storage.put_object(f"{storage.APP_NAME}/uploads/{uid}/{pid}.jpg", data, "image/jpeg")
    await db.photos.insert_one({"id": pid, "user_id": uid, "storage_path": res["path"], "content_type": "image/jpeg", "media_type": "image",
                                "original_filename": f"{key}.jpg", "size": len(data), "kind": "gallery", "caption": None, "taken_at": None,
                                "location": None, "is_deleted": False, "created_at": now(), **links})
    return pid


async def seed_user(uid, profile, countries, trips, cities, photos=True):
    for coll in ("visited_countries", "trips", "cities", "photos"):
        await db[coll].delete_many({"user_id": uid})
    existing = await db.profiles.find_one({"user_id": uid})
    await db.profiles.update_one({"user_id": uid}, {"$set": profile, "$setOnInsert": {"id": existing["id"] if existing else str(uuid.uuid4()), "created_at": now()}}, upsert=True)
    for code, date in countries:
        await db.visited_countries.insert_one({"id": str(uuid.uuid4()), "user_id": uid, "country_code": code, "visit_date": date,
                                               "description": "Dato de ejemplo (cuenta demo)", "photo_id": None, "created_at": now()})
    trip_ids = {}
    for key, t in trips.items():
        trip_ids[key] = str(uuid.uuid4())
        await db.trips.insert_one({"id": trip_ids[key], "user_id": uid, "cover_photo_id": None, "share_token": None, "itinerary_ref": None,
                                   "created_at": now(), "updated_at": now(), **t})
    for c in cities:
        cid = str(uuid.uuid4())
        imgs = c.pop("imgs", [])
        trip = trip_ids.get(c.pop("trip", None))
        await db.cities.insert_one({"id": cid, "user_id": uid, "trip_id": trip, "cover_photo_id": None, "comments": [], "share_token": None,
                                    "admin1": None, "end_date": None, "created_at": now(), "updated_at": now(), "places": [], "memories": None,
                                    "description": None, **c})
        for i, k in enumerate(imgs if photos else []):
            await upload(uid, k, city_id=cid, trip_id=trip, country_code=c["country_code"], order=i)


async def main():
    uid = ensure_clerk_user()
    base_profile = {"auth_provider": "clerk", "email": EMAIL, "username": "demo.viajero", "display_name": "Viajero Demo",
                    "bio": "Cuenta de demostración · todos los datos son de ejemplo para probar MI MUNDO.", "country_code": "ES",
                    "home_city": {"name": "Valencia", "lat": 39.47, "lng": -0.38, "country_code": "ES"}, "avatar_url": None,
                    "is_public": True, "show_countries": True, "show_cities": True, "show_photos": True, "external_links": {},
                    "is_demo": True, "updated_at": now()}
    countries = [("ES", "2015-06-01"), ("IT", "2024-05-10"), ("VA", "2024-05-12"), ("DE", "2025-10-03"), ("FR", "2019-08-14"),
                 ("PT", "2021-04-02"), ("AT", "2022-12-28"), ("HU", "2022-12-30"), ("EG", "2023-03-18"), ("JP", "2025-04-01"),
                 ("MX", "2023-11-05"), ("BE", "2020-02-10")]
    trips = {
        "it": {"title": "Viaje a Italia", "description": "Ruta clásica por Roma, Florencia, Venecia y Milán (ejemplo).", "country_codes": ["IT", "VA"],
               "start_date": "2024-05-10", "end_date": "2024-05-18", "status": "completado", "is_public": True},
        "de": {"title": "Ruta por Alemania", "description": "Mercados, historia y cerveza (ejemplo).", "country_codes": ["DE"],
               "start_date": "2025-10-03", "end_date": "2025-10-09", "status": "completado", "is_public": True},
        "jp": {"title": "Japón esencial", "description": "Templos y cerezos (ejemplo).", "country_codes": ["JP"],
               "start_date": "2025-04-01", "end_date": "2025-04-10", "status": "completado", "is_public": False},
        "pt": {"title": "Escapada a Lisboa", "description": "Próximo viaje (ejemplo).", "country_codes": ["PT"],
               "start_date": "2026-09-12", "end_date": "2026-09-15", "status": "pendiente", "is_public": False},
    }
    cities = [
        {"name": "Roma", "country_code": "IT", "lat": 41.89, "lng": 12.48, "elevation": 21, "visit_date": "2024-05-10", "trip": "it", "imgs": ["rome1", "rome2"],
         "places": ["Coliseo", "Foro Romano", "Fontana di Trevi"], "description": "La ciudad eterna (ejemplo).", "memories": "Atardecer en el Gianicolo."},
        {"name": "Ciudad del Vaticano", "country_code": "VA", "lat": 41.90, "lng": 12.45, "elevation": 75, "visit_date": "2024-05-12", "trip": "it", "places": ["Basílica de San Pedro"]},
        {"name": "Florencia", "country_code": "IT", "lat": 43.77, "lng": 11.25, "elevation": 50, "visit_date": "2024-05-13", "trip": "it", "imgs": ["florence"], "places": ["Duomo", "Ponte Vecchio"]},
        {"name": "Venecia", "country_code": "IT", "lat": 45.44, "lng": 12.33, "elevation": 2, "visit_date": "2024-05-15", "trip": "it", "imgs": ["venice1", "venice2"], "places": ["Puente de Rialto", "Plaza San Marcos"]},
        {"name": "Milán", "country_code": "IT", "lat": 45.46, "lng": 9.19, "elevation": 120, "visit_date": "2024-05-17", "trip": "it"},
        {"name": "Berlín", "country_code": "DE", "lat": 52.52, "lng": 13.40, "elevation": 34, "visit_date": "2025-10-03", "trip": "de", "imgs": ["berlin"], "places": ["Puerta de Brandeburgo"]},
        {"name": "Núremberg", "country_code": "DE", "lat": 49.45, "lng": 11.08, "elevation": 302, "visit_date": "2025-10-05", "trip": "de", "imgs": ["nuremberg"]},
        {"name": "Múnich", "country_code": "DE", "lat": 48.14, "lng": 11.58, "elevation": 519, "visit_date": "2025-10-07", "trip": "de"},
        {"name": "Leipzig", "country_code": "DE", "lat": 51.34, "lng": 12.37, "elevation": 113, "visit_date": "2025-10-09", "trip": "de"},
        {"name": "Kioto", "country_code": "JP", "lat": 35.01, "lng": 135.77, "elevation": 50, "visit_date": "2025-04-05", "trip": "jp", "imgs": ["kyoto"]},
        {"name": "Tokio", "country_code": "JP", "lat": 35.68, "lng": 139.69, "elevation": 40, "visit_date": "2025-04-01", "trip": "jp"},
        {"name": "Valencia", "country_code": "ES", "lat": 39.47, "lng": -0.38, "elevation": 15, "visit_date": "2015-06-01"},
        {"name": "Madrid", "country_code": "ES", "lat": 40.42, "lng": -3.70, "elevation": 667, "visit_date": "2018-03-10"},
        {"name": "Barcelona", "country_code": "ES", "lat": 41.39, "lng": 2.17, "elevation": 12, "visit_date": "2019-07-21"},
        {"name": "Sevilla", "country_code": "ES", "lat": 37.39, "lng": -5.99, "elevation": 7, "visit_date": "2020-04-15", "imgs": ["seville"]},
        {"name": "Granada", "country_code": "ES", "lat": 37.18, "lng": -3.60, "elevation": 738, "visit_date": "2021-10-12", "places": ["Alhambra"]},
        {"name": "Ciudad de México", "country_code": "MX", "lat": 19.43, "lng": -99.13, "elevation": 2240, "visit_date": "2023-11-05"},
        {"name": "El Cairo", "country_code": "EG", "lat": 30.04, "lng": 31.24, "elevation": 23, "visit_date": "2023-03-18"},
    ]
    await seed_user(uid, base_profile, countries, trips, cities)
    lucia = {**base_profile, "email": "lucia.demo@example.com", "username": "lucia.demo", "display_name": "Lucía Andes",
             "bio": "Perfil de ejemplo para la sección Descubrir.", "country_code": "AR",
             "home_city": {"name": "Buenos Aires", "lat": -34.6, "lng": -58.38, "country_code": "AR"}}
    await seed_user("demo_lucia", lucia, [("AR", "2010-01-01"), ("CL", "2018-02-01"), ("PE", "2019-07-01"), ("BR", "2020-01-10"),
                                         ("ES", "2022-05-01"), ("IT", "2022-05-12"), ("TH", "2023-08-01"), ("AU", "2024-02-01")], {},
                    [{"name": "Cusco", "country_code": "PE", "lat": -13.53, "lng": -71.97, "elevation": 3399, "visit_date": "2019-07-02"},
                     {"name": "Roma", "country_code": "IT", "lat": 41.89, "lng": 12.48, "elevation": 21, "visit_date": "2022-05-12"}], photos=False)
    print("Demo seeded for", EMAIL, uid)


asyncio.run(main())
