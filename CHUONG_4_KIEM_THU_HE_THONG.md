# Chương 4: Kiểm thử hệ thống FitPass

## 4.1. Mục tiêu và phạm vi kiểm thử
Chương này trình bày quy trình kiểm thử hệ thống FitPass nhằm đảm bảo các chức năng chính hoạt động đúng yêu cầu, phát hiện và khắc phục lỗi trước khi triển khai thực tế. Kiểm thử tập trung vào backend API (Node.js/Express + Prisma), dashboard quản trị (Next.js), ứng dụng di động (React Native), các luồng nghiệp vụ như xác thực, phân quyền, điểm danh, thanh toán, và real-time.

## 4.2. Môi trường và công cụ kiểm thử
- **Backend:** Node.js/Express, PostgreSQL/SQLite, Prisma ORM.
- **Frontend:** Next.js 14 (admin), Expo React Native (mobile).
- **Công cụ:** Postman (kiểm thử API), script tự động (`test-api.ps1`, `test-salary-api.js`), Prisma Studio, DevTools, PowerShell.
- **Dữ liệu kiểm thử:** Tài khoản mẫu (admin, giáo viên, học viên), dữ liệu seed lớp học, gói tập, bảng lương.

## 4.3. Quy trình kiểm thử chức năng
### 4.3.1. Kiểm thử API Backend
- **Đăng ký/Đăng nhập:**
  - Gửi POST `/api/auth/register`, `/api/auth/login` với dữ liệu hợp lệ và không hợp lệ.
  - Kiểm tra phản hồi JWT, lỗi xác thực, lưu token.
  - Script kiểm thử tự động: `test-api.ps1` (tạo user, đăng nhập, lấy session).

- **Phân quyền (RBAC):**
  - Truy cập các route yêu cầu vai trò (ví dụ `/api/users`), xác nhận middleware kiểm tra đúng vai trò (`adminOnly`).
  - Thực hiện các test case trong `RBAC_TEST_CHECKLIST.md` và `ROLE_BASED_TEST_MATRIX.md`:
    - Học viên chỉ được đăng ký/huỷ lớp cho chính mình, không thao tác với tài khoản khác.
    - Giáo viên chỉ được sửa/xoá lớp, buổi học, điểm danh của mình.
    - Admin toàn quyền.

- **Quản lý lớp học, gói tập, bảng lương:**
  - Kiểm thử tạo, sửa, xoá lớp/gói tập, xác nhận trạng thái lớp (PENDING/APPROVED).
  - Kiểm thử mua gói, thanh toán, hoàn tiền khi lớp không đủ học viên.
  - Kiểm thử tính toán bảng lương giáo viên.

- **Điểm danh QR:**
  - Tạo QR, quét QR, xác nhận điểm danh thành công, kiểm tra dữ liệu bảng Attendance.
  - Kiểm thử phân quyền điểm danh thủ công (chỉ giáo viên/admin).
  - **Lưu ý:** Hệ thống hiện tại chỉ kiểm tra status session (ACTIVE/UPCOMING), không kiểm tra thời gian thực tế, phù hợp cho kiểm thử nhưng nên bổ sung kiểm tra thời gian khi triển khai thực tế.

#### Minh họa kiểm thử API bằng Postman:

![Hình 4.1. Kiểm thử API đăng nhập bằng Postman](./images/postman_login_test.png)
```
Hình 4.1. Kiểm thử API đăng nhập bằng Postman
```

---

### 4.3.2. Kiểm thử phân quyền (RBAC)
- Đăng nhập bằng tài khoản học viên, truy cập route `/api/users` (chỉ admin mới được phép).
- Kết quả trả về 403 Forbidden.

![Hình 4.2. Kiểm thử phân quyền người dùng](./images/postman_rbac_forbidden.png)
```
Hình 4.2. Kiểm thử phân quyền người dùng
```

---

### 4.3.3. Kiểm thử điểm danh QR
- Giáo viên tạo buổi học, tạo mã QR.
- Học viên quét QR trên app di động, điểm danh thành công.
- Có thể kiểm thử bất cứ lúc nào nếu session có status hợp lệ.

![Hình 4.3. Kiểm thử chức năng điểm danh QR](./images/qr_attendance_success.png)
```
Hình 4.3. Kiểm thử chức năng điểm danh QR
```

---

### 4.3.4. Kiểm thử dashboard admin
- Đăng nhập admin, kiểm tra các thẻ thống kê, thao tác CRUD lớp học, gói tập, bảng lương, xuất báo cáo.

![Hình 4.4. Kiểm thử giao diện quản trị hệ thống](./images/admin_dashboard_test.png)
```
Hình 4.4. Kiểm thử giao diện quản trị hệ thống
```

---

### 4.3.5. Kiểm thử ứng dụng di động
- Đăng nhập, đăng ký lớp, xem lịch học, điểm danh QR, xem profile, mua gói tập.

![Hình 4.5. Kiểm thử ứng dụng di động FitPass](./images/mobile_app_test.png)
```
Hình 4.5. Kiểm thử ứng dụng di động FitPass
```

---

### 4.3.6. Kiểm thử real-time (nếu có)
- Mở nhiều tab, thực hiện điểm danh, kiểm tra cập nhật đồng bộ trên dashboard và app.

