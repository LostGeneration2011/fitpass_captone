# FitPass Admin Dashboard — Tài liệu tham khảo

> File này ghi lại toàn bộ vai trò, chức năng, và logic kỹ thuật của `fitpass-admin`.
> Mục đích: đề phòng mất code, dùng làm cơ sở để rebuild hoặc debug.

---

## 1. Tổng quan kiến trúc

| Thành phần | Công nghệ | Ghi chú |
|------------|-----------|---------|
| Framework | Next.js 14 (App Router) | `app/` directory, file-based routing |
| Styling | Tailwind CSS + dark mode | Class `dark:` theo `document.documentElement.classList` |
| Icons | Heroicons v2 + Lucide React | `@heroicons/react/24/outline` |
| HTTP Client | Axios | Instance tập trung tại `lib/api.ts` |
| Charts | Recharts | Dashboard và báo cáo |
| Auth | JWT cookie (`fitpass_token`) + localStorage user | Cookie httpOnly, set bởi backend |
| Real-time | Socket.IO client | Dùng trong `/chat` |
| Toast | Custom `lib/toast.tsx` + `react-hot-toast` | `useToast()` hook |

---

## 2. Cấu trúc thư mục

```
fitpass-admin/
├── app/                        # Tất cả pages (Next.js App Router)
│   ├── layout.tsx              # Root layout — bọc AppShell
│   ├── page.tsx                # Redirect về /dashboard
│   ├── login/                  # Trang đăng nhập
│   ├── forgot-password/        # Quên mật khẩu (gửi email)
│   ├── reset-password/         # Đặt lại mật khẩu (từ email link)
│   ├── clear-session/          # Xóa session thủ công (debug)
│   ├── dashboard/              # Bảng điều khiển tổng quan
│   ├── classes/                # Quản lý lớp học
│   ├── sessions/               # Quản lý buổi học
│   ├── rooms/                  # Quản lý phòng học
│   ├── enrollments/            # Quản lý ghi danh học viên
│   ├── attendance/             # Điểm danh
│   ├── users/                  # Quản lý người dùng
│   ├── packages/               # Quản lý gói tập
│   ├── user-packages/          # Gói tập của học viên
│   ├── transactions/           # Lịch sử giao dịch
│   ├── teacher-salary/         # Tính & chi trả lương giáo viên
│   ├── chat/                   # Chat admin ↔ học viên/giáo viên
│   ├── forum/                  # Quản lý diễn đàn cộng đồng
│   ├── notifications/          # Quản lý thông báo hệ thống
│   ├── security/               # Đổi mật khẩu admin
│   ├── reports/                # Nhóm báo cáo (8 sub-routes)
│   └── api/                    # Next.js Route Handlers (server-side proxy)
│       ├── auth/               # Proxy login/logout
│       ├── attendance/         # Export dữ liệu điểm danh
│       ├── notifications/      # Lấy thông báo real-time
│       ├── download-file/      # Proxy tải file
│       └── proxy-image/        # Proxy ảnh tránh CORS
├── components/
│   ├── AppShell.tsx            # Layout root: Sidebar + Navbar + AdminGuard
│   ├── AdminGuard.tsx          # Bảo vệ route — chỉ cho role ADMIN
│   ├── Sidebar.tsx             # Menu điều hướng
│   ├── Navbar.tsx              # Top bar: burger, dark mode, user info
│   ├── AdvancedTable.tsx       # Table tái sử dụng với search/sort/filter
│   ├── Table.tsx               # Table đơn giản
│   ├── Form.tsx                # Form tái sử dụng
│   ├── ConfirmDialog.tsx       # Modal xác nhận hành động nguy hiểm
│   ├── Toast.tsx               # Component hiển thị toast
│   ├── AdminLoading.tsx        # Màn hình loading khi check auth
│   └── DevLoadingHelper.tsx    # Helper debug (chỉ dev)
└── lib/
    ├── api.ts                  # Axios instance + tất cả API functions
    ├── auth.tsx                # AuthContext + AuthProvider + useAuth
    ├── session.ts              # Utility clearAdminSession()
    ├── toast.tsx               # ToastContext + useToast
    └── config.ts               # Cấu hình môi trường
```

---

## 3. Authentication (Xác thực)

### Luồng đăng nhập
1. User nhập email/password tại `/login`
2. `useAuth().login()` gọi `POST /api/auth/login` qua axios (`withCredentials: true`)
3. Backend trả về `{ user: { id, email, fullName, role } }` và set cookie `fitpass_token` (httpOnly)
4. Frontend kiểm tra `user.role === 'ADMIN'` — nếu không phải → trả lỗi "Admin access only"
5. Nếu đúng role → lưu `fitpass_admin_user` vào `localStorage`, set state `user`
6. `AuthProvider` effect redirect sang `/dashboard`

