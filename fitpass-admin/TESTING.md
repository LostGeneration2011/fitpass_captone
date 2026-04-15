# **TESTING GUIDE - FitPass Admin Dashboard**

## **🚀 Setup & Start Testing**

### **1. Start Backend Server**
```bash
cd backend
npm run dev
# Should show: Server running on port 3001, WebSocket ready
```

### **2. Start Frontend Server**
```bash
cd fitpass-admin
npm run dev
# Should open: http://localhost:3000
```

---

## **🔐 Test Login**

### **Step 1: Access Login Page**
1. Navigate to: `http://localhost:3000`
2. Should auto-redirect to `/login`
3. ✅ **Expected**: Login form displayed with email/password fields

### **Step 2: Test Login Credentials**
**Admin Login:**
- Email: `admin@fitpass.com`
- Password: `FitPass@2024!`
- Click "Sign in"
- ✅ **Expected**: Redirect to `/dashboard`, token saved in localStorage

**Teacher Login:**
- Email: `giaovien1@fitpass.com`  
- Password: `FitPass@2024!`
- ✅ **Expected**: Redirect to `/dashboard`, teacher can access all features

**Student Login:**
- Email: `hocvien1@fitpass.com`
- Password: `FitPass@2024!`
- ✅ **Expected**: Redirect to student app dashboard

### **Step 3: Verify Token Storage**
1. Open browser DevTools → Application → Local Storage
2. ✅ **Expected**: `accessToken` key exists with JWT value

### **Step 4: Test Auto-Redirect**
1. Logout and visit `http://localhost:3000/dashboard` directly
2. ✅ **Expected**: Auto-redirect to `/login` (auth guard working)

---

## **📊 Test Dashboard**

### **Step 1: Load Dashboard**
1. Login and access `/dashboard`
2. ✅ **Expected**: Stats cards show:
   - Total Classes: 3 (from seed data)
   - Total Students: 2 (from seed data)
   - Total Sessions: 0 (initially)

### **Step 2: Test Quick Actions**
1. Click "Manage Classes" card
2. ✅ **Expected**: Navigate to `/classes`
3. Test all 4 quick action cards

### **Step 3: Verify Layout**
1. ✅ **Expected**: Sidebar with navigation menu
2. ✅ **Expected**: Top navbar with page title
3. ✅ **Expected**: Responsive design

---

## **🏫 Test Classes CRUD**

### **Step 1: Load Classes List**
1. Navigate to `/classes`
2. ✅ **Expected**: Table shows 3 existing classes from seed data:
   - Yoga Basics
   - HIIT Training  
   - Pilates Fundamentals

### **Step 2: Create New Class**
1. Click "Create Class" button
2. Fill form:
   - Class Name: "Test Class"
   - Description: "Test Description"
   - Teacher: Select any teacher
3. Click "Save"
4. ✅ **Expected**: 
   - Success message appears
   - New class appears in table
   - Modal closes

### **Step 3: Edit Class**
1. Click edit icon (pencil) on any class
2. Modify name to "Updated Class Name"
3. Click "Save"
4. ✅ **Expected**:
   - Success message
   - Table updates with new name

### **Step 4: Delete Class**
1. Click delete icon (trash) on test class
2. Confirm deletion
3. ✅ **Expected**:
   - Confirmation dialog appears
   - Class removed from table
   - Success message

### **Step 5: API Call Verification**
Open Network tab in DevTools and verify:
- ✅ `GET /api/classes` - loads classes
- ✅ `POST /api/classes` - creates class
- ✅ `PATCH /api/classes/:id` - updates class  
- ✅ `DELETE /api/classes/:id` - deletes class

---

## **📅 Test Sessions Management**

### **Step 1: Load Sessions List**
1. Navigate to `/sessions`
2. ✅ **Expected**: Table shows existing sessions (from seed data)

### **Step 2: Create New Session**
1. Click "Create Session"
2. Fill form:
   - Title: "Test Session"
   - Description: "Test Description"
   - Class: Select any class
   - Start Time: Future date/time
   - End Time: After start time
   - Status: "Scheduled"
3. ✅ **Expected**: Session created and appears in table

### **Step 3: Update Session Status**
1. Find session in table
2. Change status dropdown from "Scheduled" to "Ongoing"
3. ✅ **Expected**:
   - Status updates immediately
   - API call `PATCH /api/sessions/:id/status` succeeds

### **Step 4: Edit Session**
1. Click edit icon on session
2. Modify session title
3. ✅ **Expected**: Session updates successfully

### **Step 5: Delete Session**
1. Click delete icon
2. Confirm deletion
3. ✅ **Expected**: Session removed from table

---

## **📝 Test Enrollments**

### **Step 1: Load Enrollments**
1. Navigate to `/enrollments`
2. ✅ **Expected**: 
   - Stats cards show enrollment counts
   - Table shows existing enrollments
   - Filter by class works

### **Step 2: Create Enrollment**
1. Click "Create Enrollment"
2. Select student and class
3. ✅ **Expected**: Enrollment created successfully

### **Step 3: Test Class Filter**
1. Use class filter dropdown
2. ✅ **Expected**: Table filters by selected class

### **Step 4: Delete Enrollment**
1. Click delete button on enrollment
2. ✅ **Expected**: Enrollment removed

---

## **✅ Test Attendance**

