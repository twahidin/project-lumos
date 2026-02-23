# Teacher Groups & Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Teachers see only their assigned groups, view real group/personal dashboards, set targets for all or selected groups (server-persisted), and are assigned to multiple groups via admin.

**Architecture:** Teacher-scoped week config (TeacherWeekConfig) with groupScope; new GroupStageWork and PersonalStageWork collections; teacher and student APIs for config and work; teacher UI loads/saves config and work from API; student app syncs work to API. Admin UI adds groups field for teachers.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, existing auth middleware, vanilla JS frontend (public/teacher.html, public/student.html).

**Design reference:** `docs/plans/2025-02-23-teacher-groups-dashboard-design.md`

---

## Task 1: Add `groups` to User model for teachers

**Files:**
- Modify: `models/User.js`

**Step 1: Add groups field**

In `models/User.js`, add to the schema (e.g. after `group`):

```js
groups: [{ type: String, trim: true }],  // teacher: assigned group names
```

**Step 2: Commit**

```bash
git add models/User.js
git commit -m "feat: add User.groups for teacher group assignment"
```

---

## Task 2: Create TeacherWeekConfig model

**Files:**
- Create: `models/TeacherWeekConfig.js`

**Step 1: Create model**

```js
const mongoose = require('mongoose');

const teacherWeekConfigSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  week: { type: Number, required: true },
  groupScope: { type: mongoose.Schema.Types.Mixed, required: true }, // 'all' or [groupName, ...]
  openStages: [{ type: String }],
  announcement: { type: String, default: '' },
  stages: { type: mongoose.Schema.Types.Mixed, default: {} }, // stageId -> { milestones: [], rubric: '' }
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

teacherWeekConfigSchema.index({ teacherId: 1, week: 1 }, { unique: true });

module.exports = mongoose.model('TeacherWeekConfig', teacherWeekConfigSchema);
```

**Step 2: Commit**

```bash
git add models/TeacherWeekConfig.js
git commit -m "feat: add TeacherWeekConfig model"
```

---

## Task 3: Create GroupStageWork model

**Files:**
- Create: `models/GroupStageWork.js`

**Step 1: Create model**

```js
const mongoose = require('mongoose');

const groupStageWorkSchema = new mongoose.Schema({
  group: { type: String, required: true, trim: true },
  week: { type: Number, required: true },
  stageId: { type: String, required: true, trim: true },
  blocks: { type: mongoose.Schema.Types.Mixed, default: [] },
  reflection: { type: String, default: '' },
  reflectionTime: { type: Date },
  milestoneEvidence: { type: mongoose.Schema.Types.Mixed, default: {} },
  milestoneScores: { type: mongoose.Schema.Types.Mixed, default: {} },
  aiScore: { type: Number },
  aiFeedback: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

groupStageWorkSchema.index({ group: 1, week: 1, stageId: 1 }, { unique: true });

module.exports = mongoose.model('GroupStageWork', groupStageWorkSchema);
```

**Step 2: Commit**

```bash
git add models/GroupStageWork.js
git commit -m "feat: add GroupStageWork model"
```

---

## Task 4: Create PersonalStageWork model

**Files:**
- Create: `models/PersonalStageWork.js`

**Step 1: Create model**

```js
const mongoose = require('mongoose');

const personalStageWorkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: String, required: true, trim: true },
  week: { type: Number, required: true },
  stageId: { type: String, required: true, trim: true },
  blocks: { type: mongoose.Schema.Types.Mixed, default: [] },
  reflection: { type: String, default: '' },
  reflectionTime: { type: Date },
  updatedAt: { type: Date, default: Date.now }
});

personalStageWorkSchema.index({ userId: 1, week: 1, stageId: 1 }, { unique: true });

module.exports = mongoose.model('PersonalStageWork', personalStageWorkSchema);
```

**Step 2: Commit**

```bash
git add models/PersonalStageWork.js
git commit -m "feat: add PersonalStageWork model"
```

---

## Task 5: Filter teacher groups and students by req.user.groups

**Files:**
- Modify: `routes/teacher.js`

**Step 1: Update GET /groups**

- After fetching distinct groups from students, if `req.user.groups` exists and is a non-empty array, filter the list to only groups in `req.user.groups`. Keep existing behavior when `groups` is missing or empty (return all student groups for backward compatibility).

**Step 2: Update GET /students**

- When `req.user.groups` exists and is non-empty, add query condition so only students with `group` in `req.user.groups` are returned. Otherwise keep current behavior.

