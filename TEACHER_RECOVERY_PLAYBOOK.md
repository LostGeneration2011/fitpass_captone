# Teacher Recovery Playbook

This guide is the backup blueprint for restoring Teacher flows quickly when code breaks.

## 1) Recovery Goal

Restore Teacher features in this order:
1. Teacher authentication and dashboard
2. Class management (create/edit/view status)
3. Session lifecycle (create/update/delete)
4. Attendance and QR check-in
5. Earnings/profile and cross-role consistency

Teacher recovery is complete only when all smoke tests pass.

## 2) Source of Truth Files

### Mobile (Teacher screens)
- `fitpass-app/app/teacher/_layout.tsx`
- `fitpass-app/app/teacher/index.tsx`
- `fitpass-app/app/teacher/classes.tsx`
- `fitpass-app/app/teacher/create-class.tsx`
- `fitpass-app/app/teacher/edit-class.tsx`
- `fitpass-app/app/teacher/class-detail.tsx`
- `fitpass-app/app/teacher/sessions.tsx`
- `fitpass-app/app/teacher/create-session.tsx`
- `fitpass-app/app/teacher/sessions/[id].tsx`
- `fitpass-app/app/teacher/attendance-view.tsx`
- `fitpass-app/app/teacher/qr.tsx`
- `fitpass-app/app/teacher/earnings.tsx`
- `fitpass-app/app/teacher/profile.tsx`

### Backend API (Teacher dependencies)
- `fitpass-captone/backend/src/controllers/class.controller.ts`
- `fitpass-captone/backend/src/controllers/session.controller.ts`
- `fitpass-captone/backend/src/controllers/attendance.controller.ts`
- `fitpass-captone/backend/src/controllers/earnings.controller.ts`
- `fitpass-captone/backend/src/controllers/teacherProfile.controller.ts`
- `fitpass-captone/backend/src/routes/classes.routes.ts`
- `fitpass-captone/backend/src/routes/sessions.routes.ts`
- `fitpass-captone/backend/src/routes/attendance.routes.ts`
- `fitpass-captone/backend/src/routes/earnings.routes.ts`
- `fitpass-captone/backend/src/routes/teachers.routes.ts`
- `fitpass-captone/backend/src/services/class.service.ts`
- `fitpass-captone/backend/src/services/session.service.ts`
- `fitpass-captone/backend/src/services/attendance.service.ts`
- `fitpass-captone/backend/src/services/teacherProfile.service.ts`
- `fitpass-captone/backend/src/middlewares/rbac.ts`
- `fitpass-captone/backend/src/ws/index.ts`

### Shared config
- `shared/URLConfig.ts`
- `fitpass-app/lib/api.ts`

## 3) Fast Recovery Workflow

## Step A: Restore dependencies

From repo root:

```powershell
npm install
npm run install:all
```

## Step B: Validate backend environment

Required backend env values (`fitpass-captone/backend/.env`):
- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `FRONTEND_URL`

## Step C: Rebuild Prisma artifacts

From `fitpass-captone/backend`:

```powershell
npx prisma generate
npx prisma db push
npm run seed
```

## Step D: Run apps

From repo root:

```powershell
npm run dev
```

Expected defaults:
- Backend: `3000`
- Admin: `3001`
- Expo: Metro dev server

## Step E: Recover Teacher flows incrementally

Follow this exact order:
1. Teacher login and token storage
2. Teacher classes list
3. Create/edit class
4. Session list/create/update/delete
5. Attendance load and update
6. QR generation and student check-in path
7. Earnings and profile

Do not continue to the next step until current step works with live API.

## 4) Critical Authorization Rules (Must Keep)

1. Teacher can only modify classes they own.
2. Teacher cannot reassign `teacherId` on class updates.
3. Teacher can only modify attendance for sessions in their own classes.
4. Teacher can only request WebSocket attendance data for their own sessions.
5. Earnings endpoint by teacherId is restricted to `TEACHER` (self) and `ADMIN`.

If any rule fails, stop release and fix authorization first.

## 5) Minimal API Contracts for Teacher

- Classes:
  - `GET /api/classes?teacherId=<id>` returns teacher-scoped list.
  - `PATCH /api/classes/:id` rejects unauthorized teacher with 403.
- Sessions:
  - `GET /api/sessions?teacherId=<id>` returns teacher-scoped sessions.
  - `PATCH /api/sessions/:id` and `DELETE /api/sessions/:id` enforce ownership.
- Attendance:
  - `POST /api/attendance/check-in` enforces teacher ownership for manual check-in.
  - `PATCH /api/attendance/:id` and `PATCH /api/attendance` enforce ownership.
- WebSocket:
  - `get_session_attendance` rejects unauthorized teacher with error event.
  - `session:join` / `session:leave` room events work for teacher attendance screens.
- Earnings:
  - `GET /api/earnings/me` only for teacher.
  - `GET /api/earnings/:teacherId` only for teacher self or admin.

## 6) Smoke Test Checklist (Must Pass)

1. Teacher logs in and sees dashboard.
2. Teacher sees only own classes.
3. Teacher creates class and class is `PENDING` until admin approval.
4. Teacher cannot edit class belonging to another teacher.
5. Teacher sees only own sessions.
6. Teacher creates and deletes own session successfully.
7. Teacher cannot edit/delete session of another teacher.
8. Teacher attendance screen loads records for own session.
9. Teacher cannot update attendance of another teacher's session.
10. Teacher QR screen renders and student can check in to valid session.
11. Teacher earnings me endpoint returns valid summary.
12. Admin can view teacher earnings by teacherId; unauthorized roles cannot.

## 7) Cross-Role Consistency Checks

- Teacher creates class -> Admin sees pending class -> Admin approve/reject -> Teacher sees updated status.
- Teacher marks attendance -> Student attendance history reflects update correctly.
- Teacher forum/profile info exposed to student only through approved/public-safe routes.
- Role boundaries stay strict: Student cannot access teacher-only actions, teacher cannot execute admin-only actions.

## 8) Safe Rollback Strategy

If a new change breaks Teacher flows:
1. Identify failing endpoint/screen.
2. Revert only the offending commit.
3. Re-run Teacher smoke checklist.
4. Re-apply fix in smaller commits.

Useful commands:

```powershell
git log --oneline -n 20
git show <commit>
```

Use `git revert <commit>` on shared branches.

## 9) Quick Triage Map (Symptom -> Likely Layer)

- Teacher sees other teachers' data: backend ownership check missing in controller/service.
- Attendance mismatch: attendance controller/service + websocket event contract.
- QR issues: `qr.tsx`, token payload, attendance check-in endpoint.
- Earnings permission issue: earnings routes/controller RBAC drift.
- Teacher profile missing data: teacher profile service/select fields.

## 10) Done Criteria

Teacher recovery is complete when:
- All smoke tests pass.
- No TypeScript/runtime errors in teacher core screens and backend teacher endpoints.
- Ownership rules are enforced for class/session/attendance/websocket.
- Teacher flow remains consistent with Student and Admin behavior.

---

Owner note: update this file whenever Teacher API contracts, ownership rules, or teacher routes/screens change.
