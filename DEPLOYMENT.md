# DriveSync — Deployment Runbook

How the app is hosted, and the exact steps to get the backend live again.

## Target architecture

```
Recruiter ─▶ VERCEL  (React frontend, static)         drivesync.app
                 │  HTTPS fetch + WebSocket (Socket.io)
                 ▼
             RENDER  (Express + Socket.io, free)       api.drivesync.app
                 │  Mongoose
                 ▼
             MONGODB ATLAS  (M0, free forever)

Google Sign-In → Google Identity Services → POST /api/auth/google → JWT
Hostinger = DNS only (optional custom domain). 0 of your 5 Node slots used.
```

Why not Hostinger for the backend? The app uses **Socket.io (WebSockets)**, which needs a
long-running Node process. We keep that off Hostinger entirely so all 5 Node slots stay free.

---

## Legend
- 🧑‍💻 **YOU** — needs an account login or a secret, so it has to be you.
- 🤖 **CLAUDE** — I do this in the code/repo.

---

## Step 1 — MongoDB Atlas (the database) 🧑‍💻

Your old Atlas cluster may still exist (paused), or be gone. Either way:

1. Go to <https://cloud.mongodb.com> and sign in (or sign up — free).
2. If you see an existing **drivesync** cluster that says *Paused* → click **Resume**. Done.
3. If not, create one:
   - **Build a Database → M0 (Free)** → pick a region near you (e.g. Mumbai).
   - **Database Access** → add a user (username + password). Save these.
   - **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`). (Fine for a demo; Render's IPs aren't static on free.)
   - **Connect → Drivers** → copy the connection string. It looks like:
     `mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/?...`
   - Insert the db name **drivesync** before the `?`:
     `...mongodb.net/drivesync?retryWrites=true&w=majority`

Keep that final string — it's your `MONGO_URI`.

## Step 2 — Push to GitHub 🤖→🧑‍💻

Render and Vercel both deploy from GitHub. I can run this for you (just say "set up GitHub"),
or run it yourself from the project root:

```bash
git init
git add .
git commit -m "DriveSync: prep for Render deploy"
gh repo create drivesync --private --source=. --remote=origin --push
```

## Step 3 — Deploy the backend to Render 🧑‍💻

1. Go to <https://render.com> → sign in with GitHub.
2. **New + → Blueprint** → pick the `drivesync` repo. Render reads `render.yaml` and
   proposes the `drivesync-api` web service automatically.
3. Click **Apply**. It builds. It will pause on the secret env vars — that's Step 4.

## Step 4 — Set the environment variables on Render 🧑‍💻

In the `drivesync-api` service → **Environment**, add:

| Key | Value |
|---|---|
| `MONGO_URI` | the Atlas string from Step 1 |
| `JWT_SECRET` | run `openssl rand -hex 32` and paste the output |
| `ADMIN_EMAIL` | e.g. `admin@drivesync.in` |
| `ADMIN_PASSWORD` | a strong password (this is your admin login) |
| `CLIENT_ORIGIN` | your Vercel URL (set after the frontend deploys) |

(`JWT_EXPIRES_IN` and `NODE_VERSION` are already set by the blueprint.)

Save → Render redeploys. Note your service URL, e.g. `https://drivesync-api.onrender.com`.

## Step 5 — Seed the demo drivers 🧑‍💻 (once)

In Render → the service → **Shell**, run:

```bash
node seed.js
```

Creates the 4 demo drivers (login password `Drv@1234`).

## Step 6 — Keep-alive (kill the cold start) 🧑‍💻

Render's free tier sleeps after ~15 min idle. Prevent it:

1. Go to <https://cron-job.org> (free) → sign up.
2. Create a cron job hitting `https://drivesync-api.onrender.com/api/health` every **10 minutes**.

Now recruiters never hit a 50-second cold start.

## Step 7 — Verify ✅

```bash
curl https://drivesync-api.onrender.com/api/health
# → {"success":true,"message":"DriveSync API is running 🚗", ...}
```

---

## Next phases (I build these)
- **React frontend** (Vite + Framer Motion) → deployed to Vercel. Then set `CLIENT_ORIGIN`
  on Render to the Vercel URL, and the frontend's `VITE_API_URL` to the Render URL.
- **Google Sign-In** → `POST /api/auth/google` on the backend + a Google button on the frontend.
  Needs a Google Cloud OAuth **Web Client ID** (`GOOGLE_CLIENT_ID`) — I'll give you the
  click-path when we get there.
- **Consolidate Vercel** → delete the stale `drivesyncc` (localhost) project; keep one.

## Reference — env vars
See `backend/.env.example` for the full list and format.

## Reference — demo credentials
- **Drivers:** `ramesh@drv.in` / `suresh@drv.in` / `pradeep@drv.in` / `irfan@drv.in` — password `Drv@1234`
- **Admin:** whatever you set as `ADMIN_EMAIL` / `ADMIN_PASSWORD`
