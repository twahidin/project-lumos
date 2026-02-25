# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Design Thinking education portal (Express.js + MongoDB + vanilla JS frontend) with three roles: Student, Teacher, Admin. Students work through 5 Design Thinking stages (Empathize, Define, Ideate, Prototype, Test) with group and personal canvases. Teachers configure weekly stage availability and review student work. Admins manage users, groups, and resources.

Deployed on Railway with MongoDB Atlas or Railway MongoDB service.

## Commands

```bash
npm install          # Install dependencies
npm start            # Start server (also: npm run dev — same command)
node scripts/seed-admin.js      # One-time: create initial admin user
node scripts/fix-email-index.js # One-time: fix email uniqueness index
```

There is no test suite, linter, or build step configured. The frontend is plain HTML/CSS/JS served as static files.

## Architecture

### Backend (Node.js/Express)

- **Entry point**: `server.js` — Express app, session config (connect-mongo), route mounting, role-based HTML guards
- **Routes**: `routes/auth.js`, `routes/admin.js`, `routes/teacher.js`, `routes/student.js`
- **Models**: `models/` — Mongoose schemas (User, Group, TeacherWeekConfig, GroupStageWork, PersonalStageWork, WhoDocumentation)
- **Middleware**: `middleware/auth.js` — `requireAuth`, `requireAdmin`, `requireTeacherOrAdmin`, `requireStudent`
- **DB connection**: `config/db.js` — MongoDB with retry logic, accepts `MONGODB_URI` / `MONGO_URI` / `MONGO_URL`

### Frontend (vanilla JS)

All in `public/` — no framework, no bundler:
- `login.html` — Public login page
- `student.html` — Design Thinking portal with stage map, canvas, auto-save
- `teacher.html` — Weekly config editor, group/student work viewer, AI coach sidebar (UI only)
- `admin.html` — User CRUD, bulk upload, group management, WHO docs

### Key Data Flow

1. Teachers create `TeacherWeekConfig` per week with `groupScope` (which groups), `openStages`, milestones, rubric
2. Students fetch config matching their group, see only open stages
3. Students save work via `PUT /api/student/work` with `context: "group"` or `"personal"` — upserts `GroupStageWork` or `PersonalStageWork`
4. Teachers view work read-only via `/api/teacher/groups/:groupName/work` and `/api/teacher/students/:userId/work`

### Authentication

- Session-based auth stored in MongoDB via connect-mongo (7-day cookie)
- SUPERADMIN env vars (`SUPERADMIN`, `SUPERADMIN_PWD`) provide a DB-independent admin fallback — checked before MongoDB lookup on login
- Students login with `userid`, teachers/admins login with `email`

### Teacher-Group Relationship

- Teachers have a `groups` array (multiple group names)
- Students have a single `group` string
- Teacher APIs automatically filter to only show students/work within their assigned groups
- `TeacherWeekConfig.groupScope` can be `"all"` (all teacher's groups) or an explicit array of group names

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string (also accepts `MONGO_URI`, `MONGO_URL`) |
| `SESSION_SECRET` | Production | Random string for session encryption |
| `NODE_ENV` | Production | Set to `production` for secure cookies |
| `SUPERADMIN` | Recommended | Email for env-based super admin |
| `SUPERADMIN_PWD` | Recommended | Password for env-based super admin |

Default local: `mongodb://localhost:27017/lumos-portal` on port 3000.

## API Structure

All routes under `/api/`:
- `POST /api/auth/login` — Login (returns role + redirect URL)
- `GET /api/auth/me` — Current user info
- `POST /api/auth/logout` — Destroy session
- `/api/admin/*` — Admin-only: user CRUD, bulk upload, groups, WHO docs, resources
- `/api/teacher/*` — Teacher: config CRUD (`GET/PUT /config?week=N`), student/group work lookup
- `/api/student/*` — Student: config read (`GET /config?week=N`), work read/write (`GET/PUT /work`)
- `GET /api/health` — Health check

## Conventions

- MongoDB indexes enforce uniqueness: `(teacherId, week)` on configs, `(group, week, stageId)` on group work, `(userId, week, stageId)` on personal work
- User email has a partial unique index (allows multiple users without email, i.e. students who use `userid`)
- The `touch` method on the session store is wrapped to silently ignore "Unable to find session to touch" errors from stale cookies
- Frontend auto-save uses periodic PUT calls with a sync status indicator — no WebSocket/real-time layer
- Stage IDs are lowercase strings: `empathize`, `define`, `ideate`, `prototype`, `test`
