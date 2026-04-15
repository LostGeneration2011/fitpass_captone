import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { UserRole } from "@prisma/client";

const userService = new UserService();

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    return res.json({ users });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await userService.getUserById(id);
    return res.json({ user });
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, fullName, role, password } = req.body;

    if (!email || !fullName || !role) {
      return res.status(400).json({ error: "email, fullName, and role are required" });
    }

    if (!['ADMIN', 'TEACHER', 'STUDENT'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = await userService.createUser(email, fullName, role as UserRole, password);
    return res.status(201).json({ message: "User created successfully", user });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, role, email, avatar } = req.body;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (role && !['ADMIN', 'TEACHER', 'STUDENT'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = await userService.updateUser(id, { fullName, role, email, avatar });
    return res.json({ message: "User updated successfully", user });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    await userService.deleteUser(id);
    return res.json({ message: "User deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
