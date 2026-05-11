# Release Readiness Checklist

Use this checklist before deploying backend/admin/app to production.

## 1) Code and Branch Hygiene

- [ ] Main branch is up to date
- [ ] No uncommitted local changes
- [ ] Latest security fixes are merged
- [ ] Commit history for release is clean and traceable

## 2) Build and Validation

- [ ] Backend build passes (`npm run build` in backend)
- [ ] Mobile TypeScript check passes
- [ ] Admin build passes
- [ ] Key lint/type errors are zero (or accepted exceptions documented)

## 3) Database and Prisma

- [ ] `prisma generate` completed
- [ ] `prisma db push` or migration applied successfully
- [ ] Seed validated on staging-like data
- [ ] Backup snapshot created before release

## 4) Environment and Secrets

- [ ] `DATABASE_URL` points to production database
- [ ] `JWT_SECRET` is set and not default
- [ ] `ALLOWED_ORIGINS` includes only valid domains
- [ ] `FRONTEND_URL` uses production URL
- [ ] OAuth/email/cloudinary/env keys are configured and verified

## 5) Security and Role Checks

- [ ] Role permissions verified for Admin/Teacher/Student
- [ ] Ownership protections verified (class/session/attendance)
- [ ] Unauthorized endpoints return 401/403 properly
- [ ] Critical auth flows tested (forgot/reset/change password)

## 6) Functional Sign-Off

- [ ] UAT checklist completed (see UAT_CHECKLIST.md)
- [ ] RBAC test checklist completed (see RBAC_TEST_CHECKLIST.md)
- [ ] Teacher and Student recovery playbooks updated

## 7) Deployment Execution

- [ ] Deploy backend first
- [ ] Verify health endpoint immediately after deploy
- [ ] Deploy admin and verify auth + class moderation
- [ ] Deploy app config and verify API connectivity

## 8) Post-Deploy Smoke (30-60 minutes)

- [ ] Login works for all roles
- [ ] Teacher creates class and session successfully
- [ ] Student enrolls and checks in successfully
- [ ] Admin moderation and payroll pages load
- [ ] Notifications/WebSocket events are received

## 9) Release Decision

- [ ] GO
- [ ] NO GO

If NO GO: execute rollback from ROLLBACK_PLAYBOOK.md immediately.
