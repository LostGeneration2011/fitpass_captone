# BIỂU ĐỒ GANTT DỰ ÁN FITPASS
## Thời gian thực hiện: 26/11/2025 - 29/01/2026 (9 tuần - 64 ngày)

### TỔNG QUAN DỰ ÁN
- **Loại dự án**: Ứng dụng quản lý phòng gym đa nền tảng
- **Công nghệ**: React Native (Mobile) + Next.js (Admin) + Node.js (Backend)
- **Thời gian**: 9 tuần (tránh Tết Nguyên Đán)
- **Scope**: MVP với đầy đủ tính năng cơ bản

---

## PHASE 1: KHỞI ĐỘNG & PHÂN TÍCH (Tuần 1)
**Thời gian**: 26/11/2025 - 02/12/2025

### Công việc chính:
- ✅ Nghiên cứu domain Fitness/Gym management
- ✅ Phân tích yêu cầu chi tiết
- ✅ Thiết kế database schema (ERD)
- ✅ Lập kế hoạch architecture
- ✅ Setup development environment

### Deliverables:
- Document yêu cầu chi tiết
- Database schema design
- Technical architecture document
- Development environment ready

---

## PHASE 2: BACKEND FOUNDATION (Tuần 2-4)
**Thời gian**: 03/12/2025 - 23/12/2025

### Tuần 2 (03/12 - 09/12): Core Setup
- ✅ Setup Node.js + Express + TypeScript
- ✅ Cấu hình Prisma ORM với PostgreSQL
- ✅ Tạo models cơ bản (User, Class, Package, Session)
- ✅ Implement JWT Authentication
- ✅ Basic API structure

### Tuần 3 (10/12 - 16/12): Core APIs
- ✅ User management (Admin/Teacher/Student roles)
- ✅ Class management system
- ✅ Package & Enrollment APIs
- ✅ Basic validation & error handling

### Tuần 4 (17/12 - 23/12): Advanced Features
- ✅ Session management & booking system
- ✅ QR code generation cho attendance
- ✅ WebSocket cho real-time notifications
- ✅ Attendance tracking system

---

## PHASE 3: MOBILE APPLICATION (Tuần 5-7)
**Thời gian**: 24/12/2025 - 13/01/2026

### Tuần 5 (24/12 - 30/12): Foundation (Giáng sinh)
- 🎄 Setup React Native với Expo
- 🎄 Authentication screens (Login/Register)
- 🎄 Navigation structure với Expo Router
- 🎄 Basic UI components

### Tuần 6 (31/12 - 06/01): Student Features (Tết Dương lịch)
- 🎉 Browse classes interface
- 🎉 Book sessions functionality
- 🎉 Profile management
- 🎉 Package selection

### Tuần 7 (07/01 - 13/01): Teacher Features
- 👨‍🏫 Class creation & management
- 👨‍🏫 QR code generation cho attendance
- 👨‍🏫 Student attendance tracking
- 👨‍🏫 Session management

---

## PHASE 4: WEB ADMIN DASHBOARD (Tuần 8)
**Thời gian**: 14/01/2026 - 20/01/2026

### Công việc:
- 🖥️ Next.js admin interface
- 🖥️ User management (CRUD operations)
- 🖥️ Class & Package management
- 🖥️ Reports & analytics dashboard
- 🖥️ System configuration

---

## PHASE 5: TESTING & DEPLOYMENT (Tuần 9)
**Thời gian**: 21/01/2026 - 29/01/2026 (Trước Tết)

### Công việc cuối:
- 🧪 Integration testing
- 🐛 Bug fixes & optimization
- 📱 Mobile app testing (iOS/Android)
- 🚀 Production deployment setup
- 📚 Documentation completion

---

## MILESTONE CHÍNH

| Milestone | Ngày hoàn thành | Mô tả |
|-----------|-----------------|-------|
| **M1: Requirements Done** | 02/12/2025 | Hoàn tất phân tích & thiết kế |
| **M2: Backend MVP** | 23/12/2025 | Core APIs hoạt động |
| **M3: Mobile MVP** | 13/01/2026 | App mobile cơ bản |
| **M4: Admin Dashboard** | 20/01/2026 | Web admin hoàn chình |
| **M5: Production Ready** | 29/01/2026 | Sẵn sàng deploy |

---

## RESOURCE ALLOCATION

### Công việc theo tuần:
- **Tuần 1**: 40 giờ (Phân tích & thiết kế)
- **Tuần 2-4**: 120 giờ (Backend development)
- **Tuần 5-7**: 120 giờ (Mobile development)
- **Tuần 8**: 40 giờ (Admin dashboard)
- **Tuần 9**: 40 giờ (Testing & deployment)

**Tổng cộng**: ~360 giờ làm việc

---

## RISK MANAGEMENT

### Rủi ro cao:
- **Tết Nguyên Đân**: 29/01/2026 - Cần hoàn thành trước đó
- **Learning curve**: React Native có thể mất thời gian
- **Integration**: Mobile + Backend + Admin cần sync tốt

### Mitigation:
- Ưu tiên core features trước
- Có backup plan cho deployment
- Regular testing và integration

---

## TECHNICAL STACK CONFIRMED

### Backend:
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- JWT Authentication
- WebSocket cho real-time

### Mobile:
- React Native + Expo
- Expo Router cho navigation
- Async Storage cho local data

### Admin:
- Next.js + TypeScript
- Tailwind CSS
- Server-side rendering

### Deployment:
- Backend: Vercel/Railway
- Database: PostgreSQL cloud
- Mobile: Expo Build Service