### Bảo vệ routes
- **`AdminGuard`** component bọc toàn bộ app (trừ public routes)
- Kiểm tra: `user && user.role === 'ADMIN'` — nếu fail → hiển thị "Access Denied"
- **Public routes** (không qua AdminGuard):
  - `/login`
  - `/forgot-password`
  - `/reset-password`
  - `/clear-session`

### Session timeout
- Không có auto-refresh token trên frontend
- Cookie expire do backend set (`maxAge: 7 ngày`)
- Khi API trả 401 → axios interceptor tự redirect sang `/login`

### Đăng xuất
- `forceLogout()` từ `lib/auth.tsx`: xóa `fitpass_admin_user` khỏi localStorage, clear cookie (gọi `/api/auth/logout`)

### Quên mật khẩu
- `/forgot-password` → gọi `POST /api/auth/forgot-password` với `{ email }`
- Backend gửi email có link `reset-password?token=xxx`
- `/reset-password?token=xxx` → gọi `POST /api/auth/reset-password` với `{ token, newPassword }`

---

## 4. Các trang và chức năng chi tiết

### 4.1 Dashboard (`/dashboard`)
**Dữ liệu hiển thị:**
- Thống kê tổng quan: tổng lớp học, buổi học, học viên, điểm danh hôm nay
- Chỉ số hiệu suất: mức độ hài lòng học viên, tỷ lệ điểm danh, số buổi/tuần
- Doanh thu: tổng doanh thu, số giao dịch hoàn thành/đang chờ
- So sánh tháng này vs tháng trước (`getMonthOverMonthDelta()`)

**Charts (Recharts):**
- `LineChart` — xu hướng doanh thu theo ngày
- `BarChart` — độ phổ biến lớp học
- `LineChart` — tỷ lệ điểm danh theo ngày

**API calls:** `classesAPI.getAll()`, `sessionsAPI.getAll()`, `usersAPI.getAll()`, `transactionsAPI.getAll()`

---

### 4.2 Lớp học (`/classes`)
**Chức năng CRUD:**
- Xem danh sách lớp + filter theo status (PENDING / APPROVED / REJECTED)
- Tạo lớp mới (name, description, capacity, duration)
- Sửa thông tin lớp
- Xóa lớp (có ConfirmDialog)
- **Phê duyệt / Từ chối lớp**: `PATCH /api/classes/:id/approve` hoặc `PATCH /api/classes/:id/reject`
- Từ chối yêu cầu nhập `rejectionReason`

**Model lớp học:**
```typescript
{
  id, name, description, capacity, duration (minutes),
  status: 'PENDING' | 'APPROVED' | 'REJECTED',
  rejectionReason?, teacherId?, teacher?,
  minStudents?, maxStudents?, priceAdjustment?,
  type?, level?,
  _count: { enrollments, sessions },
  classImages: [{ id }]
}
```

**Business rule:** Nếu `enrollments < minStudents` → trigger refund cho học viên (xử lý ở backend).

---

### 4.3 Buổi học (`/sessions`)
**Chức năng:**
- Xem danh sách buổi học + filter theo status
- Tạo / Sửa / Xóa buổi học
- Status: `UPCOMING` → `ONGOING` → `DONE`
- Liên kết với Class và Room

---

### 4.4 Phòng học (`/rooms`)
**Chức năng:**
- CRUD phòng học (tên, sức chứa, mô tả, tiện ích)
- Tiêu đề trang: "Quản lý phòng học" (đã fix typo từ "Quan ly phong hoc")

---

### 4.5 Ghi danh (`/enrollments`)
**Chức năng:**
- Xem danh sách ghi danh học viên vào lớp
- Filter theo class, status
- Hủy ghi danh (có hoàn tiền nếu đủ điều kiện)
- Status: `ACTIVE` / `CANCELLED` / `COMPLETED`

---

### 4.6 Điểm danh (`/attendance`)
**Chức năng:**
- Xem lịch sử điểm danh theo buổi học
- QR-based: học viên quét QR → backend ghi nhận
- Admin xem được ai đã điểm danh, vắng mặt
- Export dữ liệu điểm danh (qua `/api/attendance` route handler)

---

### 4.7 Người dùng (`/users`)
**Chức năng:**
- Xem danh sách + filter theo role: ADMIN / TEACHER / STUDENT
- Tạo user mới (email, fullName, role, password)
- Sửa thông tin user
- Xóa user (có ConfirmDialog)

**User model:**
```typescript
{
  id, email, fullName,
  role: 'ADMIN' | 'TEACHER' | 'STUDENT',
  emailVerified, isActive, createdAt,
  _count: { teachingClasses, enrollments, transactions }
}
```

---

### 4.8 Gói tập (`/packages`)
**Chức năng:**
- CRUD các gói tập (tên, mô tả, giá, số buổi, thời hạn)
- Kích hoạt / Vô hiệu hóa gói

