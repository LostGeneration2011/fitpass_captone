# fitpass-app — Tài liệu kiến trúc

> Tài liệu này mô tả toàn bộ cấu trúc, navigation, màn hình và thư viện của ứng dụng React Native (Expo). Dùng để tái tạo lại khi code bị hỏng.

---

## 1. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Framework | Expo (React Native) |
| Ngôn ngữ | TypeScript |
| Navigation | `@react-navigation/native` + `@react-navigation/stack` + `@react-navigation/bottom-tabs` |
| Styling | NativeWind (Tailwind CSS cho RN) |
| HTTP | `fetch` qua wrapper `apiGet/apiPost/apiPatch/apiDelete` trong `lib/api.ts` |
| Auth storage | `@react-native-async-storage/async-storage` (mobile) / `localStorage` (web) |
| Real-time | `socket.io-client` qua `lib/socketio.ts` |
| Push notification | Firebase FCM qua `lib/pushNotifications.ts` |
| Theme | Context API trong `lib/theme.tsx` (`ThemeProvider`, `useTheme`, `useThemeClasses`) |

---

## 2. Cấu trúc thư mục

```
fitpass-app/
├── App.tsx                  ← Root navigator (Stack toàn cục)
├── app.config.js            ← Cấu hình Expo (env vars, ngrok URL...)
├── global.css               ← Import NativeWind
├── app/
│   ├── welcome.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   ├── reset-password.tsx
│   ├── manual-verification.tsx
│   ├── notifications.tsx    ← Màn hình thông báo (dùng chung cả 2 role)
│   ├── payment/
│   │   └── success.tsx
│   ├── student/             ← Toàn bộ màn hình Student
│   ├── teacher/             ← Toàn bộ màn hình Teacher
│   └── admin/               ← Màn hình Admin (hiện có 1 screen)
├── lib/
│   ├── api.ts               ← Tất cả API calls
│   ├── auth.ts              ← Token/user lưu AsyncStorage
│   ├── socketio.ts          ← Socket.IO client
│   ├── theme.tsx            ← ThemeProvider, useTheme, useThemeClasses
│   ├── pushNotifications.ts ← FCM registration
│   ├── refreshEmitter.ts    ← EventEmitter để refresh data giữa các screen
│   ├── packageAPI.ts        ← API riêng cho gói tập
│   └── WebSocketProvider.tsx← WebSocket context (legacy)
└── components/
    ├── Button.tsx
    ├── Card.tsx
    ├── Header.tsx
    ├── Loading.tsx
    ├── ThemedInput.tsx
    ├── ThemeSettings.tsx
    ├── ThemeToggle.tsx
    └── WebLogin.tsx         ← Login web-only fallback
```

---

## 3. Navigation tree (quan trọng nhất)

