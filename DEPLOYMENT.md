# Deployment guide — NavSafe

This document is written so you can **ship a resume-ready demo**: open the app on a phone or laptop via HTTPS, with the API reachable from the hosted frontend.

---

## What you are deploying

| Piece | Suggested approach | Why |
|-------|-------------------|-----|
| **Frontend** | Static hosting (Vercel, Netlify, Cloudflare Pages) | Vite build → static files; set `VITE_API_BASE_URL` at **build time**. |
| **Backend** | PaaS (Render, Railway, Fly.io) | Flask + `gunicorn`; set env vars on the service. |

SQLite on a single dyno works for **demos**; data can reset on redeploy. For a persistent portfolio, use **PostgreSQL** (`DATABASE_URL`) on the same provider.

---

## 1. Backend (Flask API)

### Environment variables (production)

Set these on the hosting dashboard (do **not** paste them in the repo):

| Key | Notes |
|-----|--------|
| `JWT_SECRET_KEY` | Long random string. |
| `GOOGLE_MAPS_API_KEY` | Same key as local if you use Maps/Directions. |
| `TWILIO_ACCOUNT_SID` | Exactly **34 characters** (`AC` + 32 hex). |
| `TWILIO_AUTH_TOKEN` | From Twilio Console. |
| `TWILIO_PHONE_NUMBER` | E.164, e.g. `+1XXXXXXXXXX`. |
| `DATABASE_URL` | Optional; e.g. Postgres URL from Render/Railway. If unset, SQLite under `instance/` (ephemeral on many hosts). |

### Start command

From repository **root** (this repo includes a `Procfile`):

- **Render / Railway:** set **Root Directory** to repo root (or set start command manually):

```bash
cd backend && gunicorn --bind 0.0.0.0:$PORT app:app
```

Ensure `PORT` is whatever the platform injects (Render/Railway set it automatically).

### Health check URL

Configure your platform’s health check to:

`GET /api/health`

Example: `https://your-api.onrender.com/api/health`

### CORS

The app uses `flask_cors` with default permissive settings suitable for demos. For a stricter production setup, restrict origins to your frontend URL only (code change).

---

## 2. Frontend (Vite / React)

### Build

```bash
cd frontend
npm ci
echo "VITE_API_BASE_URL=https://your-api.onrender.com" > .env.production
npm run build
```

`VITE_*` variables are embedded at **build time**. Changing the API URL requires a **rebuild**.

### Deploy the `frontend/dist` folder

- **Vercel:** Import repo, set **Root Directory** to `frontend`, Framework Preset Vite, add Environment Variable `VITE_API_BASE_URL` = your API origin (no trailing slash).  
- **Netlify:** Same idea; build command `npm run build`, publish `dist`.

### Mobile / laptop access

After deploy, use the **HTTPS** URL Vercel/Netlify gives you. Ensure the backend allows your frontend origin if you tighten CORS later.

---

## 3. Twilio (SMS)

1. **Trial accounts** can only SMS **verified** destination numbers (Twilio Console → Phone Numbers → Verified Caller IDs).  
2. For India (+91), follow Twilio’s current **regulatory and geographic** requirements; errors appear in **Monitor → Logs → Messaging**.  
3. **Never** commit Account SID/Auth Token; set them only in the host’s secret env.

---

## 4. Collaboration + GitHub

- Protect **`main`**: require pull requests (Settings → Branches).  
- Use [CONTRIBUTING.md](./CONTRIBUTING.md) and the PR template under `.github/`.  
- Optional: connect **Vercel/Netlify/Render** to the repo and enable **preview deployments** for each PR.

---

## 5. Checklist before sharing your resume link

- [ ] API `/api/health` returns 200 over HTTPS.  
- [ ] Frontend `VITE_API_BASE_URL` points to that API (rebuild after changes).  
- [ ] Test **register → login → book ride → demo** on a phone.  
- [ ] Twilio: verify recipient numbers on trial; check logs if SMS fails.  
- [ ] `JWT_SECRET_KEY` is not the default from dev.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Frontend “Network Error” | Wrong `VITE_API_BASE_URL`, or API down, or mixed HTTP/HTTPS. |
| 401 on API | Token expired; log in again. |
| SMS only to one number | Empty `emergency_contact`, or number not verified on Twilio trial, or Twilio error on second `to` (check logs). |
| DB reset after deploy | SQLite on ephemeral disk; switch to Postgres + `DATABASE_URL`. |