---

### 4.9 Gói của người dùng (`/user-packages`)
**Chức năng:**
- Xem học viên đang dùng gói nào
- Trạng thái: ACTIVE / EXPIRED / CANCELLED
- Gia hạn thủ công

---

### 4.10 Giao dịch (`/transactions`)
**Chức năng:**
- Xem toàn bộ giao dịch + filter theo ngày (startDate, endDate)
- Status: `PENDING` / `COMPLETED` / `FAILED` / `CANCELLED`
- Phương thức thanh toán: `paymentMethod`, `paypalOrderId`

**Transaction model:**
```typescript
{
  id, userId, packageId, amount,
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
  paymentMethod, paypalOrderId?, createdAt,
  user: { fullName, email },
  userPackage: { package: { name, price } }
}
```

---

### 4.11 Lương giáo viên (`/teacher-salary`)
**Chức năng:**
- Xem bảng tóm tắt lương: `hourlyRate`, `totalHours`, `totalEarnings`, `salaryOwed`
- Filter giáo viên theo ngưỡng `minOwed`
- Thanh toán lương: gọi `POST /api/salary/:teacherId/pay`
- Xem lịch sử thanh toán (modal): `paymentHistory[]` với paidDate, amount, note
- Bulk pay nhiều giáo viên cùng lúc

**Công thức lương (xem `PAYROLL_BUSINESS_LOGIC.md`):**
```
salaryOwed = totalHours × hourlyRate - đã trả
totalHours = Σ (thời lượng buổi học DONE mà giáo viên dạy)
```

---

### 4.12 Chat (`/chat`)
**Chức năng:**
- Admin xem và tham gia tất cả chat threads
- Threads phân loại: `ALL` / `CLASS` / `CLASS_GROUP` / `SUPPORT`
- Gửi tin nhắn, upload file đính kèm
- Real-time: kết nối Socket.IO (`io()` tới backend `/`)
- Typing indicator (broadcast qua WS `chat.typing`)
- Chỉnh sửa / xóa tin nhắn
- Emoji quick picker
- Unread count per thread

**WebSocket events:**
```
auth → auth_success/auth_error
chat.join → chat.joined
chat.leave → chat.left
chat.send → chat.message (broadcast)
chat.typing → chat.typing (broadcast)
```

**WS URL logic:**
```typescript
const baseUrl = apiUrl.replace(/\/api$/, '');
const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
// → wss://host/ws (native WS) hoặc Socket.IO
```

---

### 4.13 Forum cộng đồng (`/forum`)
**Chức năng:**
- Xem danh sách bài đăng forum
- Phê duyệt / Ẩn bài đăng (kiểm duyệt nội dung)
- Xóa bài vi phạm

---

### 4.14 Thông báo (`/notifications`)
**Chức năng:**
- Xem toàn bộ notifications hệ thống
- Đánh dấu đã đọc (`PATCH /api/notifications/:id/read`)
- Đánh dấu tất cả đã đọc
- Xóa thông báo
- Gửi thông báo mới (broadcast đến users)

**Notification types:**
```
CLASS_APPROVED, CLASS_REJECTED, ENROLLMENT_CONFIRMED, ATTENDANCE_MARKED,
PAYMENT_SUCCESS, PAYMENT_FAILED, SALARY_READY, SESSION_UPCOMING,
SESSION_REMINDER, ENROLLMENT_CANCELLED, REFUND_PROCESSED, ADMIN_ALERT, GENERAL_NOTICE
```

---

### 4.15 Bảo mật (`/security`)
**Chức năng:**
- Đổi mật khẩu admin (currentPassword + newPassword + confirmPassword)
- Kiểm tra độ mạnh mật khẩu real-time:
  - Tối thiểu 8 ký tự
  - Có chữ hoa / chữ thường
  - Có số
  - Có ký tự đặc biệt
- Gọi `POST /api/users/change-password`

---

## 5. Nhóm báo cáo (`/reports`)

### 5.1 Tổng quan (`/reports`) 
Stats tổng hợp từ nhiều API: học viên active/churned, lớp dưới min-students, tỷ lệ điểm danh, doanh thu, reviews bị ẩn.

### 5.2 Báo cáo doanh thu (`/reports/revenue`)
- Doanh thu theo tháng/quý/năm
- Phân tích theo gói tập, phương thức thanh toán

### 5.3 Học viên 360 (`/reports/membership`)
- Học viên active, mới đăng ký, churn
- Tỷ lệ giữ chân, tăng trưởng

### 5.4 Vận hành lớp học (`/reports/class-analytics`)
- Lớp đang chạy, fill rate, tỷ lệ hủy
- Phân tích theo loại/cấp độ lớp

