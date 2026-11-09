# MI MUNDO – PRD

## Original problem statement
Web app "MI MUNDO" – digital travel passport + travel social network (Spanish UI, dark premium design inspired by FindPenguins). Sections: Inicio, Mi Perfil, Mi Mundo (3D globe, visited countries painted with flags, world % = visited/195, continent progress, Mis países), Explorar, Descubrir. Trips organized by cities, city sheets with galleries (multi upload, cover, lightbox, delete, captions/dates/locations, ordering, share link), cities linked to countries, statistics & achievements, digital passport with stamps, public/private profiles with privacy toggles, social architecture prepared (follow, likes, comments). Real auth, real DB, object storage, demo user with labelled sample data. Future integration with tuitinerariocompleto.com (NOT connected yet).

## User choices
- Password recovery by real email (Clerk handles it), worldwide city search, profiles private by default.
- Iteration 2: add Gibraltar; globe must stay sharp ("4K") when zooming; show visited city names at correct positions.

## Architecture
- Frontend React + Tailwind + shadcn, react-globe.gl (tile engine), react-query, Clerk (@clerk/react, esES localization).
- Backend FastAPI + MongoDB (uuid ids), Emergent Object Storage for photos, Clerk JWT verification.
- Globe tiles: `/api/tiles/{z}/{x}/{y}.jpg?v=CODES` rendered server-side (ESRI World Imagery darkened + visited countries clipped with flags from flagcdn, Natural Earth 50m + Gibraltar from 10m).
- City search proxy: Open-Meteo geocoding (`/api/geo/cities`).
- Integration-ready: profile has global uuid `id`, `auth_provider`, `external_links`; trips have `itinerary_ref`; REST API documented at /docs.

## Implemented (2026-11)
- Auth (Clerk email+password, reset, persistence), profile auto-create, edit profile, avatar, privacy switches.
- Trips CRUD, share links; cities CRUD with country prompt; comments; galleries; country & continent pages; Mis ciudades.
- Mi Mundo globe, world stats, continent progress, visited/pending lists, country info dialog, edit/delete visited.
- Stats + achievements + levels; passport stamps (flag-colour derived); Explore tabs; Discover + follow; public profile with likes/comments; shared city/trip pages.
- Territories (Gibraltar + 28 more) selectable, excluded from 195 %.
- Sharp tile-based globe, city labels when zoomed, tiny-country click picking.
- Security: file access authorization, SVG blocked, share tokens not leaked, cache cleared on user switch.
- Demo seed: `python backend/seed_demo.py` (demo+clerk_test@mimundo.app).

## Backlog
- P1: revoke share links; pagination for >200 photos; >50 photo batch warning; upload resume on failure.
- P1: territory polygons separated from parent (e.g., Réunion vs France) in tiles.
- P2: HEIC conversion, same-name cities identity, Discover pagination, focus trap in lightbox.
- Future: integration with tuitinerariocompleto.com (shared accounts, saved routes ↔ trips).
