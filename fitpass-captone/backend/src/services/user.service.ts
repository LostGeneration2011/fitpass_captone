import { prisma } from "../config/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

export class UserService {
  // GET all users (admin only)
  async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // GET user by ID
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            classesTeaching: true,
            enrollments: true,
            attendances: true
          }
        }
      }
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  // UPDATE user (admin only)
  async updateUser(id: string, data: { fullName?: string; role?: UserRole; email?: string; avatar?: string | null }) {
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw new Error("User not found");
    }

    // Check if email is taken by another user
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email }
      });
      
      if (emailExists) {
        throw new Error("Email already exists");
      }
    }

    // Prepare update payload
    const updateData: {
      fullName?: string;
      role?: UserRole;
      email?: string;
      avatar?: string | null;
    } = {};

    if (typeof data.fullName !== 'undefined') updateData.fullName = data.fullName;
    if (typeof data.role !== 'undefined') updateData.role = data.role;
    if (typeof data.email !== 'undefined') updateData.email = data.email;

    if (typeof data.avatar !== 'undefined') {
      if (data.avatar === null || data.avatar === '') {
        updateData.avatar = null;
      } else {
        const base64String = data.avatar.includes(',') ? data.avatar.split(',')[1] : data.avatar;
        const byteLength = Buffer.byteLength(base64String, 'base64');
        const maxBytes = 5 * 1024 * 1024; // 5MB limit
        if (byteLength > maxBytes) {
          throw new Error('Avatar file is too large (max 5MB)');
        }

        const isValidMime = data.avatar.startsWith('data:image/png') || data.avatar.startsWith('data:image/jpeg') || data.avatar.startsWith('data:image/jpg');
        if (!isValidMime) {
          throw new Error('Avatar must be a PNG or JPG image');
        }

        updateData.avatar = data.avatar;
      }
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  // DELETE user (admin only)
  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            classesTeaching: true,
            enrollments: true,
            attendances: true
          }
        }
      }
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has dependencies
    const { _count } = user;
    if (_count.classesTeaching > 0) {
      throw new Error("Cannot delete user who is teaching classes");
    }

    return await prisma.user.delete({
      where: { id }
    });
  }

  // Create user (admin only)
  async createUser(email: string, fullName: string, role: UserRole, password?: string) {
    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // PASSWORD IS NOW REQUIRED - no default weak password
    if (!password) {
      throw new Error("Mật khẩu là bắt buộc. Vui lòng nhập mật khẩu mạnh (tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)");
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error("Mật khẩu phải có ít nhất 1 chữ hoa");
    }
    if (!/[a-z]/.test(password)) {
      throw new Error("Mật khẩu phải có ít nhất 1 chữ thường");
    }
    if (!/[0-9]/.test(password)) {
      throw new Error("Mật khẩu phải có ít nhất 1 chữ số");
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error("Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return await prisma.user.create({
      data: {
        email,
        fullName,
        role,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}