```
App.tsx — Stack.Navigator (id="root-stack")
│
├── Welcome         → app/welcome.tsx
├── Login           → app/login.tsx
├── Register        → app/register.tsx
├── ForgotPassword  → app/forgot-password.tsx
├── ResetPassword   → app/reset-password.tsx
├── ManualVerification → app/manual-verification.tsx
│
├── Student         → app/student/student-stack.tsx
│   └── Stack.Navigator
│       ├── StudentTabs → app/student/_layout.tsx (Bottom Tab)
│       │   ├── Dashboard     → student/index.tsx
│       │   ├── Schedule      → student/schedule.tsx
│       │   ├── Classes       → student/classes.tsx
│       │   ├── Contact       → student/contact-stack.tsx
│       │   │   └── Stack: ContactList → contact.tsx
│       │   │                  ChatThread → chat-thread.tsx
│       │   ├── Profile       → student/profile.tsx
│       │   ├── Community     → student/forum.tsx
│       │   ├── Notifications → notifications.tsx       (tabBarButton: null)
│       │   ├── Packages      → student/packages.tsx    (tabBarButton: null)
│       │   ├── BookSessions  → student/book-sessions.tsx (tabBarButton: null)
│       │   └── Check-in      → student/checkin.tsx     (tabBarButton: null)
│       ├── BrowseClasses  → student/browse-classes.tsx
│       ├── Scanner        → student/checkin.tsx
│       ├── Attendance     → student/checkin.tsx
│       ├── ClassDetail    → student/class-detail.tsx
│       ├── TeacherProfile → student/teacher-profile.tsx
│       ├── ForumProfile   → student/forum-profile.tsx
│       └── ChatThread     → student/chat-thread.tsx
│
├── Teacher         → app/teacher/_layout.tsx (Bottom Tab)
│   ├── Dashboard   → teacher/index.tsx
│   ├── Classes     → teacher/classes-stack.tsx
│   │   └── Stack (id="TeacherClassesStack")
│   │       ├── ClassesList  → teacher/classes.tsx
│   │       ├── CreateClass  → teacher/create-class.tsx
│   │       ├── CreateSession → teacher/create-session.tsx
│   │       ├── EditClass    → teacher/edit-class.tsx
│   │       └── ClassDetail  → teacher/class-detail.tsx
│   ├── Sessions    → teacher/sessions-stack.tsx
│   │   └── Stack (id="TeacherSessionsStack")
│   │       ├── SessionsList   → teacher/sessions.tsx
│   │       ├── SessionDetail  → teacher/sessions/[id].tsx
│   │       └── AttendanceView → teacher/attendance-view.tsx
│   ├── Contact     → teacher/contact-stack.tsx
│   │   └── Stack: ContactList → teacher/contact.tsx
│   │              ChatThread  → teacher/chat-thread.tsx
│   ├── Profile     → teacher/profile-stack.tsx
│   │   └── Stack (id="TeacherProfileStack")
│   │       ├── ProfileMain   → teacher/profile.tsx
│   │       ├── Reports       → teacher/reports.tsx
│   │       ├── Earnings      → teacher/earnings.tsx
│   │       └── AttendanceView → teacher/attendance-view.tsx
│   ├── Forum       → teacher/forum-stack.tsx
│   │   └── Stack (id="TeacherForumStack")
│   │       ├── ForumMain    → student/forum.tsx  (tái sử dụng)
│   │       ├── ForumProfile → student/forum-profile.tsx
│   │       └── ClassDetail  → teacher/class-detail.tsx
│   ├── QR          → teacher/qr.tsx              (tabBarButton: null)
│   └── Notifications → notifications.tsx         (tabBarButton: null)
│
└── Admin           → app/admin/class-approval.tsx
```

---

## 4. Màn hình Student

| Screen name | File | Chức năng |
|---|---|---|
| `Dashboard` | `student/index.tsx` | Trang chủ, tổng quan lớp học + buổi học hôm nay |
| `Schedule` | `student/schedule.tsx` | Lịch học theo tuần/tháng |
| `Classes` | `student/classes.tsx` | Danh sách lớp đã đăng ký |
| `BookSessions` | `student/book-sessions.tsx` | Đăng ký lớp / gói tập mới |
| `BrowseClasses` | `student/browse-classes.tsx` | Tìm kiếm và duyệt tất cả lớp |
| `ClassDetail` | `student/class-detail.tsx` | Chi tiết lớp, đăng ký/hủy |
| `Check-in / Scanner` | `student/checkin.tsx` | Quét QR điểm danh |
| `Contact` | `student/contact.tsx` | Danh sách chat |
| `ChatThread` | `student/chat-thread.tsx` | Chat với giáo viên (socket.io) |
| `Profile` | `student/profile.tsx` | Hồ sơ cá nhân, đổi mật khẩu |
| `Packages` | `student/packages.tsx` | Mua và quản lý gói tập |
| `Community` | `student/forum.tsx` | Forum cộng đồng |
| `ForumProfile` | `student/forum-profile.tsx` | Hồ sơ người dùng trong forum |
| `TeacherProfile` | `student/teacher-profile.tsx` | Xem hồ sơ giáo viên |
| `Notifications` | `notifications.tsx` | Thông báo hệ thống |

