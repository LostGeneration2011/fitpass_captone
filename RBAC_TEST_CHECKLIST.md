# FitPass RBAC Test Checklist

## Test Scenarios - Xác Minh Không Có Vấn Đề

### STUDENT User Test (ID: student-123)

#### ✅ Enrollment Flow
```
1. GET /api/classes → Should return all approved classes
   Expected: 200 OK + list of classes

2. POST /api/enrollments (enrolling self in class-456)
   Body: { "studentId": "student-123", "classId": "class-456" }
   Expected: 201 Created (tạo enrollment thành công)
   
3. POST /api/enrollments (trying to enroll another student - student-789)
   Body: { "studentId": "student-789", "classId": "class-456" }
   Expected: 403 Forbidden "Students can only enroll themselves"

4. GET /api/enrollments?studentId=student-123
   Expected: 200 OK + list of own enrollments

5. DELETE /api/enrollments (unenroll self)
   Body: { "studentId": "student-123", "classId": "class-456" }
   Expected: 200 OK

6. DELETE /api/enrollments (trying to unenroll another student)
   Body: { "studentId": "student-789", "classId": "class-456" }
   Expected: 403 Forbidden "Students can only unenroll themselves"
```

#### ✅ Package & Payment Flow
```
7. GET /api/packages → Should return all packages
   Expected: 200 OK

8. POST /api/user-packages/purchase
   Body: { "packageId": "package-001" }
   Expected: 201 Created

9. POST /api/payment/paypal/create-order
   Expected: 200 OK + PayPal order

10. GET /api/user-packages
    Expected: 200 OK + only own packages (filtered in controller)
```

#### ✅ QR Check-in Flow
```
11. POST /api/attendance/checkin (with valid QR token)
    Body: { "token": "base64-encoded-token" }
    Expected: 200 OK "Checked in successfully"

12. POST /api/attendance/check-in (trying manual check-in)
    Expected: 403 Forbidden "Only teachers and admins can perform manual check-in"
```

#### ❌ Should NOT Be Able To
```
- POST /api/sessions → 403 Forbidden (teacherOrAdmin)
- PATCH /api/sessions/:id → 403 Forbidden (teacherOrAdmin)
- DELETE /api/sessions/:id → 403 Forbidden (teacherOrAdmin)
- POST /api/users → 403 Forbidden (adminOnly)
- GET /api/salary/teachers/salary-overview → 403 Forbidden (adminOnly)
- POST /api/attendance/check-in → 403 Forbidden (teacherOrAdmin)
- PATCH /api/attendance/:id → 403 Forbidden (teacherOrAdmin)
```

---

### TEACHER User Test (ID: teacher-456)

#### ✅ Class Management Flow
```
1. POST /api/classes
   Body: { "name": "Yoga Class", "duration": 60, ... }
   Expected: 201 Created (with status: PENDING)

2. PATCH /api/classes/class-456 (updating own class)
   Body: { "name": "Advanced Yoga" }
   Expected: 200 OK

3. DELETE /api/classes/class-456 (trying to delete own class)
   Expected: 403 Forbidden (only admin can delete)

4. GET /api/classes → Should return all classes
   Expected: 200 OK
```

#### ✅ Session Management Flow
```
5. POST /api/sessions
   Body: { "classId": "class-456", "startTime": "...", "endTime": "..." }
   Expected: 201 Created (for own class)

6. POST /api/sessions (for another teacher's class)
   Expected: 403 Forbidden "You do not own this class"

7. PATCH /api/sessions/:id/status (for own session)
   Body: { "status": "ACTIVE" }
   Expected: 200 OK

8. DELETE /api/sessions/:id (for own session)
   Expected: 200 OK

9. POST /api/qr/sessions/:id/start (for own session)
   Expected: 200 OK + QR token
```

#### ✅ Attendance Management Flow
```
10. POST /api/attendance/check-in (for own class)
    Body: { "sessionId": "session-123", "studentId": "student-789" }
    Expected: 201 Created

11. GET /api/attendance?sessionId=session-123
    Expected: 200 OK + attendance records

12. PATCH /api/attendance/:id (updating attendance)
    Body: { "status": "ABSENT" }
    Expected: 200 OK
```

#### ✅ Student Progress Notes
```
13. PATCH /api/enrollments/:id/note
    Body: { "progressNotes": "Good progress" }
    Expected: 200 OK (only TEACHER can do this)
```