**Step 3: Commit**

```bash
git add routes/teacher.js
git commit -m "feat(teacher): filter groups and students by teacher groups"
```

---

## Task 6: Teacher config GET and PUT API

**Files:**
- Modify: `routes/teacher.js`
- Ensure: `models/TeacherWeekConfig.js` is required

**Step 1: GET /api/teacher/config**

- Query param `week` (number). Find TeacherWeekConfig by `teacherId: req.user._id` and `week`. Return 200 with config JSON or 404 if none.

**Step 2: PUT /api/teacher/config**

- Body: `{ week, groupScope, openStages, announcement, stages }`. Validate groupScope is either string `'all'` or array of strings; if array, optionally validate names are in teacher’s `req.user.groups`. Upsert TeacherWeekConfig for this teacher and week. Return 200 with saved config.

**Step 3: Commit**

```bash
git add routes/teacher.js
git commit -m "feat(teacher): add GET/PUT config API"
```

---

## Task 7: Teacher GET group work and student work APIs

**Files:**
- Modify: `routes/teacher.js`
- Require: `GroupStageWork`, `PersonalStageWork`

**Step 1: GET /api/teacher/groups/:groupName/work**

- Query param `week`. Ensure `groupName` is in `req.user.groups` (or allow if teacher has no groups for backward compat). Fetch all GroupStageWork for `group: groupName`, `week`. Return JSON keyed by stageId or array.

**Step 2: GET /api/teacher/students/:userId/work**

- Query param `week`. Resolve user by userid (or _id). Ensure user’s `group` is in `req.user.groups`. Fetch PersonalStageWork for that userId and week. Return JSON keyed by stageId or array.

**Step 3: Commit**

```bash
git add routes/teacher.js
git commit -m "feat(teacher): add GET group work and GET student work APIs"
```

---

## Task 8: Student config and work APIs (new route file)

**Files:**
- Create: `routes/student.js`
- Modify: `server.js` (mount router, e.g. `app.use('/api/student', studentRoutes)`)

**Step 1: Add requireStudent middleware (if needed)**

- In `middleware/auth.js`, add `requireStudent`: load user by req.session.userId, ensure role === 'student', set req.user, else 403. Use in student router.

**Step 2: Create routes/student.js** GET /config?week=1: find TeacherWeekConfig where teacher’s scope includes current user’s group (teacherId in User, scope is ‘all’ or array containing user.group). Return openStages, announcement, stages. GET /work?week=1: load GroupStageWork for user’s group and PersonalStageWork for user._id for that week; return merged structure. PUT /work: body `{ week, stageId, context: 'group'|'personal', blocks?, reflection? }`; upsert GroupStageWork (context group) or PersonalStageWork (context personal); enforce group/userId.

**Step 3: Mount in server.js**

- `const studentRoutes = require('./routes/student');` and `app.use('/api/student', studentRoutes);` (with auth as needed).

**Step 4: Commit**

```bash
git add middleware/auth.js routes/student.js server.js
git commit -m "feat(student): add config and work APIs"
```

---

## Task 9: Admin — allow groups on teacher create/update

**Files:**
- Modify: `routes/admin.js` (POST /users, PATCH /users/:id)
- Modify: `models/User.js` already has groups (Task 1)

**Step 1: POST /users**

- For role teacher/admin, accept `groups` from body (array or comma-separated string); normalize to array of strings; set on user before create.

**Step 2: PATCH /users/:id**

- Add `'groups'` to `allowed` array so PATCH can update groups. Normalize incoming groups to array of strings.

**Step 3: Commit**

```bash
git add routes/admin.js
git commit -m "feat(admin): allow groups on teacher create/update"
```

---

## Task 10: Admin UI — groups field for teachers

**Files:**
- Modify: `public/admin.html` (or wherever teacher create/edit form lives)

**Step 1: Locate teacher form**

- Find the user form used for creating/editing teachers (by role or email).

**Step 2: Add Groups field**

- Add a multi-select or comma-separated input for “Groups”. Options: fetch from GET /api/admin/groups or from existing student groups (if no endpoint, use a tag input or list from students). On submit (create/update), send `groups` as array of group names.

**Step 3: Commit**

```bash
git add public/admin.html
git commit -m "feat(admin): add groups field to teacher form"
```

---

## Task 11: Teacher UI — load and save config from API

**Files:**
- Modify: `public/teacher.html`