---

## 5. Màn hình Teacher

| Screen name | File | Chức năng |
|---|---|---|
| `Dashboard` | `teacher/index.tsx` | Tổng quan + stats. "Xem thống kê" → navigate Profile > Reports |
| `ClassesList` | `teacher/classes.tsx` | Danh sách lớp (PENDING/APPROVED/REJECTED) |
| `CreateClass` | `teacher/create-class.tsx` | Tạo lớp mới |
| `EditClass` | `teacher/edit-class.tsx` | Sửa lớp. REJECTED → hiện nút "Tạo lớp học mới" |
| `CreateSession` | `teacher/create-session.tsx` | Tạo buổi học cho lớp |
| `ClassDetail` | `teacher/class-detail.tsx` | Chi tiết lớp + danh sách học viên |
| `SessionsList` | `teacher/sessions.tsx` | Danh sách buổi học |
| `SessionDetail` | `teacher/sessions/[id].tsx` | Chi tiết buổi học, tạo QR, xem điểm danh |
| `AttendanceView` | `teacher/attendance-view.tsx` | Xem điểm danh real-time (socket.io) |
| `Contact` | `teacher/contact.tsx` | Danh sách chat |
| `ChatThread` | `teacher/chat-thread.tsx` | Chat với học viên (socket.io) |
| `ProfileMain` | `teacher/profile.tsx` | Hồ sơ + cài đặt |
| `Reports` | `teacher/reports.tsx` | Báo cáo thống kê lớp/buổi học |
| `Earnings` | `teacher/earnings.tsx` | Xem lương, lịch sử chi trả |
| `QR` | `teacher/qr.tsx` | Tạo mã QR điểm danh cho buổi học |
| `ForumMain` | `student/forum.tsx` | Forum cộng đồng (dùng chung với student) |
| `Notifications` | `notifications.tsx` | Thông báo hệ thống |

---

## 6. Màn hình Admin

| Screen name | File | Chức năng |
|---|---|---|
| `Admin` | `admin/class-approval.tsx` | Duyệt / từ chối lớp học (PENDING → APPROVED/REJECTED) |

> Admin không có Tab navigator. Điều hướng thẳng từ root Stack sau khi đăng nhập với role `ADMIN`.

---

## 7. Lib / Utilities

### `lib/api.ts`
- Export: `API_URL` (string, tính từ `app.config.js` → `EXPO_PUBLIC_API`)
- Hàm wrapper: `apiGet(path)`, `apiPost(path, body)`, `apiPatch(path, body)`, `apiDelete(path)`
- Các API object: `classAPI`, `sessionsAPI`, `enrollmentAPI`, `attendanceAPI`, `chatAPI`, `notificationAPI`, `qrAPI`, `payrollAPI`, `packageAPI`, `userAPI`, `authAPI`
- **Quan trọng**: `enrollmentAPI.getByClass(classId)` dùng cho teacher (không phải `getAll()` — endpoint admin-only)

### `lib/auth.ts`
- `saveToken(token)` / `getToken()` — lưu/đọc JWT từ AsyncStorage key `fitpass_token`
- `saveUser(user)` / `getUser()` — lưu/đọc object user từ key `fitpass_user`
- `saveRefreshToken(token)` / `getRefreshToken()`
- `removeToken()` — xóa token + refresh token khi logout
- Platform-aware: dùng `localStorage` trên web, `AsyncStorage` trên mobile

### `lib/socketio.ts`
- `connectSocket(token: string)` — khởi tạo socket với auth token
- `getSocket()` — lấy socket instance hiện tại
- `disconnectSocket()` — ngắt kết nối
- URL từ `Constants.expoConfig?.extra?.EXPO_PUBLIC_WS_URL`, fallback về Railway production URL

### `lib/theme.tsx`
- `ThemeProvider` bọc toàn app
- `useTheme()` → `{ isDark, toggleTheme }`
- `useThemeClasses()` → object các class Tailwind theo theme (`bg`, `text`, `card`, v.v.)

