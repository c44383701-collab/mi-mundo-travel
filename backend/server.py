import asyncio
import logging
import os
import re
import secrets
import uuid
from contextlib import suppress
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import httpx
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:
    from backend.clerk_auth import clerk_router, require_user, verify_session_token
    from backend.countries_data import COUNTRIES, COUNTRY_BY_CODE, CONTINENTS, CONTINENT_TOTALS, TOTAL_COUNTRIES
    from backend.stats import compute_stats, trip_days
    from backend import storage
except ModuleNotFoundError:
    from clerk_auth import clerk_router, require_user, verify_session_token
    from countries_data import COUNTRIES, COUNTRY_BY_CODE, CONTINENTS, CONTINENT_TOTALS, TOTAL_COUNTRIES
    from stats import compute_stats, trip_days
    import storage

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
logger = logging.getLogger("mimundo")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

INDEXES: dict[str, list[IndexModel]] = {
    "profiles": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True),
                 IndexModel([("id", ASCENDING)], name="id", unique=True),
                 IndexModel([("username", ASCENDING)], name="username", unique=True),
                 IndexModel([("is_public", ASCENDING)], name="is_public")],
    "trips": [IndexModel([("id", ASCENDING)], name="id", unique=True),
              IndexModel([("user_id", ASCENDING), ("start_date", DESCENDING)], name="user_start"),
              IndexModel([("share_token", ASCENDING)], name="share_token", sparse=True)],
    "visited_countries": [IndexModel([("user_id", ASCENDING), ("country_code", ASCENDING)], name="user_country", unique=True)],
    "cities": [IndexModel([("id", ASCENDING)], name="id", unique=True),
               IndexModel([("user_id", ASCENDING), ("country_code", ASCENDING)], name="user_country"),
               IndexModel([("trip_id", ASCENDING)], name="trip_id"),
               IndexModel([("share_token", ASCENDING)], name="share_token", sparse=True)],
    "photos": [IndexModel([("id", ASCENDING)], name="id", unique=True),
               IndexModel([("user_id", ASCENDING), ("is_deleted", ASCENDING), ("created_at", DESCENDING)], name="user_photos"),
               IndexModel([("city_id", ASCENDING), ("order", ASCENDING)], name="city_order"),
               IndexModel([("trip_id", ASCENDING)], name="trip_id")],
    "follows": [IndexModel([("follower_id", ASCENDING), ("following_id", ASCENDING)], name="pair", unique=True),
                IndexModel([("following_id", ASCENDING)], name="following")],
    "likes": [IndexModel([("user_id", ASCENDING), ("target_type", ASCENDING), ("target_id", ASCENDING)], name="like", unique=True)],
    "comments": [IndexModel([("target_type", ASCENDING), ("target_id", ASCENDING), ("created_at", ASCENDING)], name="target")],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


app = FastAPI(title="MI MUNDO API", version="1.0.0")
api = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def file_url(photo_id: Optional[str]) -> Optional[str]:
    return f"/api/files/{photo_id}" if photo_id else None


def check_country(code: str) -> str:
    code = (code or "").upper()
    if code not in COUNTRY_BY_CODE:
        raise HTTPException(400, "País no válido")
    return code


# ---------------- Profiles ----------------
USERNAME_RE = re.compile(r"^[a-z0-9_.]{3,30}$")
PUBLIC_PROFILE_FIELDS = ["id", "username", "display_name", "bio", "country_code", "avatar_url", "created_at", "is_demo"]


def _clerk_user(user_id: str) -> dict:
    try:
        r = requests.get(f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
                         headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "mi-mundo"})
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        logger.warning("Clerk lookup failed: %s", exc)
        return {}


