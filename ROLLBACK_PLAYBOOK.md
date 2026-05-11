# Rollback Playbook

Purpose: safely recover production when deployment causes incidents.

## 1) Rollback Triggers

Start rollback if any condition is true:
- Critical auth failure (users cannot login)
- Widespread 5xx errors
- Data integrity risk (wrong attendance/enrollment/salary updates)
- Authorization bypass found in production
- Core flows broken for multiple roles

## 2) Immediate Incident Actions (0-10 minutes)

1. Freeze new deployments
2. Notify team channel and assign incident owner
3. Capture current logs and failing endpoints
4. Confirm scope: backend only, admin only, app only, or full stack

## 3) Backend Rollback

1. Identify last stable commit hash
2. Rollback to stable backend release
3. Redeploy backend service
4. Verify health endpoint and auth endpoints

Commands (example):

```powershell
git log --oneline -n 20
git revert <bad_commit_hash>
git push
```

Use revert on shared branches.

## 4) Frontend/Admin Rollback

1. Redeploy previous stable build artifact
2. Verify login and dashboard loading
3. Verify role guards and key pages

## 5) Database Safety

- Never run destructive schema changes during incident response unless approved
- If bad migration/data corruption exists:
  - restore latest valid backup snapshot
  - re-run minimal validation queries
- Keep an audit of restored timestamp and affected tables

## 6) Post-Rollback Verification

- [ ] Health endpoint OK
- [ ] Login works for Admin/Teacher/Student
- [ ] Teacher class/session/attendance ownership rules still enforced
- [ ] Student enroll + check-in works
- [ ] Admin approve/reject + moderation works
- [ ] Error rate back to baseline

## 7) Communication Template

- Incident start time:
- Impacted users/features:
- Rollback start time:
- Rollback completion time:
- Current system status:
- Next update ETA:

## 8) Aftercare (within 24 hours)

1. Run root cause analysis (RCA)
2. Add regression test for the incident path
3. Update release checklist and playbooks
4. Schedule safe re-release with explicit validation gates
