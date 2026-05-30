-- ================================================================================
-- FITPASS DATABASE SCHEMA EXPORT
-- Database: PostgreSQL 15 (Railway.app Production)
-- Generated: 12/05/2026
-- Source: Prisma Schema (prisma/schema.prisma)
-- Migrations: 14 migrations applied
-- ================================================================================

-- ============== ENUM TYPES ==============

CREATE TYPE "UserRole" AS ENUM (
  'ADMIN',
  'TEACHER',
  'STUDENT'
);

CREATE TYPE "SessionStatus" AS ENUM (
  'UPCOMING',
  'ACTIVE',
  'DONE',
  'CANCELLED'
);

CREATE TYPE "AttendanceStatus" AS ENUM (
  'PRESENT',
  'ABSENT',
  'LATE'
);

CREATE TYPE "ClassStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "ClassType" AS ENUM (
  'YOGA',
  'CARDIO',
  'STRENGTH',
  'DANCE',
  'PILATES',
  'OTHER'
);

CREATE TYPE "ClassLevel" AS ENUM (
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'ALL_LEVELS'
);

CREATE TYPE "ReactionType" AS ENUM (
  'LIKE',
  'DISLIKE',
  'LOVE',
  'WOW'
);

CREATE TYPE "ChatThreadType" AS ENUM (
  'SUPPORT',
  'CLASS',
  'CLASS_GROUP'
);

CREATE TYPE "PackageStatus" AS ENUM (
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED'
);

CREATE TYPE "TransactionStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE "ForumModerationStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "EnrollmentStatus" AS ENUM (
  'ACTIVE',
  'CANCELLED',
  'TRANSFERRED',
  'COMPLETED',
  'SUSPENDED'
);

CREATE TYPE "PaymentMethod" AS ENUM (
  'PAYPAL',
  'MOMO',
  'ZALOPAY'
);

CREATE TYPE "RoomStatus" AS ENUM (
  'AVAILABLE',
  'OCCUPIED',
  'MAINTENANCE',
  'RESERVED'
);

-- ============== MAIN TABLES ==============

-- User Table: Stores all users (Student, Teacher, Admin)
CREATE TABLE "User" (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  "fullName" VARCHAR(255) NOT NULL,
  role "UserRole" NOT NULL DEFAULT 'STUDENT',
  "teacherBio" TEXT,
  "teacherExperienceYears" INTEGER,
  "teacherSpecialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "teacherCertifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "teacherHighlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "teacherCoverImage" VARCHAR(255),
  "teacherGalleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "verificationToken" VARCHAR(255),
  "resetToken" VARCHAR(255),
  "resetTokenExpiry" TIMESTAMP,
  "hourlyRate" DECIMAL(10, 2) DEFAULT 250000,
  "salaryOwed" DECIMAL(10, 2) DEFAULT 0,
  "notificationEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "autoReminderEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "fcmToken" VARCHAR(255),
  "googleId" VARCHAR(255) UNIQUE,
  provider VARCHAR(20) NOT NULL DEFAULT 'local',
  avatar VARCHAR(255)
);

CREATE INDEX "User_email_idx" ON "User"(email);
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- Class Table: Gym classes/courses
CREATE TABLE "Class" (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  "teacherId" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rejectionReason" TEXT,
  status "ClassStatus" NOT NULL DEFAULT 'PENDING',
  "minStudents" INTEGER NOT NULL DEFAULT 5,
  "maxStudents" INTEGER,
  "priceAdjustment" DECIMAL(10, 2) DEFAULT 1.0,
  type "ClassType" NOT NULL DEFAULT 'OTHER',
  level "ClassLevel" NOT NULL DEFAULT 'ALL_LEVELS',
  FOREIGN KEY ("teacherId") REFERENCES "User"(id) ON DELETE SET NULL
);

CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");
CREATE INDEX "Class_status_idx" ON "Class"(status);

