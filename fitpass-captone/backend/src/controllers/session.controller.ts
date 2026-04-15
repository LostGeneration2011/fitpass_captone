import { Request, Response } from "express";
import { SessionService } from "../services/session.service";
import { SessionStatus } from "@prisma/client";
import { prisma } from "../config/prisma";

const sessionService = new SessionService();

export const createSession = async (req: Request, res: Response) => {
  try {
    const { classId, startTime, endTime, roomId } = req.body;
    const user = (req as any).user;

    if (!classId || !startTime || !endTime) {
      return res.status(400).json({ error: "classId, startTime, and endTime are required" });
    }

    // If user is TEACHER, verify they own the class (ADMIN can do anything)
    if (user && user.role === 'TEACHER') {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        select: { teacherId: true }
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (classData.teacherId !== user.id) {
        return res.status(403).json({ error: "You do not own this class" });
      }
    }

    const session = await sessionService.createSession(
      classId,
      new Date(startTime),
      new Date(endTime),
      roomId
    );
    return res.status(201).json({ message: "Session created successfully", session });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    const { classId } = req.query;

    let sessions;
    if (classId) {
      sessions = await sessionService.getSessionsByClass(classId as string);
    } else {
      sessions = await sessionService.getAllSessions();
    }

    return res.json({ sessions });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getSessionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const session = await sessionService.getSessionById(id);
    return res.json({ session });
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
};

export const updateSessionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: "Session ID and status are required" });
    }

    if (!['UPCOMING', 'ACTIVE', 'DONE', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const session = await sessionService.updateSessionStatus(id, status as SessionStatus);
    return res.json({ message: "Session status updated successfully", session });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// General update session (supports status and other fields)
export const updateSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = (req as any).user;

    console.log('🔄 [SESSION_CONTROLLER] Updating session:', id, 'with data:', updateData);

    if (!id) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No update data provided" });
    }

    // If user is TEACHER, verify they own the class (ADMIN can do anything)
    if (user && user.role === 'TEACHER') {
      const session = await prisma.session.findUnique({
        where: { id },
        select: { classId: true, class: { select: { teacherId: true } } }
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.class.teacherId !== user.id) {
        return res.status(403).json({ error: "You do not own the class for this session" });
      }
    }

    const session = await sessionService.updateSession(id, updateData);
    console.log('✅ [SESSION_CONTROLLER] Session updated successfully');
    
    return res.json({ 
      message: "Session updated successfully", 
      session 
    });
  } catch (err: any) {
    console.error('❌ [SESSION_CONTROLLER] Update session error:', err.message);
    return res.status(400).json({ error: err.message });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!id) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // If user is TEACHER, verify they own the class (ADMIN can do anything)
    if (user && user.role === 'TEACHER') {
      const session = await prisma.session.findUnique({
        where: { id },
        select: { classId: true, class: { select: { teacherId: true } } }
      });

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.class.teacherId !== user.id) {
        return res.status(403).json({ error: "You do not own the class for this session" });
      }
    }

    await sessionService.deleteSession(id);
    return res.json({ message: "Session deleted successfully" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};