async def get_profile(user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    prof = await db.profiles.find_one({"user_id": uid}, {"_id": 0})
    if prof:
        return prof
    cu = await run_in_threadpool(_clerk_user, uid)
    emails = cu.get("email_addresses") or []
    email = emails[0]["email_address"] if emails else ""
    local = re.sub(r"[^a-z0-9_.]", "", (email.split("@")[0] or "viajero").lower())[:20] or "viajero"
    username = local if len(local) >= 3 and not await db.profiles.find_one({"username": local}) else f"{local[:20]}{secrets.randbelow(9000) + 1000}"
    name = " ".join(x for x in [cu.get("first_name"), cu.get("last_name")] if x) or local
    prof = {
        "id": new_id(), "user_id": uid, "auth_provider": "clerk", "email": email,
        "username": username, "display_name": name, "bio": "", "country_code": None, "home_city": None,
        "avatar_url": None, "is_public": False, "show_countries": True, "show_cities": True, "show_photos": True,
        "external_links": {}, "is_demo": False, "created_at": now_iso(), "updated_at": now_iso(),
    }
    with suppress(Exception):
        await db.profiles.insert_one(dict(prof))
    return await db.profiles.find_one({"user_id": uid}, {"_id": 0})


async def optional_profile(request: Request) -> Optional[dict]:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    try:
        claims = verify_session_token(auth[7:])
    except HTTPException:
        return None
    return await db.profiles.find_one({"user_id": claims["sub"]}, {"_id": 0})


async def social_counts(profile_id: str) -> dict:
    return {"followers": await db.follows.count_documents({"following_id": profile_id}),
            "following": await db.follows.count_documents({"follower_id": profile_id})}


class HomeCity(BaseModel):
    name: str
    lat: float
    lng: float
    country_code: Optional[str] = None


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    display_name: Optional[str] = Field(None, max_length=60)
    bio: Optional[str] = Field(None, max_length=500)
    country_code: Optional[str] = None
    home_city: Optional[HomeCity] = None
    is_public: Optional[bool] = None
    show_countries: Optional[bool] = None
    show_cities: Optional[bool] = None
    show_photos: Optional[bool] = None


@api.get("/")
async def root():
    return {"app": "MI MUNDO", "version": "1.0.0"}


@api.get("/demo-info")
async def demo_info():
    email = os.environ.get("DEMO_EMAIL")
    live = os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_")
    if live or not email or not await db.profiles.find_one({"email": email, "is_demo": True}):
        return {"available": False}
    return {"available": True, "email": email, "password": os.environ.get("DEMO_PASSWORD"),
            "note": "Si se pide un código de verificación, usa 424242."}


@api.get("/me")
async def me(profile: dict = Depends(get_profile)):
    return {**profile, **await social_counts(profile["id"])}


@api.put("/me")
async def update_me(body: ProfileUpdate, profile: dict = Depends(get_profile)):
    data = body.model_dump(exclude_unset=True)
    if "username" in data:
        data["username"] = (data["username"] or "").strip().lower()
        if not USERNAME_RE.match(data["username"]):
            raise HTTPException(400, "El nombre de usuario debe tener 3-30 caracteres: letras minúsculas, números, _ o .")
        if await db.profiles.find_one({"username": data["username"], "user_id": {"$ne": profile["user_id"]}}):
            raise HTTPException(409, "Ese nombre de usuario ya está en uso")
    if data.get("country_code"):
        data["country_code"] = check_country(data["country_code"])
    data["updated_at"] = now_iso()
    await db.profiles.update_one({"user_id": profile["user_id"]}, {"$set": data})
    return await db.profiles.find_one({"user_id": profile["user_id"]}, {"_id": 0})


# ---------------- Reference data & geo ----------------
@api.get("/countries")
async def countries():
    return {"total": TOTAL_COUNTRIES, "continents": [{"key": k, "name": v, "total": CONTINENT_TOTALS[k]} for k, v in CONTINENTS.items()],
            "countries": COUNTRIES}


@api.get("/geo/cities")
async def search_cities(q: str = Query(..., min_length=2), country: Optional[str] = None):
    params = {"name": q, "count": 15, "language": "es", "format": "json"}
    if country:
        params["countryCode"] = country.upper()
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get("https://geocoding-api.open-meteo.com/v1/search", params=params)
        results = r.json().get("results") or []
    except Exception as exc:
        logger.warning("geocoding failed: %s", exc)
        raise HTTPException(502, "El buscador de ciudades no está disponible ahora")
    return [{"name": x["name"], "lat": x["latitude"], "lng": x["longitude"], "elevation": x.get("elevation"),
             "country_code": x.get("country_code"), "country": x.get("country"), "admin1": x.get("admin1")}
            for x in results if x.get("country_code")]


# ---------------- Visited countries ----------------
class VisitedIn(BaseModel):
    country_code: str
    visit_date: Optional[str] = None
    description: Optional[str] = Field(None, max_length=2000)
    photo_id: Optional[str] = None


class VisitedUpdate(BaseModel):
    visit_date: Optional[str] = None
    description: Optional[str] = Field(None, max_length=2000)
    photo_id: Optional[str] = None


async def enrich_visited(items: list, uid: str) -> list:
    counts = {}
    async for row in db.cities.aggregate([{"$match": {"user_id": uid}},
                                          {"$group": {"_id": "$country_code", "names": {"$addToSet": {"$toLower": "$name"}}}}]):
        counts[row["_id"]] = len(row["names"])
    out = []
    for v in items:
        ref = COUNTRY_BY_CODE.get(v["country_code"])
        if ref:
            out.append({**v, "name": ref["name"], "continent": ref["continent"], "lat": ref["lat"], "lng": ref["lng"],
                        "cities_count": counts.get(v["country_code"], 0), "photo_url": file_url(v.get("photo_id"))})
    return out


async def add_visited(uid: str, code: str, visit_date=None, description=None, photo_id=None) -> dict:
    doc = {"id": new_id(), "user_id": uid, "country_code": code, "visit_date": visit_date,
           "description": description, "photo_id": photo_id, "created_at": now_iso()}
    await db.visited_countries.insert_one(dict(doc))
    return doc


@api.get("/visited")
async def list_visited(profile: dict = Depends(get_profile)):
    items = await db.visited_countries.find({"user_id": profile["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return await enrich_visited(items, profile["user_id"])


@api.post("/visited")
async def create_visited(body: VisitedIn, profile: dict = Depends(get_profile)):
    code = check_country(body.country_code)
    if await db.visited_countries.find_one({"user_id": profile["user_id"], "country_code": code}):
        raise HTTPException(409, "Ya tienes este país registrado")
    await add_visited(profile["user_id"], code, body.visit_date, body.description, body.photo_id)
    return (await enrich_visited([await db.visited_countries.find_one({"user_id": profile["user_id"], "country_code": code}, {"_id": 0})], profile["user_id"]))[0]


@api.put("/visited/{code}")
async def update_visited(code: str, body: VisitedUpdate, profile: dict = Depends(get_profile)):
    q = {"user_id": profile["user_id"], "country_code": code.upper()}
    res = await db.visited_countries.update_one(q, {"$set": body.model_dump(exclude_unset=True)})
    if res.matched_count == 0:
        raise HTTPException(404, "País no registrado")
    return (await enrich_visited([await db.visited_countries.find_one(q, {"_id": 0})], profile["user_id"]))[0]


@api.delete("/visited/{code}")
async def delete_visited(code: str, profile: dict = Depends(get_profile)):
    res = await db.visited_countries.delete_one({"user_id": profile["user_id"], "country_code": code.upper()})
    if res.deleted_count == 0:
        raise HTTPException(404, "País no registrado")
    return {"ok": True}


@api.get("/countries/{code}/detail")
async def country_detail(code: str, profile: dict = Depends(get_profile)):
    code = check_country(code)
    uid = profile["user_id"]
    visited = await db.visited_countries.find_one({"user_id": uid, "country_code": code}, {"_id": 0})
    cities = await db.cities.find({"user_id": uid, "country_code": code}, {"_id": 0}).sort("visit_date", 1).to_list(1000)
    photos = await db.photos.find({"user_id": uid, "country_code": code, "is_deleted": False, "kind": "gallery"}, {"_id": 0}).sort("created_at", -1).to_list(60)
    trips = await db.trips.find({"user_id": uid, "country_codes": code}, {"_id": 0}).to_list(100)
    return {"country": COUNTRY_BY_CODE[code], "visited": (await enrich_visited([visited], uid))[0] if visited else None,
            "cities": [await enrich_city(c) for c in cities], "photos": [photo_out(p) for p in photos],
            "trips": [{"id": t["id"], "title": t["title"], "start_date": t.get("start_date"), "end_date": t.get("end_date")} for t in trips]}


# ---------------- Trips ----------------
TRIP_STATUSES = {"pendiente", "en_curso", "completado"}


class TripIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=5000)
    country_codes: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "pendiente"
    is_public: bool = False
    cover_photo_id: Optional[str] = None


class TripUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=5000)
    country_codes: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    is_public: Optional[bool] = None
    cover_photo_id: Optional[str] = None


async def enrich_trip(t: dict, light: bool = False) -> dict:
    cities = await db.cities.find({"trip_id": t["id"]}, {"_id": 0, "comments": 0}).sort("visit_date", 1).to_list(500)
    city_ids = [c["id"] for c in cities]
    pq = {"is_deleted": False, "kind": "gallery", "$or": [{"trip_id": t["id"]}, {"city_id": {"$in": city_ids}}]}
    n_photos = await db.photos.count_documents(pq)
    cover = t.get("cover_photo_id")
    if not cover:
        first_city_cover = next((c["cover_photo_id"] for c in cities if c.get("cover_photo_id")), None)
        cover = first_city_cover or ((await db.photos.find_one({**pq, "media_type": "image"}, {"id": 1})) or {}).get("id")
    out = {**t, "days": trip_days(t), "photo_count": n_photos, "cover_url": file_url(cover),
           "countries": [{"code": c, "name": COUNTRY_BY_CODE[c]["name"]} for c in t.get("country_codes", []) if c in COUNTRY_BY_CODE],
           "cities": [{"id": c["id"], "name": c["name"], "country_code": c["country_code"]} for c in cities]}
    if not light:
        out["cities"] = [await enrich_city(c) for c in cities]
    return out


async def own_trip(trip_id: str, uid: str) -> dict:
    t = await db.trips.find_one({"id": trip_id, "user_id": uid}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Viaje no encontrado")
    return t


def clean_trip(data: dict) -> dict:
    if "country_codes" in data and data["country_codes"] is not None:
        data["country_codes"] = list(dict.fromkeys(check_country(c) for c in data["country_codes"]))
    if data.get("status") and data["status"] not in TRIP_STATUSES:
        raise HTTPException(400, "Estado no válido")
    return data


@api.get("/trips")
async def list_trips(profile: dict = Depends(get_profile)):
    trips = await db.trips.find({"user_id": profile["user_id"]}, {"_id": 0}).sort("start_date", -1).to_list(500)
    return [await enrich_trip(t, light=True) for t in trips]


@api.post("/trips")
async def create_trip(body: TripIn, profile: dict = Depends(get_profile)):
    doc = {"id": new_id(), "user_id": profile["user_id"], **clean_trip(body.model_dump()), "share_token": None,
           "itinerary_ref": None, "created_at": now_iso(), "updated_at": now_iso()}
    await db.trips.insert_one(dict(doc))
    doc.pop("_id", None)
    return await enrich_trip(doc)


@api.get("/trips/{trip_id}")
async def get_trip(trip_id: str, profile: dict = Depends(get_profile)):
    return await enrich_trip(await own_trip(trip_id, profile["user_id"]))


@api.put("/trips/{trip_id}")
async def update_trip(trip_id: str, body: TripUpdate, profile: dict = Depends(get_profile)):
    await own_trip(trip_id, profile["user_id"])
    data = clean_trip(body.model_dump(exclude_unset=True))
    data["updated_at"] = now_iso()
    await db.trips.update_one({"id": trip_id}, {"$set": data})
    return await enrich_trip(await own_trip(trip_id, profile["user_id"]))


@api.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str, profile: dict = Depends(get_profile)):
    await own_trip(trip_id, profile["user_id"])
    await db.trips.delete_one({"id": trip_id})
    await db.cities.update_many({"trip_id": trip_id}, {"$set": {"trip_id": None}})
    await db.photos.update_many({"trip_id": trip_id}, {"$set": {"trip_id": None}})
    return {"ok": True}


@api.post("/trips/{trip_id}/share")
async def share_trip(trip_id: str, profile: dict = Depends(get_profile)):
    t = await own_trip(trip_id, profile["user_id"])
    token = t.get("share_token") or secrets.token_urlsafe(12)
    await db.trips.update_one({"id": trip_id}, {"$set": {"share_token": token}})
    return {"share_token": token}


# ---------------- Cities ----------------
class CityIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    country_code: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    elevation: Optional[float] = None
    admin1: Optional[str] = None
    visit_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = Field(None, max_length=5000)
    places: List[str] = []
    memories: Optional[str] = Field(None, max_length=5000)
    trip_id: Optional[str] = None
    mark_country_visited: bool = False


class CityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    visit_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = Field(None, max_length=5000)
    places: Optional[List[str]] = None
    memories: Optional[str] = Field(None, max_length=5000)
    trip_id: Optional[str] = None
    cover_photo_id: Optional[str] = None


class CommentIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


async def enrich_city(c: dict) -> dict:
    q = {"city_id": c["id"], "is_deleted": False, "kind": "gallery"}
    cover = c.get("cover_photo_id") or ((await db.photos.find_one({**q, "media_type": "image"}, {"id": 1}, sort=[("order", 1)])) or {}).get("id")
    ref = COUNTRY_BY_CODE.get(c["country_code"], {})
    return {**c, "country_name": ref.get("name"), "photo_count": await db.photos.count_documents(q), "cover_url": file_url(cover)}


async def own_city(city_id: str, uid: str) -> dict:
    c = await db.cities.find_one({"id": city_id, "user_id": uid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Ciudad no encontrada")
    return c


@api.get("/cities")
async def list_cities(country: Optional[str] = None, trip_id: Optional[str] = None, profile: dict = Depends(get_profile)):
    q = {"user_id": profile["user_id"]}
    if country:
        q["country_code"] = country.upper()
    if trip_id:
        q["trip_id"] = trip_id
    cities = await db.cities.find(q, {"_id": 0, "comments": 0}).sort("visit_date", -1).to_list(5000)
    return [await enrich_city(c) for c in cities]


@api.post("/cities")
async def create_city(body: CityIn, profile: dict = Depends(get_profile)):
    uid = profile["user_id"]
    code = check_country(body.country_code)
    if body.trip_id:
        trip = await own_trip(body.trip_id, uid)
        if code not in trip.get("country_codes", []):
            await db.trips.update_one({"id": trip["id"]}, {"$push": {"country_codes": code}})
    data = body.model_dump(exclude={"mark_country_visited"})
    data["places"] = [p.strip() for p in data["places"] if p.strip()]
    doc = {"id": new_id(), "user_id": uid, **data, "country_code": code, "cover_photo_id": None,
           "comments": [], "share_token": None, "created_at": now_iso(), "updated_at": now_iso()}
    await db.cities.insert_one(dict(doc))
    country_added = False
    if body.mark_country_visited and not await db.visited_countries.find_one({"user_id": uid, "country_code": code}):
        await add_visited(uid, code, body.visit_date)
        country_added = True
    doc.pop("_id", None)
    return {"city": await enrich_city(doc), "country_added": country_added}


@api.get("/cities/{city_id}")
async def get_city(city_id: str, profile: dict = Depends(get_profile)):
    c = await own_city(city_id, profile["user_id"])
    out = await enrich_city(c)
    if c.get("trip_id"):
        t = await db.trips.find_one({"id": c["trip_id"]}, {"_id": 0, "id": 1, "title": 1})
        out["trip"] = t
    return out


@api.put("/cities/{city_id}")
async def update_city(city_id: str, body: CityUpdate, profile: dict = Depends(get_profile)):
    await own_city(city_id, profile["user_id"])
    data = body.model_dump(exclude_unset=True)
    if data.get("trip_id"):
        await own_trip(data["trip_id"], profile["user_id"])
    if data.get("cover_photo_id"):
        if not await db.photos.find_one({"id": data["cover_photo_id"], "user_id": profile["user_id"]}):
            raise HTTPException(404, "Foto no encontrada")
    if "places" in data and data["places"] is not None:
        data["places"] = [p.strip() for p in data["places"] if p.strip()]
    data["updated_at"] = now_iso()
    await db.cities.update_one({"id": city_id}, {"$set": data})
    return await get_city(city_id, profile)


@api.delete("/cities/{city_id}")
async def delete_city(city_id: str, profile: dict = Depends(get_profile)):
    await own_city(city_id, profile["user_id"])
    await db.cities.delete_one({"id": city_id})
    await db.photos.update_many({"city_id": city_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}


@api.post("/cities/{city_id}/comments")
async def add_city_comment(city_id: str, body: CommentIn, profile: dict = Depends(get_profile)):
    await own_city(city_id, profile["user_id"])
    comment = {"id": new_id(), "text": body.text.strip(), "created_at": now_iso()}
    await db.cities.update_one({"id": city_id}, {"$push": {"comments": comment}})
    return comment


@api.delete("/cities/{city_id}/comments/{comment_id}")
async def delete_city_comment(city_id: str, comment_id: str, profile: dict = Depends(get_profile)):
    await own_city(city_id, profile["user_id"])
    await db.cities.update_one({"id": city_id}, {"$pull": {"comments": {"id": comment_id}}})
    return {"ok": True}


@api.post("/cities/{city_id}/share")
async def share_city(city_id: str, profile: dict = Depends(get_profile)):
    c = await own_city(city_id, profile["user_id"])
    token = c.get("share_token") or secrets.token_urlsafe(12)
    await db.cities.update_one({"id": city_id}, {"$set": {"share_token": token}})
    return {"share_token": token}


# ---------------- Photos ----------------
MAX_IMAGE = 25 * 1024 * 1024
MAX_VIDEO = 100 * 1024 * 1024


class PhotoUpdate(BaseModel):
    caption: Optional[str] = Field(None, max_length=1000)
    taken_at: Optional[str] = None
    location: Optional[str] = Field(None, max_length=200)


class ReorderIn(BaseModel):
    ids: List[str]


def photo_out(p: dict) -> dict:
    return {k: p.get(k) for k in ["id", "city_id", "trip_id", "country_code", "caption", "taken_at", "location",
                                   "order", "media_type", "content_type", "created_at"]} | {"url": file_url(p["id"])}


async def store_upload(uid: str, f: UploadFile, kind: str, **links) -> dict:
    ctype = f.content_type or ""
    if not (ctype.startswith("image/") or ctype.startswith("video/")):
        raise HTTPException(400, f"Formato no admitido: {f.filename}")
    media = "video" if ctype.startswith("video/") else "image"
    data = await f.read()
    if len(data) > (MAX_VIDEO if media == "video" else MAX_IMAGE):
        raise HTTPException(413, f"Archivo demasiado grande: {f.filename}")
    ext = (f.filename or "").rsplit(".", 1)[-1].lower() if "." in (f.filename or "") else "bin"
    pid = new_id()
    result = await run_in_threadpool(storage.put_object, f"{storage.APP_NAME}/uploads/{uid}/{pid}.{ext}", data, ctype)
    doc = {"id": pid, "user_id": uid, "storage_path": result["path"], "content_type": ctype, "media_type": media,
           "original_filename": f.filename, "size": result.get("size", len(data)), "kind": kind,
           "caption": None, "taken_at": None, "location": None, "is_deleted": False, "created_at": now_iso(), **links}
    await db.photos.insert_one(dict(doc))
    return doc


@api.post("/photos")
async def upload_photos(files: List[UploadFile] = File(...), city_id: Optional[str] = Form(None),
                        trip_id: Optional[str] = Form(None), country_code: Optional[str] = Form(None),
                        kind: str = Form("gallery"), profile: dict = Depends(get_profile)):
    uid = profile["user_id"]
    if kind not in {"gallery", "cover"}:
        raise HTTPException(400, "Tipo no válido")
    if city_id:
        city = await own_city(city_id, uid)
        country_code, trip_id = city["country_code"], trip_id or city.get("trip_id")
    if trip_id:
        await own_trip(trip_id, uid)
    if country_code:
        country_code = check_country(country_code)
    start = await db.photos.count_documents({"city_id": city_id, "is_deleted": False}) if city_id else 0
    out = []
    for i, f in enumerate(files[:50]):
        doc = await store_upload(uid, f, kind, city_id=city_id, trip_id=trip_id, country_code=country_code, order=start + i)
        out.append(photo_out(doc))
    return out


@api.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), profile: dict = Depends(get_profile)):
    doc = await store_upload(profile["user_id"], file, "avatar", city_id=None, trip_id=None, country_code=None, order=0)
    await db.profiles.update_one({"user_id": profile["user_id"]}, {"$set": {"avatar_url": file_url(doc["id"])}})
    return {"avatar_url": file_url(doc["id"])}


@api.get("/photos")
async def list_photos(city_id: Optional[str] = None, trip_id: Optional[str] = None, limit: int = Query(200, le=1000),
                      profile: dict = Depends(get_profile)):
    q = {"user_id": profile["user_id"], "is_deleted": False, "kind": "gallery"}
    sort = [("created_at", -1)]
    if city_id:
        q["city_id"], sort = city_id, [("order", 1), ("created_at", 1)]
    if trip_id:
        q["trip_id"] = trip_id
    photos = await db.photos.find(q, {"_id": 0}).sort(sort).to_list(limit)
    return [photo_out(p) for p in photos]


@api.put("/photos/{photo_id}")
async def update_photo(photo_id: str, body: PhotoUpdate, profile: dict = Depends(get_profile)):
    res = await db.photos.update_one({"id": photo_id, "user_id": profile["user_id"], "is_deleted": False},
                                     {"$set": body.model_dump(exclude_unset=True)})
    if res.matched_count == 0:
        raise HTTPException(404, "Foto no encontrada")
    return photo_out(await db.photos.find_one({"id": photo_id}, {"_id": 0}))


@api.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, profile: dict = Depends(get_profile)):
    uid = profile["user_id"]
    res = await db.photos.update_one({"id": photo_id, "user_id": uid}, {"$set": {"is_deleted": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Foto no encontrada")
    for coll in ("cities", "trips"):
        await db[coll].update_many({"user_id": uid, "cover_photo_id": photo_id}, {"$set": {"cover_photo_id": None}})
    await db.visited_countries.update_many({"user_id": uid, "photo_id": photo_id}, {"$set": {"photo_id": None}})
    return {"ok": True}


@api.post("/photos/reorder")
async def reorder_photos(body: ReorderIn, profile: dict = Depends(get_profile)):
    for i, pid in enumerate(body.ids):
        await db.photos.update_one({"id": pid, "user_id": profile["user_id"]}, {"$set": {"order": i}})
    return {"ok": True}


@api.get("/files/{photo_id}")
async def serve_file(photo_id: str):
    rec = await db.photos.find_one({"id": photo_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Archivo no encontrado")
    data, ctype = await run_in_threadpool(storage.get_object, rec["storage_path"])
    return Response(content=data, media_type=rec.get("content_type") or ctype,
                    headers={"Cache-Control": "public, max-age=86400"})


# ---------------- Stats, achievements, passport ----------------
@api.get("/stats")
async def my_stats(profile: dict = Depends(get_profile)):
    return await compute_stats(db, profile)


@api.get("/achievements")
async def my_achievements(profile: dict = Depends(get_profile)):
    s = await compute_stats(db, profile)
    return {"level": s["level"], "achievements": s["achievements"]}


async def passport_for(uid: str) -> list:
    items = await db.visited_countries.find({"user_id": uid}, {"_id": 0}).to_list(500)
    items.sort(key=lambda v: (v.get("visit_date") or "9999", v.get("created_at") or ""))
    return [{"number": i + 1, "code": v["country_code"], "name": COUNTRY_BY_CODE[v["country_code"]]["name"],
             "continent": COUNTRY_BY_CODE[v["country_code"]]["continent"], "visit_date": v.get("visit_date")}
            for i, v in enumerate(items) if v["country_code"] in COUNTRY_BY_CODE]


@api.get("/passport")
async def my_passport(profile: dict = Depends(get_profile)):
    return {"owner": {k: profile.get(k) for k in PUBLIC_PROFILE_FIELDS}, "stamps": await passport_for(profile["user_id"])}


@api.get("/home")
async def home(profile: dict = Depends(get_profile)):
    uid = profile["user_id"]
    stats = await compute_stats(db, profile)
    today = datetime.now(timezone.utc).date().isoformat()
    last_trip = await db.trips.find_one({"user_id": uid, "start_date": {"$lte": today}}, {"_id": 0}, sort=[("start_date", -1)]) \
        or await db.trips.find_one({"user_id": uid}, {"_id": 0}, sort=[("created_at", -1)])
    latest_countries = await db.visited_countries.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(8)
    photos = await db.photos.find({"user_id": uid, "is_deleted": False, "kind": "gallery", "media_type": "image"}, {"_id": 0}).sort("created_at", -1).to_list(12)
    cities = await db.cities.find({"user_id": uid}, {"_id": 0, "comments": 0}).sort("created_at", -1).to_list(8)
    return {"profile": profile, "stats": stats, "last_trip": await enrich_trip(last_trip, light=True) if last_trip else None,
            "latest_countries": await enrich_visited(latest_countries, uid), "latest_photos": [photo_out(p) for p in photos],
            "latest_cities": [await enrich_city(c) for c in cities]}


# ---------------- Public / social ----------------
async def public_view(prof: dict, viewer: Optional[dict]) -> dict:
    uid = prof["user_id"]
    stats = await compute_stats(db, prof)
    out = {"profile": {k: prof.get(k) for k in PUBLIC_PROFILE_FIELDS}, **await social_counts(prof["id"]),
           "is_own": bool(viewer and viewer["user_id"] == uid), "is_public": prof.get("is_public", False),
           "is_following": bool(viewer and await db.follows.find_one({"follower_id": viewer["id"], "following_id": prof["id"]})),
           "privacy": {k: prof.get(k, True) for k in ["show_countries", "show_cities", "show_photos"]}}
    out["stats"] = {"trips": stats["trips"], "level": stats["level"], "achievements": [a for a in stats["achievements"] if a["unlocked"]]}
    if prof.get("show_countries", True):
        out["stats"].update({k: stats[k] for k in ["countries_visited", "total_countries", "world_percent", "continents_explored", "continents"]})
        visited = await db.visited_countries.find({"user_id": uid}, {"_id": 0, "description": 0}).to_list(500)
        out["countries"] = [{"code": v["country_code"], "name": COUNTRY_BY_CODE[v["country_code"]]["name"], "visit_date": v.get("visit_date")}
                            for v in visited if v["country_code"] in COUNTRY_BY_CODE]
        out["passport"] = await passport_for(uid)
    if prof.get("show_cities", True):
        out["stats"]["cities_visited"] = stats["cities_visited"]
        cities = await db.cities.find({"user_id": uid}, {"_id": 0, "name": 1, "country_code": 1}).to_list(2000)
        out["cities"] = cities
    trips = await db.trips.find({"user_id": uid, "is_public": True}, {"_id": 0}).sort("start_date", -1).to_list(100)
    out["trips"] = [await enrich_trip(t, light=True) for t in trips]
    if prof.get("show_photos", True):
        out["stats"]["photos"] = stats["photos"]
        photos = await db.photos.find({"user_id": uid, "is_deleted": False, "kind": "gallery", "media_type": "image"}, {"_id": 0}).sort("created_at", -1).to_list(30)
        out["photos"] = [photo_out(p) for p in photos]
    return out


@api.get("/public/users/{username}")
async def public_profile(username: str, viewer: Optional[dict] = Depends(optional_profile)):
    prof = await db.profiles.find_one({"username": username.lower()}, {"_id": 0})
    if not prof or (not prof.get("is_public") and not (viewer and viewer["user_id"] == prof["user_id"])):
        raise HTTPException(404, "Este perfil no existe o es privado")
    return await public_view(prof, viewer)


async def owner_card(uid: str) -> dict:
    p = await db.profiles.find_one({"user_id": uid}, {"_id": 0})
    return {k: (p or {}).get(k) for k in ["username", "display_name", "avatar_url", "is_public"]}


@api.get("/public/cities/{token}")
async def public_city(token: str):
    c = await db.cities.find_one({"share_token": token}, {"_id": 0, "user_id": 1, "id": 1})
    if not c:
        raise HTTPException(404, "Enlace no válido")
    city = await db.cities.find_one({"id": c["id"]}, {"_id": 0, "user_id": 0, "comments": 0})
    photos = await db.photos.find({"city_id": c["id"], "is_deleted": False, "kind": "gallery"}, {"_id": 0}).sort([("order", 1)]).to_list(500)
    return {"city": await enrich_city(city), "photos": [photo_out(p) for p in photos], "owner": await owner_card(c["user_id"])}


@api.get("/public/trips/{token}")
async def public_trip(token: str):
    t = await db.trips.find_one({"share_token": token}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Enlace no válido")
    uid = t.pop("user_id")
    trip = await enrich_trip(t)
    for c in trip["cities"]:
        c.pop("user_id", None)
        c.pop("comments", None)
    photos = await db.photos.find({"trip_id": t["id"], "is_deleted": False, "kind": "gallery"}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"trip": trip, "photos": [photo_out(p) for p in photos], "owner": await owner_card(uid)}


async def traveler_card(p: dict) -> dict:
    s = await compute_stats(db, p)
    show_c, show_ci, show_p = p.get("show_countries", True), p.get("show_cities", True), p.get("show_photos", True)
    return {**{k: p.get(k) for k in PUBLIC_PROFILE_FIELDS},
            "countries_visited": s["countries_visited"] if show_c else None,
            "world_percent": s["world_percent"] if show_c else None,
            "cities_visited": s["cities_visited"] if show_ci else None,
            "photos": s["photos"] if show_p else None,
            "public_trips": await db.trips.count_documents({"user_id": p["user_id"], "is_public": True}),
            "level": s["level"]["name"], **await social_counts(p["id"])}


@api.get("/discover/users")
async def discover(q: Optional[str] = None, viewer: Optional[dict] = Depends(optional_profile)):
    query = {"is_public": True}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"username": rx}, {"display_name": rx}]
    profiles = await db.profiles.find(query, {"_id": 0}).sort("created_at", -1).to_list(60)
    following = set()
    if viewer:
        following = {f["following_id"] async for f in db.follows.find({"follower_id": viewer["id"]})}
    return [{**await traveler_card(p), "is_following": p["id"] in following, "is_own": bool(viewer and viewer["id"] == p["id"])} for p in profiles]


@api.get("/explore")
async def explore():
    public = await db.profiles.find({"is_public": True}, {"_id": 0}).to_list(500)
    show_c = [p["user_id"] for p in public if p.get("show_countries", True)]
    show_ci = [p["user_id"] for p in public if p.get("show_cities", True)]
    top_countries = [{"code": r["_id"], "name": COUNTRY_BY_CODE[r["_id"]]["name"], "travelers": r["n"]}
                     async for r in db.visited_countries.aggregate([{"$match": {"user_id": {"$in": show_c}}},
                                                                     {"$group": {"_id": "$country_code", "n": {"$sum": 1}}},
                                                                     {"$sort": {"n": -1}}, {"$limit": 40}]) if r["_id"] in COUNTRY_BY_CODE]
    top_cities = [{"name": r["_id"]["name"], "country_code": r["_id"]["cc"], "travelers": len(r["u"]),
                   "lat": r.get("lat"), "lng": r.get("lng")}
                  async for r in db.cities.aggregate([{"$match": {"user_id": {"$in": show_ci}}},
                                                      {"$group": {"_id": {"name": "$name", "cc": "$country_code"}, "u": {"$addToSet": "$user_id"},
                                                                  "lat": {"$first": "$lat"}, "lng": {"$first": "$lng"}}},
                                                      {"$sort": {"u": -1}}, {"$limit": 24}])]
    top_cities.sort(key=lambda x: -x["travelers"])
    ranking = sorted([await traveler_card(p) for p in public if p.get("show_countries", True)],
                     key=lambda x: -(x["countries_visited"] or 0))[:10]
    return {"top_countries": top_countries, "top_cities": top_cities, "ranking": ranking,
            "community": {"travelers": len(public)}}


@api.post("/social/follow/{username}")
async def follow(username: str, profile: dict = Depends(get_profile)):
    target = await db.profiles.find_one({"username": username.lower(), "is_public": True}, {"_id": 0})
    if not target or target["id"] == profile["id"]:
        raise HTTPException(404, "Perfil no disponible")
    with suppress(Exception):
        await db.follows.insert_one({"follower_id": profile["id"], "following_id": target["id"], "created_at": now_iso()})
    return {"following": True, **await social_counts(target["id"])}


@api.delete("/social/follow/{username}")
async def unfollow(username: str, profile: dict = Depends(get_profile)):
    target = await db.profiles.find_one({"username": username.lower()}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Perfil no disponible")
    await db.follows.delete_one({"follower_id": profile["id"], "following_id": target["id"]})
    return {"following": False, **await social_counts(target["id"])}


async def public_trip_or_404(trip_id: str) -> dict:
    t = await db.trips.find_one({"id": trip_id, "is_public": True}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Publicación no disponible")
    return t


@api.post("/social/trips/{trip_id}/like")
async def toggle_like(trip_id: str, profile: dict = Depends(get_profile)):
    await public_trip_or_404(trip_id)
    q = {"user_id": profile["id"], "target_type": "trip", "target_id": trip_id}
    liked = not (await db.likes.delete_one(q)).deleted_count
    if liked:
        await db.likes.insert_one({**q, "created_at": now_iso()})
    return {"liked": liked, "likes": await db.likes.count_documents({"target_type": "trip", "target_id": trip_id})}


@api.get("/social/trips/{trip_id}/comments")
async def trip_comments(trip_id: str):
    await public_trip_or_404(trip_id)
    items = await db.comments.find({"target_type": "trip", "target_id": trip_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"likes": await db.likes.count_documents({"target_type": "trip", "target_id": trip_id}), "comments": items}


@api.post("/social/trips/{trip_id}/comments")
async def add_trip_comment(trip_id: str, body: CommentIn, profile: dict = Depends(get_profile)):
    await public_trip_or_404(trip_id)
    doc = {"id": new_id(), "target_type": "trip", "target_id": trip_id, "author_id": profile["id"],
           "author_username": profile["username"], "text": body.text.strip(), "created_at": now_iso()}
    await db.comments.insert_one(dict(doc))
    return doc


app.include_router(api)
app.include_router(clerk_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    try:
        await run_in_threadpool(storage.init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
