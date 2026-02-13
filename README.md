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
   - `MONGO_URI` or `MONGODB_URI` — From the MongoDB service (Railway uses `MONGO_URI`).
   - `SESSION_SECRET` — Set a long random string for production (e.g. `openssl rand -hex 32`).
   - **`SUPERADMIN`** and **`SUPERADMIN_PWD`** (recommended) — A fallback admin that is **not** stored in MongoDB and **cannot be changed** in the app. Log in with this email and password to always access the admin panel and create other admins. Example: `SUPERADMIN=super@lumos.edu`, `SUPERADMIN_PWD=your-secure-password`.

4. **First admin (optional)**  
   If you set `SUPERADMIN` / `SUPERADMIN_PWD`, you can log in immediately and create other admins from the panel. Otherwise, run the seed script once to create an admin in MongoDB (see Local development step 3).

5. **Open the app**  
   Use the generated URL. Log in with your Super Admin credentials (or the seeded admin), then use **Admin** to upload students and manage teachers.

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
