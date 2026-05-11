# Role-Based Test Matrix

Scope: authorization, ownership, and cross-role integration.

## 1) Access Control Matrix

| Feature | Student | Teacher | Admin |
|---|---|---|---|
| View approved classes | Allow | Allow | Allow |
| Create class | Deny | Allow | Allow |
| Approve/reject class | Deny | Deny | Allow |
| Edit own class | Deny | Allow | Allow |
| Edit other teacher class | Deny | Deny | Allow |
| Create session | Deny | Allow (own class) | Allow |
| Delete session | Deny | Allow (own class) | Allow |
| Manual attendance update | Deny | Allow (own session only) | Allow |
| QR check-in | Allow (self + enrolled) | Deny | Deny |
| View earnings/me | Deny | Allow | Deny |
| View earnings by teacherId | Deny | Allow (self only) | Allow |
| Forum moderation | Deny | Deny | Allow |

## 2) Ownership Matrix

| Operation | Owner Rule | Negative Test |
|---|---|---|
| Teacher class update | class.teacherId == req.user.id | Teacher A updates Teacher B class -> 403 |
| Teacher session update/delete | session.class.teacherId == req.user.id | Teacher A deletes Teacher B session -> 403 |
| Teacher attendance update | attendance.session.class.teacherId == req.user.id | Teacher A updates Teacher B attendance -> 403 |
| Teacher earnings by id | req.user.id == teacherId (unless ADMIN) | Teacher A requests Teacher B earnings -> 403 |
| Student enrollment query | studentId == req.user.id (unless ADMIN) | Student A requests Student B enrollments -> 403 |

## 3) Required Regression Tests

- [ ] API: class update ownership
- [ ] API: session update/delete ownership
- [ ] API: attendance check-in/update ownership
- [ ] API: earnings role restriction
- [ ] WebSocket: get_session_attendance ownership
- [ ] UI: teacher app uses teacherId scoped queries

## 4) Recommended Automation Priority

1. Critical API authorization tests
2. WebSocket authorization tests
3. End-to-end role journey tests
4. UI regression smoke tests