### `lib/refreshEmitter.ts`
- EventEmitter dùng để trigger refresh data sau khi thực hiện action (vd: sau khi tạo lớp → refresh danh sách)

---

## 8. Luồng xác thực (Authentication Flow)

```
Khởi động App
    ↓
Welcome Screen
    ↓
Login Screen
    ├── role === 'STUDENT' → navigate('Student')
    ├── role === 'TEACHER' → navigate('Teacher')
    └── role === 'ADMIN'   → navigate('Admin')

Token được lưu qua saveToken() + saveUser() sau login thành công
Mỗi API call tự đính kèm token qua header Authorization: Bearer <token>
```

> Login có 3 handler gọi navigate: deep link listener, Google OAuth WebBrowser result, và `handleLogin` function thông thường.

---

## 9. Các pattern thường gặp

### Điều hướng giữa Tab
```typescript
// Từ bất kỳ màn hình nào trong Teacher stack:
(navigation as any).navigate('Profile', { screen: 'Reports' });

// Navigate sang screen trong nested stack:
(navigation as any).navigate('Classes', { screen: 'CreateClass' });
```

### Lấy URL đầy đủ từ đường dẫn tương đối
```typescript
const getFullUrl = (url: string): string => {
  if (!url || url.startsWith('http')) return url;
  const { API_URL } = require('../../lib/api');
  const baseUrl = (API_URL as string).replace(/\/api$/, '');
  return `${baseUrl}${url}`;
};
```

### Socket.IO real-time (attendance-view, chat-thread)
```typescript
const token = await getToken();
const socket = connectSocket(token!);
socket.emit('session:join', { sessionId });
socket.on('attendance:new', handler);
// Cleanup:
socket.emit('session:leave', { sessionId });
socket.off('attendance:new');
disconnectSocket();
```

### Theme-aware styling
```typescript
const { isDark } = useTheme();
// hoặc dùng class utility:
const { bg, textPrimary, card } = useThemeClasses();
```

---

## 10. Biến môi trường (app.config.js → extra)

| Key | Dùng ở đâu | Mô tả |
|---|---|---|
| `EXPO_PUBLIC_API` | `lib/api.ts` | Base URL của backend API (kết thúc bằng `/api`) |
| `EXPO_PUBLIC_WS_URL` | `lib/socketio.ts` | WebSocket URL (không có `/api`) |
| `IS_PRODUCTION` | `lib/api.ts` | Flag production build |

> Khi dùng ngrok, cập nhật cả 2 URL trên trong `app.config.js`. CORS backend cũng cần cập nhật tương ứng.

---

## 11. Lỗi phổ biến & cách sửa

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Back button không hoạt động trong Teacher screens | Dùng `router.back()` của expo-router trong React Navigation context | Dùng `useNavigation().goBack()` |
| Màn hình trống sau khi login với role ADMIN | Không có Stack.Screen tên `Admin` trong root stack | Thêm `<Stack.Screen name="Admin" component={...} />` vào App.tsx |
| 403 khi teacher xem danh sách học viên | Gọi `enrollmentAPI.getAll()` (admin-only) thay vì per-class | Dùng `enrollmentAPI.getByClass(classId)` cho từng lớp |
| Ảnh/file trong chat không hiển thị trên production | `getFullUrl()` hardcode `localhost` | Dùng `API_URL` từ `lib/api.ts`, `.replace(/\/api$/, '')` |
| `getToken` not exported | Trước đây auth.ts không export | `getToken` đã được export từ `lib/auth.ts` — import bình thường |
| Condition luôn `true` | `'stringLiteral'` truthy trong điều kiện OR | Phải viết `screenName === 'packagePurchase'` chứ không phải chỉ `'packagePurchase'` |
| Missing Prisma changes | `prisma generate` chưa chạy sau khi đổi schema | `prisma db push` rồi `prisma generate` trong `backend/` |
