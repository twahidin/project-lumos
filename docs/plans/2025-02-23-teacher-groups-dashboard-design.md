# Teacher Groups & Dashboard — Design

**Date:** 2025-02-23  
**Status:** Approved

## Goal

As a teacher, I can:
- See only the **groups I am attached to** and view their **group** and **personal** dashboards with **real student data**.
- **Set targets** (milestones, open stages, announcement) for **all my groups** or **selected groups**, persisted on the server.
- Be **assigned to multiple groups** via admin; teacher-scoped config and work APIs respect that association.

## Approach

Teacher-scoped config (one payload per teacher per week with `groupScope: 'all' | string[]`) plus new server-side storage for group and personal stage work. Students sync work to the API; teachers load config and work via existing teacher routes extended with new endpoints and filters.

---

## 1. Data model

### Teacher–group association

- **User (teachers):** Add optional `groups: [String]` (array of group names). Empty or missing = no groups assigned (teacher sees no groups until admin assigns). Students unchanged (single `group` string).

### Teacher week config (targets)

- **TeacherWeekConfig** (new collection):  
  `teacherId` (ref User), `week` (number), `groupScope` ('all' | array of group names), `openStages` (string[]), `announcement` (string), `stages` (object: stageId → `{ milestones: [...], rubric: string }`).  
  One document per teacher per week. Students resolve config by: my group is in this teacher’s scope for this week.

### Student work (group + personal)

- **GroupStageWork** (new): `group` (string), `week` (number), `stageId` (string), `blocks` (array), `reflection` (string), `reflectionTime?`, `milestoneEvidence?`, `milestoneScores?`, `aiScore?`, `aiFeedback?`. Unique on `(group, week, stageId)`.

- **PersonalStageWork** (new): `userId` (ref User), `group` (string), `week` (number), `stageId` (string), `blocks` (array), `reflection` (string), `reflectionTime?`. Unique on `(userId, week, stageId)` (or include group if same student in multiple groups).

- Block shape aligned with current client: `{ id, type, title, author, data/content, items?, comments?, likes?, photos?, ... }`.

### Indexes

- TeacherWeekConfig: `(teacherId, week)`.
- GroupStageWork: `(group, week, stageId)`.
- PersonalStageWork: `(userId, week, stageId)` (and by group if needed for teacher queries).

---

## 2. APIs

### Teacher (require teacher/admin)

- **GET /api/teacher/groups** — Return only groups in `req.user.groups` when non-empty; else current behavior (all student groups) or empty for strict “my groups only.”
- **GET /api/teacher/students** — Filter to students whose `group` is in `req.user.groups` when teacher has `groups` set.
- **GET /api/teacher/config?week=1** — Return TeacherWeekConfig for current teacher and week (or 404/default).
- **PUT /api/teacher/config** — Body: `{ week, groupScope, openStages, announcement, stages }`. Upsert TeacherWeekConfig for this teacher and week.
- **GET /api/teacher/groups/:groupName/work?week=1** — Return group dashboard: GroupStageWork for that group and week (all stages in config).
- **GET /api/teacher/students/:userId/work?week=1** — Return personal dashboard: PersonalStageWork for that user and week.

### Student (require student)

- **GET /api/student/config?week=1** — Resolve config for this student’s group and week (TeacherWeekConfig whose scope includes student’s group).
- **GET /api/student/work?week=1** — Return merged group + personal work for this student (GroupStageWork for student’s group + PersonalStageWork for userId).
- **PUT /api/student/work** — Body: `{ week, stageId, context: 'group' | 'personal', blocks?, reflection? }`. Upsert GroupStageWork or PersonalStageWork; enforce group/userId.

### Admin

- Create/update teacher: set `groups` (multi-select or list). Populate options from existing student groups.

---

## 3. Teacher UI

- **My groups only:** Groups tab and selectors use GET /api/teacher/groups (teacher’s assigned groups).
- **Dashboard tab:** Week selector; load/save config via GET/PUT /api/teacher/config. Add “Apply to”: “All my groups” | “Selected groups” (checkboxes) → `groupScope` in PUT.
- **Group detail:** GET /api/teacher/groups/:groupName/work?week=1; render real stages, blocks, reflections, milestones.
- **Students tab:** Only students in my groups (filtered GET /api/teacher/students).
- **Student detail:** GET /api/teacher/students/:userId/work?week=1; show real personal work.
- **Initial load:** If no config from API, show default and persist on first save.

---

## 4. Student app sync

- **Config:** GET /api/student/config?week=1 on load/week change; use for openStages, announcement, stages.
- **Work read:** GET /api/student/work?week=1 on load; merge into local state.
- **Work write:** On save, PUT /api/student/work with current week, stage, context (group/personal), blocks/reflection. Prefer server data when available; localStorage as fallback optional.

---

## 5. Admin UI

- **Edit/Create teacher:** Add Groups field (multi-select or comma list); options from existing student groups; save as `user.groups`.

---

## Out of scope (for now)

- One-time migration of existing localStorage student work into DB (optional later).
- Offline/conflict resolution beyond “prefer server when available.”
