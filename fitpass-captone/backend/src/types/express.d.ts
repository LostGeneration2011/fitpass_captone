import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      email: string;
      role: UserRole;
      fullName: string;
    }

    interface Request {
      user?: UserPayload;
      userId?: string; // For payment controllers
    }
  }
}