#### ✅ Earnings
```
14. GET /api/earnings/me
    Expected: 200 OK + own earnings

15. GET /api/earnings/teacher-456
    Expected: 200 OK (own earnings)

16. GET /api/earnings/teacher-789 (another teacher)
    Expected: 403 Forbidden "You can only view your own earnings"
```

#### ❌ Should NOT Be Able To
```
- POST /api/classes/:id/approve → 403 Forbidden (adminOnly)
- POST /api/classes/:id/reject → 403 Forbidden (adminOnly)
- DELETE /api/classes/:id → 403 Forbidden (adminOnly)
- POST /api/users → 403 Forbidden (adminOnly)
- GET /api/salary/teachers/salary-overview → 403 Forbidden (adminOnly)
- GET /api/transactions → 403 Forbidden (adminOnly)
- GET /api/earnings/teacher-other-789 → 403 Forbidden
```

---

### ADMIN User Test (ID: admin-001)

#### ✅ Should Be Able To Do Everything

```
1. GET /api/users → 200 OK (all users)
2. POST /api/users → 201 Created (create user)
3. PATCH /api/users/:id → 200 OK (update user)
4. DELETE /api/users/:id → 200 OK (delete user)

5. POST /api/classes/:id/approve → 200 OK
6. POST /api/classes/:id/reject → 200 OK
7. DELETE /api/classes/:id → 200 OK

8. POST /api/sessions → 201 Created (for any class)
9. PATCH /api/sessions/:id → 200 OK
10. DELETE /api/sessions/:id → 200 OK

11. POST /api/attendance/check-in → 201 Created (for any student)
12. PATCH /api/attendance/:id → 200 OK

13. GET /api/salary/teachers/salary-overview → 200 OK
14. POST /api/salary/teachers/pay → 200 OK
15. GET /api/salary/payroll → 200 OK
16. POST /api/salary/payroll/generate → 200 OK

17. GET /api/transactions → 200 OK
18. PATCH /api/transactions/:id → 200 OK

19. POST /api/packages → 201 Created
20. PATCH /api/packages/:id → 200 OK
21. DELETE /api/packages/:id → 200 OK

22. GET /api/earnings/:teacherId → 200 OK (any teacher)

23. GET /api/debug/users → 200 OK (debug endpoint)
```

---

## Regression Tests

### Route-Level RBAC
- [ ] Verify `adminOnly()` middleware is applied correctly
- [ ] Verify `teacherOrAdmin()` middleware is applied correctly
- [ ] Verify `teacherOnly()` middleware is applied correctly
- [ ] Verify endpoints without middleware still work

### Controller-Level Validation
- [ ] Student can only enroll self
- [ ] Student can only unenroll self
- [ ] Teacher can only manage own sessions
- [ ] Teacher can only see own earnings
- [ ] QR check-in validates enrollment

### Error Responses
- [ ] 403 Forbidden for unauthorized role
- [ ] 403 Forbidden for ownership violations
- [ ] 400 Bad Request for missing required fields
- [ ] 404 Not Found for non-existent resources

---

## Integration Test Commands

```bash
# Test STUDENT enrollment (should succeed)
curl -X POST http://localhost:3000/api/enrollments \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "student-123", "classId": "class-456"}'

# Test STUDENT trying to enroll someone else (should fail)
curl -X POST http://localhost:3000/api/enrollments \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "student-789", "classId": "class-456"}'

# Test TEACHER creating session (should succeed)
curl -X POST http://localhost:3000/api/sessions \
  -H "Authorization: Bearer <teacher-token>" \
  -H "Content-Type: application/json" \
  -d '{"classId": "class-456", "startTime": "2024-01-25T10:00:00Z", "endTime": "2024-01-25T11:00:00Z"}'

# Test ADMIN accessing salary (should succeed)
curl -X GET http://localhost:3000/api/salary/teachers/salary-overview \
  -H "Authorization: Bearer <admin-token>"

# Test STUDENT accessing salary (should fail)
curl -X GET http://localhost:3000/api/salary/teachers/salary-overview \
  -H "Authorization: Bearer <student-token>"
```

---

## Status: 🟢 Ready for Testing
All routes configured. Next: Run integration tests to verify no regressions.
