import { Request, Response } from "express";
import { EnrollmentService } from "../services/enrollment.service";

const enrollmentService = new EnrollmentService();

export const getAllEnrollments = async (req: Request, res: Response) => {
  try {
    const enrollments = await enrollmentService.getAllEnrollments();
    return res.json({ enrollments });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const createEnrollment = async (req: Request, res: Response) => {
  try {
    const { studentId, classId, userPackageId } = req.body;
    const user = (req as any).user;

    if (!studentId || !classId) {
      return res.status(400).json({ 
        error: "studentId and classId are required",
        required: ['studentId', 'classId']
      });
    }

    // Validate: STUDENT can only enroll themselves, TEACHER/ADMIN can enroll anyone
    if (user.role === 'STUDENT' && studentId !== user.id) {
      return res.status(403).json({ error: "Students can only enroll themselves in classes" });
    }

    const result = await enrollmentService.createEnrollment(studentId, classId, userPackageId);
    
    // Handle both old format (direct enrollment object) and new format (result object)
    const enrollment = result.enrollment || result;
    const message = result.message || "Enrolled successfully";
    
    return res.status(201).json({ message, enrollment, success: result.success || true });
  } catch (err: any) {
    // Provide structured error responses
    const errorMessage = err.message || 'Unknown error';
    let statusCode = 400;
    let response: any = { error: errorMessage };

    if (errorMessage.includes('Class is full')) {
      statusCode = 409;
      response = {
        error: 'Class is full',
        errorCode: 'CLASS_CAPACITY_EXCEEDED',
        message: 'The class has reached maximum capacity. Please try another class.',
        details: { reason: 'Capacity limit reached' }
      };
    } else if (errorMessage.includes('Already enrolled')) {
      statusCode = 409;
      response = {
        error: 'Already enrolled',
        errorCode: 'DUPLICATE_ENROLLMENT',
        message: 'You are already enrolled in this class.',
        details: { reason: 'Duplicate enrollment' }
      };
    } else if (errorMessage.includes('not found')) {
      statusCode = 404;
      response = {
        error: 'Resource not found',
        errorCode: 'NOT_FOUND',
        message: errorMessage,
      };
    }

    return res.status(statusCode).json(response);
  }
};

export const getEnrollmentsByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.query;

    if (!classId) {
      return res.status(400).json({ error: "classId is required" });
    }

    const enrollments = await enrollmentService.getEnrollmentsByClass(classId as string);
    return res.json({ enrollments });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getEnrollmentsByStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }

    const enrollments = await enrollmentService.getEnrollmentsByStudent(studentId as string);
    return res.json({ enrollments });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteEnrollment = async (req: Request, res: Response) => {
  try {
    const { studentId, classId } = req.body;
    const user = (req as any).user;

    if (!studentId || !classId) {
      return res.status(400).json({ error: "studentId and classId are required" });
    }

    // Validate: STUDENT can only unenroll themselves, ADMIN can unenroll anyone
    if (user.role === 'STUDENT' && studentId !== user.id) {
      return res.status(403).json({ error: "Students can only unenroll themselves" });
    }

    const result = await enrollmentService.deleteEnrollment(studentId, classId);
    
    // Handle both old format and new format
    const message = result.message || "Unenrolled successfully";
    const success = result.success || true;
    
    return res.json({ message, success });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const updateEnrollmentNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { progressNotes } = req.body;
    const user = (req as any).user;

    if (!id) {
      return res.status(400).json({ error: "Enrollment ID is required" });
    }

    if (!progressNotes || typeof progressNotes !== 'string') {
      return res.status(400).json({ error: "progressNotes is required and must be a string" });
    }

    if (!user || user.role !== 'TEACHER') {
      return res.status(403).json({ error: "Only teachers can update progress notes" });
    }

    const result = await enrollmentService.updateEnrollmentNote(id, progressNotes, user.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getEnrollmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Enrollment ID is required" });
    }

    const enrollment = await enrollmentService.getEnrollmentById(id);
    
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    return res.json({ enrollment });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getClassCapacityInfo = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ error: "classId is required" });
    }

    const capacityInfo = await enrollmentService.getClassCapacityInfo(classId);
    return res.json(capacityInfo);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};