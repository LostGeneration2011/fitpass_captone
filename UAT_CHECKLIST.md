# UAT Checklist (Admin / Teacher / Student)

Goal: verify real user behavior before production release.

## 1) Test Setup

- [ ] Prepare 1 admin account
- [ ] Prepare 2 teacher accounts (Teacher A, Teacher B)
- [ ] Prepare 3 student accounts (Student A/B/C)
- [ ] Ensure backend + admin + app are running with production-like env
- [ ] Ensure database has seed data + at least 2 classes and 2 sessions

## 2) Auth and Session

- [ ] Register student account successfully
- [ ] Register teacher account successfully
- [ ] Login returns valid token and role
- [ ] Invalid password is rejected with correct message
- [ ] Forgot password email flow works end-to-end
- [ ] Reset password token expires correctly
- [ ] Logout clears local token/session

## 3) Student UAT

- [ ] Student sees only student screens
- [ ] Student can browse approved classes
- [ ] Student can enroll class with valid package
- [ ] Student cannot enroll full class
- [ ] Student schedule loads enrolled sessions
- [ ] Student QR check-in works for valid session
- [ ] Student cannot check in if not enrolled
- [ ] Student forum: create/edit/delete own post works
- [ ] Student cannot edit/delete other user post
- [ ] Moderated/hidden post is not visible to student

## 4) Teacher UAT

- [ ] Teacher sees only teacher screens
- [ ] Teacher can create class (status PENDING)
- [ ] Teacher can edit own class
- [ ] Teacher cannot edit Teacher B class
- [ ] Teacher can create/update/delete own session
- [ ] Teacher cannot delete Teacher B session
- [ ] Teacher can open attendance for own session
- [ ] Teacher cannot update attendance for Teacher B session
- [ ] Teacher QR screen shows active/upcoming own sessions
- [ ] Teacher earnings/me returns valid data

## 5) Admin UAT

- [ ] Admin can view pending classes
- [ ] Admin approve class -> teacher gets updated status
- [ ] Admin reject class with reason -> teacher sees reason
- [ ] Admin can moderate forum content
- [ ] Admin can view and manage payroll/earnings overview
- [ ] Admin can access global attendance dashboard

## 6) Cross-Role Consistency

- [ ] Teacher creates class -> admin can review it
- [ ] Admin approves class -> student can view class
- [ ] Teacher marks attendance -> student attendance history updates
- [ ] Forum moderation from admin propagates to teacher/student feed

## 7) Non-Functional Checks

- [ ] No console/server fatal errors during 30-minute usage
- [ ] WebSocket reconnects correctly after network interruption
- [ ] Mobile app handles API error gracefully (no crash)
- [ ] Basic performance acceptable on list screens (no major lag)

## 8) UAT Sign-Off

- [ ] Product owner sign-off
- [ ] Technical owner sign-off
- [ ] No open Critical/High issues

Result:
- UAT status: PASS / FAIL
- Date:
- Owners:
- Notes:
