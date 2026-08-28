# MedFind — Polished Hackathon Prototype

A polished front-end prototype for **MedFind — medicine availability and reservation**.

## Included
- Role-based login (User / Pharmacy) with client-side routing
- Clean consumer medicine search experience
- Nearby pharmacy cards with stock, distance, price and last-confirmed time, sortable by closest / freshest / lowest price
- Pharmacy detail page
- Reservation flow with 30-minute hold, reservation ID, and status tracking
- User profile and settings
- Pharmacy inventory dashboard
- Pharmacy reservation queue and confirmation
- Multi-medicine search concept
- Responsive layout

## Routes
Everything lives in one app (`index.html` + `app.js`), routed client-side with the History API — no framework, no build step.

| Path | Portal | Notes |
|---|---|---|
| `/login` | Public | Role tabs (User / Pharmacy) |
| `/user`, `/user/search` | User | Find-medicine dashboard |
| `/user/pharmacies/:id` | User | Pharmacy detail |
| `/user/reservations` | User | Active reservation + tracking |
| `/user/profile`, `/user/settings` | User | |
| `/pharmacy` | Pharmacy | Inventory + reservation queue (unchanged from the original prototype, just gated behind login) |

`vercel.json` rewrites all paths to `index.html` so deep links and refreshes resolve correctly once deployed. Locally, only `python -m http.server` won't know about that rewrite — a hard refresh on a nested path (e.g. `/user/profile`) will 404 until you navigate there through the app's own links.

## Simulated auth
Login is a prototype convenience, not real authentication: any email/password logs you in as the selected role. Session and profile edits persist in `localStorage` on the device, with no backend.

## Prototype note
All pharmacy stock and reservation data are simulated for the hackathon. This prototype does not connect to real pharmacies, payment gateways, prescription services, or medical databases.

## Run locally
Open `index.html` directly, or serve the folder so routing behaves closer to production:
`python -m http.server 8000`

Then visit:
`http://localhost:8000`

## Tests
`test/smoke.js` is a headless regression check (login/routing/auth-guards/reservation flow/pharmacy dashboard) run with jsdom — not part of the deployed app. To run it: `npm install jsdom --no-save && node test/smoke.js`.

## Team
Logic Lords — Sahil Bergal, Vedant Patil, Om Mohite