### 5.5 Thống kê giáo viên (`/reports/teacher-statistics`)
- Giờ dạy, doanh thu tạo ra, rating trung bình
- So sánh hiệu suất giáo viên

### 5.6 Kiểm duyệt đánh giá (`/reports/reviews`)
- Danh sách đánh giá của học viên
- Ẩn / Hiện / Xóa đánh giá vi phạm

### 5.7 Báo cáo điểm danh (`/reports/attendance`)
- Tỷ lệ điểm danh theo lớp/buổi/giáo viên
- Export CSV

### 5.8 Phân tích học viên (`/reports/student-insights`)
- Hành vi học tập, buổi học tham gia
- Học viên có nguy cơ nghỉ học

---

## 6. API Layer (`lib/api.ts`)

### URL resolution logic
```typescript
// Thứ tự ưu tiên:
if (isLocalHostRuntime && !forceRemoteApiOnLocal) → http://localhost:3001/api
else if (NEXT_PUBLIC_API_URL configured)          → configured URL
else                                               → https://fortunate-wholeness-production.up.railway.app/api
```

### Axios interceptors
- **Request**: thêm `X-Forwarded-Proto: https` nếu baseURL chứa "ngrok"; log URL trong dev
- **Response**: 401 → redirect `/login`

### API namespaces (functions exported từ api.ts)
```typescript
classesAPI       → getAll, getById, create, update, delete, approve, reject
sessionsAPI      → getAll, getById, create, update, delete
usersAPI         → getAll, getById, create, update, delete
enrollmentsAPI   → getAll, cancel
attendanceAPI    → getAll, getBySession
transactionsAPI  → getAll
packagesAPI      → getAll, create, update, delete
userPackagesAPI  → getAll
salaryAPI        → getSummary, pay, getHistory
chatAPI          → getThreads, getMessages, sendMessage, deleteMessage, uploadAttachment
reviewModerationAPI → getAll, hide, unhide, delete
notificationsAPI → getAll, markRead, markAllRead, delete, send
```

---

## 7. Components tái sử dụng

### `AdvancedTable`
Props: `data[]`, `columns[]`, `searchable`, `filterable`, `actions[]`
- Built-in search, sort, pagination
- Action buttons (edit, delete, approve, reject, v.v.)

### `ConfirmDialog`
Props: `isOpen`, `title`, `message`, `onConfirm`, `onCancel`, `type: 'danger'|'warning'|'info'`
- Bắt buộc dùng cho mọi hành động xóa/hủy không thể hoàn tác

### `Form`
Props: `fields[]`, `onSubmit`, `defaultValues`
- Tái sử dụng cho create/edit modals

---

## 8. Dark Mode

- Toggle bằng nút trên Navbar
- State lưu tại `localStorage.getItem('darkMode')`
- Áp dụng bằng `document.documentElement.classList.toggle('dark', ...)`
- Hydration-safe: chỉ đọc localStorage trong `useEffect` (client-side)
- Tất cả components dùng class `dark:` của Tailwind

---

## 9. Environment Variables

| Biến | Môi trường | Mô tả |
|------|-----------|-------|
| `NEXT_PUBLIC_API_URL` | Production | URL backend Railway, vd: `https://xxx.up.railway.app/api` |
| `NEXT_PUBLIC_APP_NAME` | Optional | Tên app, mặc định "FitPass Admin Dashboard" |
| `NEXT_PUBLIC_FORCE_REMOTE_API` | Dev | Set `true` để dùng remote API trên localhost |

---

## 10. Deploy (Railway)

- **Builder**: Dockerfile (`fitpass-admin/Dockerfile`)
- **Dockerfile**: multi-stage build (node:20-alpine builder → production)
- **Port**: `EXPOSE 3000`, `CMD ["npm", "start"]` (`next start`)
- **Config file**: `fitpass-admin/railway.toml`
- **Env vars bắt buộc trên Railway dashboard**: `NEXT_PUBLIC_API_URL`

---

## 11. Điểm quan trọng khi rebuild

1. **Cookie auth**: `withCredentials: true` trên axios là bắt buộc — token đi qua cookie httpOnly, không qua header
2. **AdminGuard**: Phải check `user.role === 'ADMIN'` — không chỉ check `user !== null`
3. **Public routes**: `/reset-password` phải được thêm vào danh sách bypass AdminGuard trong `AppShell.tsx`
4. **Socket.IO**: Chat dùng `socket.io-client`, kết nối trực tiếp tới backend root (không qua `/api`)
5. **WS native**: Path `/ws` dùng native WebSocket cho typing indicator và chat lightweight
6. **CORS**: Backend phải có `ALLOWED_ORIGINS` chứa domain admin
7. **Prisma**: Backend phải chạy `prisma migrate deploy` trước khi boot (đã có trong `start` script)
8. **Dark mode hydration**: Phải wrap trong `useEffect` để tránh mismatch SSR/client
