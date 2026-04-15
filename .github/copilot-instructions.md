# FitPass Copilot Instructions

AI agents working on this codebase should understand the FitPass architecture: a monorepo with an Express.js backend (PostgreSQL + Prisma), Next.js admin dashboard, and Expo React Native mobile app.

## Architecture Overview

**Monorepo Structure:**
- `backend/` - Node.js/Express API with Prisma ORM
- `fitpass-admin/` - Next.js 14 admin dashboard (RBAC-protected)
- `fitpass-app/` - Expo React Native mobile (iOS/Android)

**Key Principle:** Three-layer architecture (controllers → services → Prisma models). All business logic lives in `/services/`, controllers are thin routing layers.

## Critical Workflows

### Local Development
```bash
npm install:all              # Install all packages
npm run dev                  # Starts backend (3000), admin (3001), app (Expo)
cd fitpass-captone/backend && npm run dev  # Backend only
```

### Database Operations
- Database: PostgreSQL (or local SQLite for development)
- ORM: Prisma
- Schema file: `backend/prisma/schema.prisma`
- After schema changes: `prisma db push` then `prisma generate`
- View GUI: `prisma studio` (port 5555)

### Authentication Flow
- **Backend:** JWT auth middleware (`src/middlewares/auth.ts`) extracts token from `Authorization: Bearer <token>`
- **JWT payload:** `{ id, email, role, fullName }`
- **Passport.js integration:** OAuth Google strategy in `src/config/passport.ts` (role auto-detection)
- **Admin/Mobile:** Token stored in localStorage/AsyncStorage after login
- **Session timeout:** 30 minutes on admin dashboard

### Real-time Features (WebSocket)
- Socket.IO server in `src/ws/index.ts`
- Authentication: Token passed in handshake
- Use case: Attendance tracking, QR code check-ins
- Global reference: `(global as any).io` available in controllers for emitting events

## Project-Specific Conventions

### Service Pattern
Services handle all business logic and Prisma queries. Example structure:
```typescript
export class ClassService {
  async createClass(data) { /* validation + prisma.class.create() */ }
  async getClassesForTeacher(teacherId) { /* prisma query + business rules */ }
}
```

### Role-Based Access Control (RBAC)
- Roles: `ADMIN`, `TEACHER`, `STUDENT`
- Middleware: `requireRole(['ADMIN'])` in routes
- Database: `User.role` field, checked in `adminOnly` or `requireRole` middleware

### Business Logic Documents
Review these for complex features:
- `PAYROLL_BUSINESS_LOGIC.md` - Teacher salary calculation (hours tracked via completed sessions)
- `FITPASS_PROJECT_DESCRIPTION.md` - Feature matrix and system design

### Critical Models (Prisma Schema)
- **User** - `role` (ADMIN/TEACHER/STUDENT), `googleId` (OAuth), `hourlyRate` (teacher payroll)
- **Class** - Status: PENDING/APPROVED/REJECTED; `minStudents` business rule triggers refunds
- **Session** - Status: UPCOMING/ONGOING/DONE; linked to Class + Room
- **Enrollment** - Student's class membership; tracks refund eligibility
- **Attendance** - QR-based check-in records
- **SalaryRecord** - Monthly payroll tracking (PENDING/PAID)

### API Response Pattern
Errors use custom middleware (`src/middlewares/errorHandler.ts`). Always include:
```typescript
res.status(200).json({ data: payload, message?: string })  // Success
res.status(4xx).json({ message: 'Error description' })      // Error
```

## Cross-Component Communication

- **Backend → Admin:** REST API calls via `axios` (see `fitpass-admin/lib/api.ts`)
- **Backend → Mobile:** Same REST API + real-time WebSocket for attendance
- **Admin → Backend:** JWT token in `Authorization` header (added by axios interceptor)
- **Mobile → Backend:** JWT in `Authorization` header (AsyncStorage retrieval)

## Development Tips

1. **TypeScript Strict Mode:** All `.ts` files must compile without errors
2. **Prisma First:** Changes to schema require `prisma db push` + `prisma generate`
3. **Middleware Ordering:** Auth middleware must run before role checks
4. **QR Code Generation:** Backend generates JWT-encoded QR tokens (see `qr.routes.ts`)
5. **Environment Variables:** Backend uses `.env`, admin uses runtime API calls
6. **Testing:** Use `test-api.ps1` and `test-salary-api.js` for manual API validation
7. **Logging:** Console logs prefixed with emoji tags (`🔐`, `✅`, `❌`, `🔄`) for debugging

## Common Pitfalls

- **Missing Prisma Generate:** Backend won't see schema changes until `prisma generate` runs
- **Token Expiry:** Mobile app persists in AsyncStorage but should refresh on app restart
- **Role Mismatch:** Ensure `User.role` enum matches route middleware expectations (ADMIN vs admin)
- **CORS Issues:** Backend hardcodes allowed origins; ngrok URLs need manual updates
- **WebSocket Namespace:** Don't emit to unregistered namespaces; check `src/ws/index.ts` for setup

## File References for Key Patterns

- Authentication: `backend/src/config/passport.ts`, `backend/src/middlewares/auth.ts`
- Services: `backend/src/services/*.ts` (ClassService, SessionService, etc.)
- Payroll: `backend/src/controllers/payroll.controller.ts`, `PAYROLL_BUSINESS_LOGIC.md`
- Admin Routes: `fitpass-admin/app/api/` subdirectories
- Mobile Navigation: `fitpass-app/app/` (Expo Router file-based)
