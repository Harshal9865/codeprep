# Deploying CodePrep

Everything needed for single-container deployment (Node 20 + `g++` for C++17 + built React frontend + SQLite persistence) is configured in the repository.

## Option 1 (Zero Manual Config): Render Blueprint (`render.yaml`)
1. Push this repository to GitHub (make sure `backend/.env` and `*.db` are not committed — `.gitignore` already excludes them).
2. In **Render Dashboard**, click **New + -> Blueprint** and connect your GitHub repository.
3. Render automatically reads `render.yaml`, builds `Dockerfile` (with `g++` installed), generates `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `COOKIE_SECRET`, attaches the `/data` SQLite disk, and backend auto-detects `RENDER_EXTERNAL_URL` — zero manual env typing needed.

## Option 2: Docker Compose (Any Ubuntu/Debian VPS)
```bash
git clone <your-repo-url> codeprep && cd codeprep
FRONTEND_URL=https://yourdomain.com \
SECURE_COOKIES=true \
JWT_ACCESS_SECRET=$(openssl rand -hex 32) \
JWT_REFRESH_SECRET=$(openssl rand -hex 32) \
COOKIE_SECRET=$(openssl rand -hex 32) \
docker compose up -d --build
```
Place Caddy or Nginx in front of port `5000` for HTTPS certificates.

## Option 3: Railway (Docker + Volume)
1. Deploy from GitHub — Railway auto-detects `Dockerfile`.
2. Add a **Volume** mounted at `/data`.
3. Set variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `DATABASE_URL=file:/data/codeprep.db`
   - `FRONTEND_URL=https://<your-railway-domain>`
   - `SECURE_COOKIES=true`
   - `SANDBOX_TYPE=local-process`
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` (random 32+ char strings)

## Manual Checklist Before Sharing Publicly
- Change the default demo password inside **Profile -> Security** once deployed (or update seed credentials in `backend/src/services/auth.service.ts` if locking down public access).
- Keep `/data` backed up periodically if deploying long-term SQLite history.