**Step 1: Load config on init and week change**

- On dashboard load and when changing week, call GET /api/teacher/config?week=N. If 200, set TD.weekConfigs['week'+N] from response. If 404, keep current default (gTC() in-memory default).

**Step 2: Save config to API**

- In autoSave (or wherever teacher config is saved), call PUT /api/teacher/config with current week and gTC() payload (groupScope, openStages, announcement, stages). Keep or remove localStorage save for offline fallback per product choice.

**Step 3: Add groupScope to payload**

- Ensure state or UI has “Apply to”: “All my groups” (groupScope: 'all') or “Selected groups” (groupScope: array). Load groupScope from API when loading config; show in dashboard and send on PUT.

**Step 4: Commit**

```bash
git add public/teacher.html
git commit -m "feat(teacher-ui): load/save config from API with groupScope"
```

---

## Task 12: Teacher UI — “Apply to” (All my groups / Selected groups)

**Files:**
- Modify: `public/teacher.html`

**Step 1: Dashboard markup**

- In renderDashboard(), add UI: radio or dropdown “Apply to” with “All my groups” and “Selected groups”. If “Selected groups”, show checkboxes of groups from fetchGroups(). Store selection in state (e.g. state.configGroupScope).

**Step 2: Persist and load**

- When loading config from API, set state.configGroupScope from response.groupScope. When saving, send groupScope in PUT body.

**Step 3: Commit**

```bash
git add public/teacher.html
git commit -m "feat(teacher-ui): Apply to All my groups / Selected groups"
```

---

## Task 13: Teacher UI — group detail with real data

**Files:**
- Modify: `public/teacher.html`

**Step 1: Replace placeholder in showGroupDetail**

- Call GET /api/teacher/groups/:groupName/work?week=state.currentWeek. Replace “Loading group work...” and simulated blocks with actual stages and blocks from response. Render same read-only block structure as current placeholder.

**Step 2: Commit**

```bash
git add public/teacher.html
git commit -m "feat(teacher-ui): group detail loads real work from API"
```

---

## Task 14: Teacher UI — student detail with real data

**Files:**
- Modify: `public/teacher.html`

**Step 1: Replace placeholder in showStudentDetail**

- Call GET /api/teacher/students/:userId/work?week=state.currentWeek. Use userId from selected student. Replace simulated personal work with response data; render per stage.

**Step 2: Commit**

```bash
git add public/teacher.html
git commit -m "feat(teacher-ui): student detail loads real work from API"
```

---

## Task 15: Student UI — load config from API

**Files:**
- Modify: `public/student.html`

**Step 1: Fetch config on load and week change**

- On init and when week changes, call GET /api/student/config?week=N. Use response for openStages, announcement, stages (milestones, rubric). Merge into or replace TD.weekConfigs so existing gTC() and student map use server config.

**Step 2: Commit**

```bash
git add public/student.html
git commit -m "feat(student-ui): load config from API"
```

---

## Task 16: Student UI — load and save work via API

**Files:**
- Modify: `public/student.html`

**Step 1: Load work on init and week change**

- Call GET /api/student/work?week=N. Merge response into state.weeks (group and personal blocks, reflections) so existing group/personal tabs render server data.

**Step 2: Save work on change**

- In autoSave (or save path), for current week and stage, call PUT /api/student/work with context 'group' or 'personal', blocks and reflection. Send group work when saving group tab; personal when saving personal tab. Optionally debounce.

**Step 3: Commit**

```bash
git add public/student.html
git commit -m "feat(student-ui): load and save work via API"
```

---

## Task 17: Resolve student config when multiple teachers (optional policy)

**Files:**
- Modify: `routes/student.js` (GET /config)

**Step 1: Document or implement policy**

- If multiple teachers can have scope including the same group, decide: use first matching TeacherWeekConfig, or most recently updated. Implement in GET /api/student/config and add a short comment.

**Step 2: Commit**

```bash
git add routes/student.js
git commit -m "fix(student): resolve config when multiple teachers"
```

---

## Execution handoff

Plan complete and saved to `docs/plans/2025-02-23-teacher-groups-dashboard.md`.

Two execution options:

1. **Subagent-driven (this session)** — I dispatch a fresh subagent per task (or batch of small tasks), review between tasks, and iterate quickly.
2. **Parallel session (separate)** — You open a new session with executing-plans in the same repo/worktree and run through the plan with checkpoints.

Which approach do you want?