-- Room Table: Gym rooms/facilities
CREATE TABLE "Room" (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL,
  equipment TEXT,
  status "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Session Table: Individual class sessions
CREATE TABLE "Session" (
  id VARCHAR(255) PRIMARY KEY,
  "classId" VARCHAR(255) NOT NULL,
  "startTime" TIMESTAMP NOT NULL,
  "endTime" TIMESTAMP NOT NULL,
  status "SessionStatus" NOT NULL DEFAULT 'UPCOMING',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "roomId" VARCHAR(255),
  FOREIGN KEY ("classId") REFERENCES "Class"(id) ON DELETE RESTRICT,
  FOREIGN KEY ("roomId") REFERENCES "Room"(id) ON DELETE SET NULL
);

CREATE INDEX "Session_classId_idx" ON "Session"("classId");
CREATE INDEX "Session_roomId_idx" ON "Session"("roomId");
CREATE INDEX "Session_status_idx" ON "Session"(status);

-- Enrollment Table: Student enrollment in classes (M:N relationship)
CREATE TABLE "Enrollment" (
  id VARCHAR(255) PRIMARY KEY,
  "studentId" VARCHAR(255) NOT NULL,
  "userId" VARCHAR(255),
  "classId" VARCHAR(255) NOT NULL,
  "userPackageId" VARCHAR(255),
  status "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP,
  "refundAmount" DECIMAL(10, 2),
  "refundProcessed" BOOLEAN DEFAULT FALSE,
  "transferredFrom" VARCHAR(255),
  "progressNotes" TEXT,
  "lastNoteAt" TIMESTAMP,
  "notesUpdatedBy" VARCHAR(255),
  FOREIGN KEY ("studentId") REFERENCES "User"(id) ON DELETE RESTRICT,
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE SET NULL,
  FOREIGN KEY ("classId") REFERENCES "Class"(id) ON DELETE RESTRICT,
  FOREIGN KEY ("userPackageId") REFERENCES "UserPackage"(id) ON DELETE SET NULL,
  UNIQUE ("studentId", "classId")
);

CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"(status);

-- Attendance Table: QR code check-in records
CREATE TABLE "Attendance" (
  id VARCHAR(255) PRIMARY KEY,
  "sessionId" VARCHAR(255) NOT NULL,
  "studentId" VARCHAR(255) NOT NULL,
  "enrollmentId" VARCHAR(255),
  status "AttendanceStatus" NOT NULL,
  "checkedInAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("sessionId") REFERENCES "Session"(id) ON DELETE RESTRICT,
  FOREIGN KEY ("studentId") REFERENCES "User"(id) ON DELETE RESTRICT,
  FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"(id) ON DELETE SET NULL,
  UNIQUE ("sessionId", "studentId")
);

CREATE INDEX "Attendance_sessionId_idx" ON "Attendance"("sessionId");
CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");

-- Package Table: Gym packages/memberships
CREATE TABLE "Package" (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  credits INTEGER NOT NULL,
  "validDays" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "refundRate" DECIMAL(10, 2) DEFAULT 0.7,
  "penaltyRate" DECIMAL(10, 2) DEFAULT 0.2,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- UserPackage Table: Student purchases of packages
CREATE TABLE "UserPackage" (
  id VARCHAR(255) PRIMARY KEY,
  "userId" VARCHAR(255) NOT NULL,
  "packageId" VARCHAR(255) NOT NULL,
  "creditsLeft" INTEGER NOT NULL,
  "usedCredits" INTEGER NOT NULL DEFAULT 0,
  status "PackageStatus" NOT NULL DEFAULT 'ACTIVE',
  "purchasedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT,
  FOREIGN KEY ("packageId") REFERENCES "Package"(id) ON DELETE RESTRICT
);

CREATE INDEX "UserPackage_userId_idx" ON "UserPackage"("userId");
CREATE INDEX "UserPackage_status_idx" ON "UserPackage"(status);

-- Transaction Table: Payment records
CREATE TABLE "Transaction" (
  id VARCHAR(255) PRIMARY KEY,
  "userPackageId" VARCHAR(255),
  "userId" VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "paymentId" VARCHAR(255),
  status "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT,
  FOREIGN KEY ("userPackageId") REFERENCES "UserPackage"(id) ON DELETE SET NULL
);

CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX "Transaction_status_idx" ON "Transaction"(status);

-- Booking Table: Student bookings for sessions
CREATE TABLE "Booking" (
  id VARCHAR(255) PRIMARY KEY,
  "userId" VARCHAR(255) NOT NULL,
  "sessionId" VARCHAR(255) NOT NULL,
  "userPackageId" VARCHAR(255),
  "creditsUsed" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT,
  FOREIGN KEY ("sessionId") REFERENCES "Session"(id) ON DELETE RESTRICT,
  FOREIGN KEY ("userPackageId") REFERENCES "UserPackage"(id) ON DELETE SET NULL,
  UNIQUE ("userId", "sessionId")
);

CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX "Booking_sessionId_idx" ON "Booking"("sessionId");

-- SalaryRecord Table: Teacher payroll
CREATE TABLE "SalaryRecord" (
  id VARCHAR(255) PRIMARY KEY,
  "teacherId" VARCHAR(255) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  "totalHours" DECIMAL(10, 2) DEFAULT 0,
  "hourlyRate" DECIMAL(10, 2) NOT NULL,
  "totalAmount" DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "paidDate" TIMESTAMP,
  note TEXT,
  "paidBy" VARCHAR(255),
  "paymentMethod" VARCHAR(50),
  "paymentNote" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("teacherId") REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY ("paidBy") REFERENCES "User"(id) ON DELETE SET NULL,
  UNIQUE ("teacherId", month, year)
);

CREATE INDEX "SalaryRecord_teacherId_idx" ON "SalaryRecord"("teacherId");
CREATE INDEX "SalaryRecord_status_idx" ON "SalaryRecord"(status);

-- ============== COMMUNICATION TABLES ==============

-- ChatThread Table: Conversation threads
CREATE TABLE "ChatThread" (
  id VARCHAR(255) PRIMARY KEY,
  type "ChatThreadType" NOT NULL,
  "classId" VARCHAR(255),
  "studentId" VARCHAR(255) NOT NULL,
  "teacherId" VARCHAR(255),
  "createdById" VARCHAR(255) NOT NULL,
  "lastMessageAt" TIMESTAMP,
  "lastMessagePreview" TEXT,
  "isLocked" BOOLEAN NOT NULL DEFAULT FALSE,
  "deletedByStudentAt" TIMESTAMP,
  "deletedByStudentId" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("classId") REFERENCES "Class"(id) ON DELETE CASCADE,
  FOREIGN KEY ("studentId") REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY ("teacherId") REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY ("createdById") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX "ChatThread_studentId_idx" ON "ChatThread"("studentId");
CREATE INDEX "ChatThread_teacherId_idx" ON "ChatThread"("teacherId");
CREATE INDEX "ChatThread_classId_idx" ON "ChatThread"("classId");

-- ChatMessage Table: Individual messages
CREATE TABLE "ChatMessage" (
  id VARCHAR(255) PRIMARY KEY,
  "threadId" VARCHAR(255) NOT NULL,
  "senderId" VARCHAR(255) NOT NULL,
  "senderRole" "UserRole" NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  "replyToId" VARCHAR(255),
  "mentionedUserIds" JSONB,
  "deletedByStudentAt" TIMESTAMP,
  "deletedByStudentId" VARCHAR(255),
  "deletedByAdminAt" TIMESTAMP,
  "deletedByAdminId" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("threadId") REFERENCES "ChatThread"(id) ON DELETE CASCADE,
  FOREIGN KEY ("senderId") REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"(id) ON DELETE SET NULL
);

CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");
CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

-- ChatThreadRead Table: Track read status
CREATE TABLE "ChatThreadRead" (
  id VARCHAR(255) PRIMARY KEY,
  "threadId" VARCHAR(255) NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  "lastReadAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("threadId") REFERENCES "ChatThread"(id) ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE ("threadId", "userId")
);

-- ============== REVIEW & FEEDBACK TABLES ==============

-- ClassReview Table: Student reviews of classes
CREATE TABLE "ClassReview" (
  id VARCHAR(255) PRIMARY KEY,
  "classId" VARCHAR(255) NOT NULL,
  "studentId" VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  "isHidden" BOOLEAN NOT NULL DEFAULT FALSE,
  "moderatedBy" VARCHAR(255),
  "moderatedAt" TIMESTAMP,
  "moderationReason" TEXT,
  "replyText" TEXT,
  "repliedAt" TIMESTAMP,
  "repliedBy" VARCHAR(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("classId") REFERENCES "Class"(id) ON DELETE CASCADE,
  FOREIGN KEY ("studentId") REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE ("classId", "studentId")
);

CREATE INDEX "ClassReview_classId_idx" ON "ClassReview"("classId");
CREATE INDEX "ClassReview_classId_isHidden_idx" ON "ClassReview"("classId", "isHidden");

-- ClassReaction Table: Student reactions to classes
CREATE TABLE "ClassReaction" (
  id VARCHAR(255) PRIMARY KEY,
  "classId" VARCHAR(255) NOT NULL,
  "studentId" VARCHAR(255) NOT NULL,
  type "ReactionType" NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("classId") REFERENCES "Class"(id) ON DELETE CASCADE,
  FOREIGN KEY ("studentId") REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE ("classId", "studentId")
);

CREATE INDEX "ClassReaction_classId_type_idx" ON "ClassReaction"("classId", type);

-- ClassImage Table: Class gallery images
CREATE TABLE "ClassImage" (
  id VARCHAR(255) PRIMARY KEY,
  "classId" VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL,
  caption TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("classId") REFERENCES "Class"(id) ON DELETE CASCADE
);

CREATE INDEX "ClassImage_classId_order_idx" ON "ClassImage"("classId", "order");

-- ============== FORUM TABLES ==============

-- ForumPost Table: Community forum posts
CREATE TABLE "ForumPost" (
  id VARCHAR(255) PRIMARY KEY,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" VARCHAR(255) NOT NULL,
  images JSONB,
  "isHidden" BOOLEAN NOT NULL DEFAULT FALSE,
  "hiddenReason" TEXT,
  "moderationStatus" "ForumModerationStatus" NOT NULL DEFAULT 'APPROVED',
  "moderationNote" TEXT,
  "moderatedAt" TIMESTAMP,
  reports JSONB[],
  FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- ForumComment Table: Comments on forum posts
CREATE TABLE "ForumComment" (
  id VARCHAR(255) PRIMARY KEY,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "authorId" VARCHAR(255) NOT NULL,
  "postId" VARCHAR(255) NOT NULL,
  "isHidden" BOOLEAN NOT NULL DEFAULT FALSE,
  "hiddenReason" TEXT,
  reports JSONB[],
  FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY ("postId") REFERENCES "ForumPost"(id) ON DELETE CASCADE
);

-- ForumReaction Table: Reactions to forum posts
CREATE TABLE "ForumReaction" (
  id VARCHAR(255) PRIMARY KEY,
  type "ReactionType" NOT NULL,
  "userId" VARCHAR(255) NOT NULL,
  "postId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY ("postId") REFERENCES "ForumPost"(id) ON DELETE CASCADE,
  UNIQUE ("userId", "postId", type)
);

-- ForumMedia Table: Media files for forum posts
CREATE TABLE "ForumMedia" (
  id VARCHAR(255) PRIMARY KEY,
  url VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "postId" VARCHAR(255) NOT NULL,
  FOREIGN KEY ("postId") REFERENCES "ForumPost"(id) ON DELETE CASCADE
);

-- ============== NOTIFICATION TABLE ==============

-- Notification Table: User notifications
CREATE TABLE "Notification" (
  id VARCHAR(255) PRIMARY KEY,
  "userId" VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'INFO',
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- ============== KEY BUSINESS LOGIC SUMMARY ==============
-- 
-- 1. STUDENT FLOW:
--    - User registers → creates Student account with role='STUDENT'
--    - Student buys Package → creates UserPackage with creditsLeft
--    - Student enrolls in Class → creates Enrollment (uses 1 credit)
--    - Student attends Session → scans QR → creates Attendance record
--
-- 2. TEACHER FLOW:
--    - Teacher creates Class → starts as PENDING (needs ADMIN approval)
--    - Teacher creates Sessions for approved Classes
--    - Teacher generates QR → JWT-encoded token (15 min expiry)
--    - Student scans QR → records Attendance in real-time
--    - Admin calculates: totalHours = COUNT(Session where status='DONE')
--    - Salary = totalHours × hourlyRate
--
-- 3. ADMIN FLOW:
--    - Approves/rejects pending Classes
--    - Manages all Users and their roles
--    - Calculates and confirms teacher salaries (monthly)
--    - Views system reports and analytics
--
-- 4. PAYMENT & REFUND:
--    - Transaction.status: PENDING → COMPLETED
--    - Refund logic: eligible if Enrollment.status not COMPLETED
--    - Refund amount = Package.price × Package.refundRate × (1 - penalty)
--
-- 5. REAL-TIME FEATURES (via Socket.IO):
--    - attendance_update: when student scans QR
--    - message_received: when chat message sent
--    - class_update: when class status changes
--    - session_update: when session status changes

-- ================================================================================
-- END OF DATABASE SCHEMA EXPORT
-- ================================================================================
