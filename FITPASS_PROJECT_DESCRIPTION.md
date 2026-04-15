# TỔNG QUAN DỰ ÁN FITPASS

## 📋 THÔNG TIN CHÍNH

| Tiêu chí | Thông tin chi tiết |
|----------|-------------------|
| **Tên dự án** | FITPASS |
| **Mô tả ngắn** | Nền tảng quản lý phòng gym thông minh, đặt lịch tập luyện, theo dõi sức khỏe và quản lý thành viên – hoạt động trên web và ứng dụng di động. |
| **Nền tảng triển khai** | Website (Admin Dashboard) và Mobile App (iOS + Android) |
| **Mục tiêu chính** | Số hóa quy trình quản lý phòng gym, kết nối học viên và huấn luyện viên, tối ưu hóa việc đặt lịch và theo dõi tiến độ tập luyện. |

---

## ⚙️ KIẾN TRÚC CÔNG NGHỆ

| Thành phần | Chi tiết công nghệ |
|------------|-------------------|
| **Backend** | Node.js + Express, PostgreSQL, Prisma ORM |
| **Frontend Web** | Next.js 14 + React 18 + TypeScript (Admin Dashboard với RBAC) |
| **Mobile App** | React Native + Expo (Expo SDK ~54) |
| **Authentication** | JWT (jsonwebtoken), bcrypt (bcryptjs) |
| **QR Code System** | Backend: JWT QR tokens, Mobile: react-native-qrcode-svg + expo-camera, Real-time: Socket.IO |
| **Real-time Features** | WebSocket (Socket.IO) cho attendance tracking |
| **State Management** | AsyncStorage (@react-native-async-storage), React hooks, expo-secure-store |
| **Navigation** | Expo Router (file-based) + React Navigation (Stack + Tab Navigator) |
| **Styling & UI** | Admin: Tailwind CSS + Hero Icons, Mobile: NativeWind (Tailwind for RN) |
| **Build Tools** | Admin: Next.js (webpack), Mobile: Expo (Metro bundler), Backend: TypeScript + ts-node-dev |

---

## CHỨC NĂNG HỆ THỐNG

### 👤 **Học viên (Student)**
| Chức năng | Mô tả |
|-----------|-------|
| Đăng ký/Đăng nhập | Tạo tài khoản, xác thực JWT |
| Duyệt khóa học | Xem danh sách lớp học có sẵn, lọc theo loại hình |
| Đăng ký lớp học | Chọn gói tập, đăng ký khóa học phù hợp |
| Đặt lịch tập | Book session cụ thể theo lịch trình cá nhân |
| Điểm danh QR | Scan QR code để check-in vào buổi tập |
| Theo dõi tiến độ | Xem lịch sử tập luyện, số buổi đã tham gia |
| Quản lý profile | Cập nhật thông tin cá nhân, mục tiêu fitness |

### 👨‍🏫 **Huấn luyện viên (Teacher)**
| Chức năng | Mô tả |
|-----------|-------|
| Quản lý lớp học | Tạo, chỉnh sửa thông tin lớp học |
| Lên lịch session | Tạo lịch tập cho từng lớp, quản lý thời gian |
| Tạo QR điểm danh | Generate QR code cho mỗi buổi tập |
## 🎯 CHỨC NĂNG HỆ THỐNG – STUDENT

| Chức năng | Mô tả |
|-----------|-------|
| **Tài khoản** | Đăng ký, đăng nhập, cập nhật hồ sơ |
| **Duyệt lớp học** | Xem, lọc theo loại hình, thời gian, level |
| **Đăng ký gói tập** | Chọn package, enrollment |
| **Đặt lịch** | Book sessions, xem lịch sắp tới |
| **Điểm danh QR** | Scan QR, ghi attendance |
| **Theo dõi tiến độ** | Lịch sử tập luyện, progress |

## 👨‍🏫 CHỨC NĂNG – TEACHER

| Chức năng | Mô tả |
|-----------|-------|
| **Quản lý lớp học** | Tạo/chỉnh sửa classes, capacity |
| **Lên lịch sessions** | Tạo schedule theo ngày/giờ |
| **QR điểm danh** | Generate QR, theo dõi attendance real-time |
| **Quản lý học viên** | Danh sách học viên, ghi chú progress |

## 🔧 CHỨC NĂNG – ADMIN

| Chức năng | Mô tả |
|-----------|-------|
| **Dashboard** | Revenue, attendance, memberships |
| **Quản lý người dùng** | CRUD Students/Teachers, phân quyền |
| **Quản lý lớp & gói** | Phê duyệt, cập nhật pricing |
| **Báo cáo** | Revenue, attendance, retention |

## 🚀 CHỨC NĂNG NÂNG CAO

| Loại | Features |
|------|----------|
| **Mobile nâng cao** | Push notifications, offline sync |
| **Analytics** | Progress charts, class popularity, retention forecasting |
| **Gamification** | Achievements, streaks, leaderboard |
| **Bảo mật nâng cao** | 2FA, rate limiting, advanced session management |

## 📊 YÊU CẦU PHI CHỨC NĂNG

| Tiêu chí | Yêu cầu |
|----------|---------|
| **Hiệu năng** | 100+ concurrent users, <2s response time |
| **Mở rộng** | Modular architecture, dễ thêm features |
| **Bảo mật** | JWT, role-based, encryption |
| **Khôi phục** | DB backup, graceful degradation |
| **Tương thích** | iOS 13+, Android 8+, modern browsers |
| **UI/UX** | Responsive, accessible, intuitive |
| **Realtime** | WebSocket notifications, booking updates |
| **Uptime** | 99.5% uptime, monitoring & logging |