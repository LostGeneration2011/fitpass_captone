# FitPass Teacher Earnings Feature - Complete Testing Guide

## ✅ Completion Status

### Phần Backend - HOÀN THÀNH
- [x] Fix TypeScript compilation errors (4 lỗi sửa)
- [x] Tạo earnings controller với 2 endpoints:
  - GET /api/earnings/me - Teacher xem lương cá nhân
  - GET /api/earnings/:teacherId - Admin xem lương teacher
- [x] Tạo earnings routes và mount vào app
- [x] Test endpoint - THÀNH CÔNG ✅

### Phần Mobile App - HOÀN THÀNH  
- [x] Earnings screen tại app/teacher/earnings.tsx
  - Hiển thị teacher info (tên, email, hourly rate)
  - Tổng giờ dạy, giờ tháng này, dự kiến lương
  - Lịch sử lương (12 tháng gần nhất)
  - Thao tác pull-to-refresh
- [x] Button "Thu Nhập & Lương" trong dashboard teacher
  - Nằm trong profile.tsx
  - Dẫn đến /teacher/earnings
  - Có gradient màu vàng/amber

## 📱 Hướng dẫn Test

### 1. Backend đang chạy
```
URL: http://localhost:3001
Health: http://localhost:3001/api/health
Earnings API: http://localhost:3001/api/earnings/me
```

### 2. Mobile App đang chạy  
```
URL: http://localhost:8081
Web version: http://localhost:8081/teacher/earnings
```

### 3. Test Earnings API (Backend)
```powershell
# Từ terminal, chạy:
cd c:\vtc-project3\fitpass
powershell -NoProfile -ExecutionPolicy Bypass -File test-earnings-final.ps1
```

**Kết quả mong đợi:**
```
Teacher Info:
  Name: Teacher Test
  Email: teacher.test.20260119111325@fitpass.com
  Rate: 250000 VND/h

Earnings Summary:
  Total Hours: 0h (hoặc > 0 nếu có sessions)
  This Month: 0h
  Expected Pay: 0 VND
```

### 4. Test Earnings Screen (Mobile Web)
- Mở browser: http://localhost:8081
- Đăng nhập với teacher account
- Tap vào tab "Hồ sơ" (Profile)
- Tap button "Thu Nhập & Lương"
- Kiểm tra dữ liệu hiển thị đúng không

**Kiểm tra:**
- ✅ Teacher thông tin được tải
- ✅ Earnings data được fetch từ API
- ✅ Formatting tiền tệ (VND) đúng
- ✅ Pull-to-refresh hoạt động
- ✅ Salary history hiển thị (nếu có dữ liệu)

## 🔄 API Response Format

**Request:**
```
GET /api/earnings/me
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "teacher": {
    "id": "string",
    "fullName": "string",
    "email": "string", 
    "hourlyRate": number
  },
  "earnings": {
    "totalHoursTaught": number,
    "currentMonthHours": number,
    "expectedSalaryThisMonth": number,
    "lastPaidAmount": number,
    "lastPaidDate": string | null
  },
  "salaryHistory": [
    {
      "id": "string",
      "period": "1/2026",
      "totalHours": number,
      "amount": number,
      "status": "PENDING" | "PAID",
      "date": string
    }
  ]
}
```

## 🎯 Tính năng Chính

### 1. Real-time Earnings Tracking
- Tính giờ dạy từ completed sessions
- Nhân với hourly rate để tính lương
- Hiển thị dự kiến lương tháng hiện tại

### 2. Salary History
- Hiển thị 12 tháng gần nhất
- Color-coded status (Green=PAID, Yellow=PENDING)
- Sắp xếp từ mới nhất

### 3. Auto-verify Test Email
- Trong development, email có chứa "test" hoặc "demo" được auto-verify
- Giúp testing không cần verify email

## 📝 Notes

- Backend: TypeScript + Express.js + Prisma
- Mobile: React Native + Expo + TypeScript
- Database: PostgreSQL (Prisma ORM)
- Auth: JWT token-based
- API Response: Thống nhất format JSON

## 🚀 Tiếp Theo (Optional)

1. Thêm charts/graphs cho earnings trends
2. Export PDF salary record
3. Filter salary history by month/year
4. Push notification khi salary được paid
5. Integration với PayPal/banking untuk auto-transfer