### **Step 1: Load Attendance Data**
1. Navigate to `/attendance`
2. ✅ **Expected**:
   - Stats cards show Present/Absent/Late counts
   - Attendance rate percentage displayed
   - Table shows attendance records

### **Step 2: Test Filters**
1. Filter by Class: Select a class
2. ✅ **Expected**: Table shows only attendances for that class
3. Filter by Session: Select a session  
4. ✅ **Expected**: Table shows only attendances for that session
5. Filter by Status: Select "Present"
6. ✅ **Expected**: Table shows only present attendances

### **Step 3: Update Attendance Status**
1. Find attendance record in table
2. Change status dropdown from "Absent" to "Present"
3. ✅ **Expected**:
   - Status updates immediately
   - Stats cards update
   - Attendance rate recalculates

### **Step 4: Verify Real-time Updates**
1. Keep attendance page open
2. In another tab, use QR attendance (if implemented)
3. ✅ **Expected**: Attendance table updates automatically

---

## **🔧 Test Error Handling**

### **Step 1: Invalid Login**
1. Try login with wrong email/password
2. ✅ **Expected**: Error message displayed

### **Step 2: Network Errors**
1. Stop backend server
2. Try any CRUD operation
3. ✅ **Expected**: Error message appears

### **Step 3: Token Expiration**
1. Manually delete token from localStorage
2. Try accessing protected page
3. ✅ **Expected**: Redirect to login

---

## **📱 Test Responsive Design**

### **Step 1: Mobile View**
1. Open DevTools → Toggle device toolbar
2. Switch to mobile view
3. ✅ **Expected**: 
   - Sidebar adapts to mobile
   - Tables scroll horizontally
   - Buttons remain accessible

### **Step 2: Tablet View**
1. Switch to tablet view
2. ✅ **Expected**: Layout adapts appropriately

---

## **🎯 Complete Test Checklist**

### **Authentication**
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows error
- [ ] Token stored in localStorage
- [ ] Auth guard redirects to login when not authenticated
- [ ] Logout removes token and redirects

### **Dashboard**
- [ ] Stats cards display correct counts
- [ ] Quick action cards navigate correctly
- [ ] Layout renders properly

### **Classes CRUD**
- [ ] Load classes list
- [ ] Create new class
- [ ] Edit existing class
- [ ] Delete class
- [ ] Form validation works

### **Sessions CRUD**
- [ ] Load sessions list
- [ ] Create new session
- [ ] Edit session
- [ ] Update session status
- [ ] Delete session

### **Enrollments**
- [ ] Load enrollments list
- [ ] Create enrollment
- [ ] Filter by class works
- [ ] Delete enrollment
- [ ] Stats display correctly

### **Attendance**
- [ ] Load attendance data
- [ ] Filter by class/session/status
- [ ] Update attendance status
- [ ] Stats calculate correctly
- [ ] Attendance rate displays

### **API Integration**
- [ ] All API endpoints called correctly
- [ ] Bearer tokens sent with requests
- [ ] Error handling works
- [ ] Loading states display

### **UI/UX**
- [ ] Responsive design works
- [ ] Icons display properly
- [ ] Modals open/close correctly
- [ ] Tables paginate/scroll properly
- [ ] Success/error messages appear

---

## **🎓 Test Student Mobile App (Session 10+)**

### **1. Browse Classes with Filters**
1. Login app mobile: `hocvien1@fitpass.com` / `FitPass@2024!`
2. Vào tab "Lớp học" (Classes)
3. ✅ **Features:**
   - **Search:** Tìm kiếm theo tên lớp/giáo viên → filter real-time
   - **Sort:** Sắp xếp theo Tên/Sức chứa/Thời gian
   - **Stats:** Hiển thị số lớp có thể đăng ký / Đã đăng ký
   - **Enroll:** Đăng ký lớp thành công

### **2. Schedule & Bookings**
1. Vào tab "Lịch của tôi" (Schedule)
2. ✅ **Features:**
   - Lịch buổi học sắp tới (Upcoming Sessions)
   - Sắp xếp theo ngày/giờ
   - Hiển thị class name, teacher, room
   - Nút "Điểm danh" ở header

### **3. QR Check-in**
1. Nhấn nút "Điểm danh" QR icon
2. ✅ **Features:**
   - Scan QR code từ teacher screen
   - Fallback: Paste URL method
   - Hiển thị trạng thái (PRESENT/ABSENT/LATE)

### **4. Progress Tracking**
1. Vào tab "Hồ sơ" (Profile)
2. ✅ **Features:**
   - **Progress Bar:** % Điểm danh với visual gradient
   - **Statistics Cards:** Lớp học, Buổi học, Đã tham gia, Tỷ lệ
   - **Achievement Level:** Mới → Tốt → Xuất sắc → Siêu sao

### **5. Packages**
1. Vào tab "Gói tập" (Packages)
2. ✅ **Features:**
   - Danh sách gói (giá, credits, ngày hết hạn)
   - Mua gói PayPal
   - Xem credits còn lại

---

## **✅ Expected Final Result**

After completing all tests:
- ✅ Admin dashboard functional
- ✅ Student app: Browse classes with search/sort
- ✅ Schedule & bookings working
- ✅ QR check-in system
- ✅ Progress tracking with visual chart
- ✅ Package purchase flow
- ✅ No backend code modifications
- ✅ Responsive design (iOS/Android)

**🎉 Student Features: COMPLETED**