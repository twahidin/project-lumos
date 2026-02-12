# Lumos Design Thinking Portal

Design Thinking Portal with student/teacher roles, MongoDB-backed auth, and admin panel. Ready for deployment on **Railway**.

## Features

- **Login** — Students and teachers sign in with email/password (stored in MongoDB).
- **Portal** — Design Thinking journey: stages (Empathize, Define, Ideate, Prototype, Test), group/personal docs, milestones, AI-style assessment.
- **Admin panel** (`/admin.html`) — Upload students (single or bulk CSV), manage teacher rights, reset passwords, allocate resources (max weeks, allowed stages), and view WHO documentation records.

## Local development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **MongoDB**  
   Use a local MongoDB instance or a cloud URI. Set:
   ```bash
   export MONGODB_URI=mongodb://localhost:27017/lumos-portal
   ```

3. **Create first admin user** (one-time)
   ```bash
   node scripts/seed-admin.js
   ```
   Default: `admin@lumos.edu` / `admin123`. Change in the script or env before running.

4. **Start server**
   ```bash
   npm start
   ```
   Open http://localhost:3000 → login page. Sign in as admin and open **Admin** to add students/teachers.

## Deploy to Railway

1. **New project** in [Railway](https://railway.app). Add a **MongoDB** service (from Railway’s data services).

2. **Add your app** (this repo) as a service. Connect the repo or deploy from CLI.

3. **Variables** (in your app service):
   - `MONGODB_URI` — From the MongoDB service: **Variables** → copy `MONGO_URL` (or the URI Railway provides) into `MONGODB_URI` for the web service.
   - `SESSION_SECRET` — Set a long random string for production (e.g. `openssl rand -hex 32`).

4. **First admin**  
   After first deploy, run the seed script once (e.g. in a one-off run or from your machine with `MONGODB_URI` set to the Railway MongoDB URL):
   ```bash
   MONGODB_URI="<railway-mongo-uri>" node scripts/seed-admin.js
   ```

5. **Open the app**  
   Use the generated URL (e.g. `https://your-app.up.railway.app`). Log in with the admin account, then use **Admin** to upload students and manage teachers.

## Routes

| Path | Description |
|------|-------------|
| `/` | Redirects to login or portal |
| `/login.html` | Login page |
| `/portal.html` | Design Thinking portal (requires login) |
| `/admin.html` | Admin panel (admin role only) |
| `/api/auth/login` | POST — login |
| `/api/auth/logout` | POST — logout |
| `/api/auth/me` | GET — current user |
| `/api/admin/*` | Admin-only API (users, bulk upload, teacher rights, reset password, resources, WHO docs) |

## WHO documentation

Student WHO (e.g. “who” they are / documentation) is stored in MongoDB via the `WhoDocumentation` model. Admins can view records in the **WHO Documentation** tab. Creating/editing WHO records via API: `POST /api/admin/who-docs`, `PATCH /api/admin/who-docs/:id`.
