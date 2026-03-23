# VDDT – Free Deployment Guide
### Stack: Supabase (DB) + Render (App) + UptimeRobot (Keep-Alive)
### Total Cost: $0.00 / month — forever

---

## Overview

```
Your Code (GitHub)
      │
      ▼
  [Render]  ──────────────────→  [Supabase]
  Node.js app (free)              PostgreSQL (free)
      │
      ▲
  [UptimeRobot]
  Pings /health every 5 min
  Prevents Render from sleeping
```

---

## STEP 1 — Push Code to GitHub

> Skip if you already have a GitHub repo.

1. Go to [github.com](https://github.com) and create a **New Repository**
   - Name: `vddt` (or anything)
   - Visibility: **Private** (keeps your code safe)
   - Do NOT initialize with README

2. In your terminal (inside the VDDT folder):

```bash
git init
git add .
git commit -m "Initial commit – VDDT prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vddt.git
git push -u origin main
```

---

## STEP 2 — Set Up Supabase (Free PostgreSQL)

1. Go to [supabase.com](https://supabase.com) → **Start for free**
2. Sign up with GitHub (easiest)
3. Click **New Project**
   - Organization: your personal org
   - Name: `vddt-db`
   - Database Password: set a strong password and **save it**
   - Region: **Southeast Asia (Singapore)** — closest to Philippines
   - Plan: **Free**
4. Wait ~2 minutes for the project to provision

### Run the Migrations on Supabase

5. In Supabase, go to **SQL Editor** (left sidebar)
6. Click **New Query**
7. Open `db/schema.sql` from your project, copy ALL the contents, paste into the editor, click **Run**
8. Open a new query, copy `db/migration_add_users.sql`, paste and run
9. You should see: `vendors`, `purchase_orders`, `deliveries`, `users` tables created

### Seed the Users

10. Still in SQL Editor, run this to create default accounts:

```sql
-- You'll run seed-users.js after Render deploys, OR manually insert hashed passwords.
-- For now, leave this — we'll seed from Render's shell after deploy.
```

### Get the Connection String

11. Go to **Settings** (gear icon, bottom left) → **Database**
12. Scroll to **Connection String** → select **URI** tab
13. Copy the string — it looks like:
    ```
    postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
    ```
14. **Save this** — you'll need it in Step 3

---

## STEP 3 — Deploy to Render (Free Node.js Hosting)

1. Go to [render.com](https://render.com) → **Get Started for Free**
2. Sign up with GitHub

3. Click **New +** → **Web Service**
4. Select **Build and deploy from a Git repository**
5. Connect your GitHub account → select your `vddt` repo → **Connect**

6. Fill in the settings:
   | Field | Value |
   |---|---|
   | Name | `vddt-robinsons` |
   | Region | **Singapore** |
   | Branch | `main` |
   | Runtime | **Node** |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
   | Plan | **Free** |

7. Click **Advanced** → **Add Environment Variable** — add these one by one:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(paste your Supabase URI from Step 2)* |
   | `SESSION_SECRET` | *(click "Generate" — Render makes a secure one for you)* |

8. Click **Create Web Service**
9. Wait 3–5 minutes for the first deploy to complete
10. You'll see: `==> Your service is live 🎉`
11. Your app URL will be: `https://vddt-robinsons.onrender.com`

### Seed Users on Render

After deploy succeeds:

12. Go to your Render service → **Shell** tab
13. Run:
    ```bash
    node db/seed-users.js
    ```
14. You should see:
    ```
    ✔  admin      → username: admin     password: admin123
    ✔  manager    → username: manager   password: manager123
    ✔  receiver   → username: receiver  password: receiver123
    ```

---

## STEP 4 — Set Up UptimeRobot (Prevent Sleeping)

Render's free tier **sleeps after 15 minutes** of no traffic.
UptimeRobot pings your app every 5 minutes to keep it awake — for free.

1. Go to [uptimerobot.com](https://uptimerobot.com) → **Register for FREE**
2. After login, click **+ Add New Monitor**
3. Fill in:
   | Field | Value |
   |---|---|
   | Monitor Type | **HTTP(s)** |
   | Friendly Name | `VDDT Robinsons` |
   | URL | `https://vddt-robinsons.onrender.com/health` |
   | Monitoring Interval | **5 minutes** |
4. Click **Create Monitor**

UptimeRobot will now ping `/health` every 5 minutes.
The app stays awake 24/7. ✅

---

## STEP 5 — Test Your Live App

1. Open: `https://vddt-robinsons.onrender.com`
2. You should see the **login page**
3. Log in with:
   - `admin` / `admin123`
   - `manager` / `manager123`
   - `receiver` / `receiver123`
4. Verify the dashboard loads with seed data

### Test the health endpoint:
```
https://vddt-robinsons.onrender.com/health
```
Should return:
```json
{ "status": "ok", "app": "VDDT – Robinsons Supermarket", "timestamp": "..." }
```

---

## Free Tier Limits Summary

| Service | Free Limit | Impact |
|---|---|---|
| Render | 750 hrs/month compute | Enough for 1 app running 24/7 |
| Render | 500 MB RAM | Fine for this app |
| Supabase | 500 MB database | Holds ~millions of delivery records |
| Supabase | 2 GB bandwidth/mo | Fine for internal warehouse use |
| Supabase | Pauses if no activity for 7 days | UptimeRobot keeps it active |
| UptimeRobot | 50 monitors free | You only need 1 |

---

## Updating the App (After Changes)

Any time you push to GitHub, Render auto-redeploys:

```bash
git add .
git commit -m "describe your change"
git push origin main
```

Render detects the push and redeploys in ~2 minutes automatically.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| App shows "Application Error" | Check Render → Logs tab for the error |
| Can't connect to DB | Verify DATABASE_URL in Render env vars — no extra spaces |
| Login doesn't work | Run `node db/seed-users.js` in Render Shell tab |
| Supabase DB paused | Go to supabase.com → click your project → click "Restore" |
| App sleeping despite UptimeRobot | Check UptimeRobot is showing "Up" status |

---

## Local Development (with Docker)

If you want to run everything locally in Docker:

```bash
docker-compose up
```

This starts PostgreSQL + the Node.js app together.
Open: http://localhost:3000

To stop:
```bash
docker-compose down
```

To reset the database:
```bash
docker-compose down -v   # -v removes the data volume
docker-compose up
```
