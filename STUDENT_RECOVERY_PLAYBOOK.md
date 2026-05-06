# Student Recovery Playbook

This document is a fast fallback guide for rebuilding Student features if code is broken.

## 1) Goal

Recover Student flows in this order:
1. Authentication and student home
2. Class discovery and enrollment
3. Schedule and check-in
4. Forum and profile

If all items in the smoke checklist pass, Student is considered restored.

## 2) Source of Truth Files

### Mobile (Student screens)
- `fitpass-app/app/student/_layout.tsx`
- `fitpass-app/app/student/student-stack.tsx`
- `fitpass-app/app/student/index.tsx`
- `fitpass-app/app/student/classes.tsx`
- `fitpass-app/app/student/class-detail.tsx`
- `fitpass-app/app/student/browse-classes.tsx`
- `fitpass-app/app/student/schedule.tsx`
- `fitpass-app/app/student/checkin.tsx`
- `fitpass-app/app/student/forum.tsx`
- `fitpass-app/app/student/forum-profile.tsx`
- `fitpass-app/app/student/profile.tsx`

### Backend API (Student dependencies)
- `fitpass-captone/backend/src/controllers/auth.controller.ts`
- `fitpass-captone/backend/src/controllers/class.controller.ts`
- `fitpass-captone/backend/src/controllers/enrollment.controller.ts`
- `fitpass-captone/backend/src/controllers/attendance.controller.ts`
- `fitpass-captone/backend/src/controllers/forum.controller.ts`
- `fitpass-captone/backend/src/controllers/forumModeration.controller.ts`
- `fitpass-captone/backend/src/routes/auth.ts`
- `fitpass-captone/backend/src/routes/classes.routes.ts`
- `fitpass-captone/backend/src/routes/enrollments.routes.ts`
- `fitpass-captone/backend/src/routes/attendance.routes.ts`
- `fitpass-captone/backend/src/routes/forum.routes.ts`

### Shared config
- `shared/URLConfig.ts`

## 3) Recovery Workflow

## Step A: Restore dependencies and environment

From repo root:

```powershell
npm install
npm run install:all
```

Backend env must be valid (`fitpass-captone/backend/.env`):
- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS` (include admin/web origins)
- `FRONTEND_URL` (production frontend URL on production)

## Step B: Recover database shape and seed

From `fitpass-captone/backend`:

```powershell
npx prisma generate
npx prisma db push
npm run seed
```

If seed command differs in package script, use the script defined in `fitpass-captone/backend/package.json`.

## Step C: Start all apps

From repo root:

```powershell
npm run dev
```

Expected default ports:
- Backend: `3000`
- Admin: `3001`
- Expo: Metro dev server

## Step D: Validate auth contract first

Required behavior:
- Student login returns valid JWT token.
- Protected student endpoints reject missing token.
- Role checks do not allow Student into Admin-only actions.

## Step E: Rebuild Student screens incrementally (if needed)

Rebuild in this order:
1. `index.tsx` (dashboard entry)
2. `classes.tsx` + `browse-classes.tsx`
3. `class-detail.tsx` + enrollment actions
4. `schedule.tsx` + `checkin.tsx`
5. `forum.tsx` + `forum-profile.tsx`
6. `profile.tsx`

Rule: only move to next screen after current screen works with live API data.

## 4) Minimal API Contracts (Student)

These contracts must remain stable:
- Auth:
  - Login endpoint returns `{ token, user }` or equivalent auth payload used by app.
- Classes:
  - List endpoint returns array of classes with `id`, `name`/`title`, schedule metadata.
  - Detail endpoint returns class + session info.
- Enrollment:
  - Enrollment create/cancel endpoints return clear success or failure message.
- Attendance:
  - Check-in endpoint validates session/token and returns attendance status.
- Forum:
  - List/create/reply/edit/delete follow ownership and moderation rules.
  - Hidden/deleted content from moderation is not shown to normal student feed.

## 5) Smoke Test Checklist (Must Pass)

1. Student can login and see Student home.
2. Student can load class list without crash.
3. Student can open class detail.
4. Student can enroll (or see meaningful validation message).
5. Student schedule loads upcoming sessions.
6. Student check-in flow works for valid session/QR.
7. Student forum list loads and can create a post.
8. Moderated/hidden forum content is not visible to student.
9. Student profile screen loads user info.
10. Admin moderation changes are reflected on Student app after refresh.

## 6) Safe Rollback Strategy

If a new change breaks Student flow:
1. Identify failing file/screen first.
2. Revert only the specific commit that introduced regression.
3. Re-run smoke checklist.
4. Re-apply fix in smaller commits.

Recommended git helpers:

```powershell
git log --oneline -n 20
git show <commit>
```

Use `git revert <commit>` for shared branches instead of rewriting history.

## 7) Quick Triage Map (Symptom -> Likely Layer)

- Login fails: `auth.controller.ts`, auth service, JWT/env config.
- Empty class list: class controller/service, API base URL, token injection.
- Enrollment fails: enrollment controller + class capacity/business rule.
- Schedule wrong/missing: sessions query, date/time transform on mobile.
- Forum missing items: moderation filter logic or forum query conditions.
- Student sees admin-only data: RBAC middleware or route guard drift.

## 8) Done Criteria

Student recovery is complete when:
- All smoke tests pass.
- No TypeScript/runtime error on Student core screens.
- Admin moderation and Student forum visibility are consistent.
- Backend logs show no auth/RBAC errors for Student actions.

---

Owner note: update this file every time Student API contract or screen routing is changed.