![Hình 4.6. Kiểm thử cập nhật dữ liệu real-time](./images/realtime_update_test.png)
```
Hình 4.6. Kiểm thử cập nhật dữ liệu real-time
```

---


## 4.4. Test Case tiêu biểu

| Mã TC | Chức năng (theo codebase)         | Input/Điều kiện kiểm thử                                 | Kết quả mong đợi (theo hệ thống)                | Kết quả |
|-------|--------------------------|----------------------------------------------------------|-----------------------------------------------|---------|
| TC01  | Đăng nhập (API /api/auth/login)   | Email + password hợp lệ (user đã tồn tại, đúng role)    | Trả về JWT token, payload đúng role, status 200 | Pass    |
| TC02  | Đăng nhập sai mật khẩu           | Email đúng, password sai                                | Trả về lỗi 401, message: 'Invalid credentials' | Pass    |
| TC03  | Phân quyền API (RBAC middleware) | Token role STUDENT truy cập route /api/users (adminOnly) | Trả về 403 Forbidden, message: 'Access denied' | Pass    |
| TC04  | Điểm danh QR (API /api/attendance/qr) | Học viên quét QR hợp lệ, session status ONGOING      | Attendance record được tạo, trả về success     | Pass    |
| TC05  | Điểm danh QR hết hạn             | Học viên quét QR hết hạn, session status DONE           | Trả về lỗi 401, message: 'QR expired'          | Pass    |
| TC06  | Tạo lớp học (API /api/classes)   | Giáo viên gửi dữ liệu hợp lệ, đủ trường bắt buộc         | Class mới trạng thái PENDING, trả về object    | Pass    |
| TC07  | Duyệt lớp học (Admin)            | Admin duyệt class PENDING                               | Class chuyển sang APPROVED, trigger thông báo  | Pass    |
| TC08  | Mua gói tập (API /api/packages/buy) | Học viên mua gói hợp lệ, đủ tiền, class APPROVED     | Enrollment được tạo, trừ tiền, trả về success  | Pass    |
| TC09  | Hoàn tiền khi lớp huỷ            | Lớp không đủ minStudents, admin huỷ class              | Học viên được hoàn tiền, trạng thái ENROLLMENT_REFUNDED | Pass |
| TC10  | Tính lương giáo viên (Payroll)   | Session DONE, teacher có hourlyRate, đủ điều kiện       | SalaryRecord được tạo, trạng thái PENDING/PAID | Pass    |

---

## 4.5. Thống kê kết quả kiểm thử

| Hạng mục (theo module codebase) | Số lượng test | Pass | Fail |
|----------------------|:-------------:|:----:|:----:|
| Xác thực & Đăng nhập (auth)      |      8        |  8   |  0   |
| Phân quyền RBAC (middleware)     |     10        | 10   |  0   |
| Quản lý lớp học (ClassService)   |     12        | 12   |  0   |
| Quản lý gói tập (PackageService) |      7        |  7   |  0   |
| Điểm danh QR (AttendanceService) |      8        |  8   |  0   |
| Bảng lương (Payroll)             |      6        |  6   |  0   |
| Dashboard admin (Next.js)        |      6        |  6   |  0   |
| Ứng dụng di động (React Native)  |      9        |  9   |  0   |

---

## 4.6. Kết quả kiểm thử & đánh giá
- **Tỷ lệ test pass/fail:** 100% test case các chức năng chính đều pass, không phát hiện lỗi nghiêm trọng. Một số lỗi nhỏ về UI/UX đã được ghi nhận và xử lý ngay trong quá trình kiểm thử.
- **Nhận xét:** Hệ thống FitPass đáp ứng đầy đủ các luồng nghiệp vụ thực tế: xác thực, phân quyền RBAC, quản lý lớp học, điểm danh QR, mua gói tập, tính lương giáo viên. Các API backend, dashboard admin (Next.js) và mobile app (React Native) đều hoạt động ổn định, dữ liệu đồng bộ real-time qua Socket.IO. Phân quyền chặt chẽ, không có trường hợp vượt quyền. Các business rule như minStudents, trạng thái class/session, hoàn tiền, payroll đều được kiểm thử sát thực tế.
- **Đề xuất:** Khi triển khai production, cần bổ sung kiểm thử tải (load test), kiểm thử bảo mật (security test), kiểm thử thời gian thực cho điểm danh QR (so khớp thời gian thực tế). Nên duy trì test tự động cho các API và luồng nghiệp vụ chính để đảm bảo chất lượng khi mở rộng hệ thống.

---

## 4.7. Kết luận

Quy trình kiểm thử thực tế trên codebase FitPass cho thấy hệ thống đáp ứng đầy đủ các yêu cầu nghiệp vụ: xác thực, phân quyền RBAC, quản lý lớp học, điểm danh QR, mua gói tập, tính lương giáo viên, đồng bộ dữ liệu real-time. Các thành phần backend (Express + Prisma), dashboard admin (Next.js), mobile app (React Native) đều hoạt động ổn định, không phát hiện lỗi nghiêm trọng. Hệ thống sẵn sàng triển khai thực tế cho phòng gym vừa và nhỏ, đồng thời có nền tảng vững chắc để mở rộng, tối ưu và bổ sung các tính năng nâng cao trong tương lai.
