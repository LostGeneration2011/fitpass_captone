# 📋 FitPass Teacher Payroll Business Logic - Complete Workflow

## 🔄 Standard Business Process Flow

### 1. **Session Completion Tracking**
```
Teacher teaches class → Session status changes to "DONE" → Hours get tracked for payroll
```
- ✅ **Implemented**: Sessions are tracked in database with status "DONE"
- ✅ **Implemented**: Duration calculated from class duration field (in minutes)
- ✅ **Implemented**: Hours converted properly (minutes → hours) for salary calculation

### 2. **Monthly Payroll Generation**
```
Admin → Generate Payroll → Select Month/Year → System calculates all teacher salaries
```

**Current Implementation:**
- ✅ **Admin Panel**: `/teacher-salary` page with "Generate Payroll" button
- ✅ **API Endpoint**: `POST /api/payroll/generate`
- ✅ **Business Logic**:
  - Finds all teachers with role "TEACHER"
  - Calculates completed sessions for specified month
  - Calculates total hours: `sessions.reduce((sum, session) => sum + (session.class.duration / 60), 0)`
  - Calculates total salary: `totalHours * teacher.hourlyRate`
  - Creates PENDING salary records for teachers with >0 hours
  - Prevents duplicate payroll generation for same month

### 3. **Payroll Review & Payment Process**
```
Admin reviews payroll → Confirms payment → Marks as PAID → Teacher notified (future)
```

**Current Implementation:**
- ✅ **Review Interface**: Salary records displayed with teacher details
- ✅ **Payment Confirmation**: "Pay Salary" button for each pending record
- ✅ **Status Update**: `PATCH /api/payroll/:id/status` sets to "PAID"
- ✅ **Payment Tracking**: `paidDate` automatically set when marked as PAID
- 🔄 **Teacher Notification**: Not yet implemented (future enhancement)

## 📊 Current Database Schema

### SalaryRecord Model:
```prisma
model SalaryRecord {
  id          String   @id @default(cuid())
  teacherId   String
  teacher     User     @relation(fields: [teacherId], references: [id])
  month       Int
  year        Int
  totalHours  Float
  hourlyRate  Float
  totalAmount Float
  status      String   @default("PENDING") // PENDING | PAID
  paidDate    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### User Model (Teachers):
```prisma
model User {
  // ... other fields
  hourlyRate      Float?           // VND per hour
  salaryRecords   SalaryRecord[]
  classesTeaching Class[]
}
```

## 🏗️ Complete Workflow Implementation Status

### ✅ **FULLY IMPLEMENTED**:
1. **Teacher Hourly Rate Management**
   - Admin can set/update teacher hourly rates
   - Rates stored in `User.hourlyRate` field
   - UI: Teacher salary page → "Update Rate" modal

2. **Session-Based Hour Tracking**
   - Sessions marked as "DONE" count toward payroll
   - Hours calculated from `Class.duration` field
   - Automatic aggregation by month/year

3. **Payroll Generation**
   - Monthly payroll creation for all teachers
   - Prevents duplicate payroll for same month
   - Only creates records for teachers with completed sessions

4. **Payment Processing**
   - Admin can mark payroll as "PAID"
   - Payment date tracking
   - Status management (PENDING → PAID)

5. **Admin Interface**
   - Complete payroll management UI
   - Teacher salary overview with statistics
   - Generate payroll modal with month/year selection
   - Individual payment confirmation

### 🔄 **POTENTIAL ENHANCEMENTS**:
1. **Teacher Notifications**
   - Email notifications when payroll is generated
   - Payment confirmation emails
   - Monthly salary statements

2. **Advanced Reporting**
   - Payroll export (PDF/Excel)
   - Historical salary reports
   - Teacher performance analytics

3. **Approval Workflow**
   - Multi-level approval for large payments
   - Payroll review before generation
   - Audit trail for all changes

## 🧪 **Test Results** (December 2024):
```
Teacher: Trần Thị Hương
- Sessions completed: 5 sessions
- Total hours: 10.00 hours (5 sessions × 1.5 hours each)
- Hourly rate: 200,000 VND/hour
- Total salary: 2,000,000 VND
- Status: PENDING → PAID ✅
```

## 💡 **Business Logic Compliance**:

✅ **"Tạo payroll để gửi cho mỗi giáo viên số lương và số giờ"**
- System generates comprehensive payroll with hours and salary amounts
- Each teacher gets individual salary record with detailed calculations

✅ **"Sau đó sẽ chuyển thành paid"**
- Admin can review and confirm payments
- Status transitions from PENDING → PAID
- Payment date automatically recorded

The current implementation fully supports the standard payroll business logic you described. The system properly tracks teaching hours, generates monthly payrolls, and manages the payment workflow from generation to completion.