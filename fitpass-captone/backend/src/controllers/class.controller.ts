import { Request, Response } from "express";
import { ClassService } from "../services/class.service";

const classService = new ClassService();

export const createClass = async (req: Request, res: Response) => {
  try {
    console.log('Creating class with data:', req.body);
    
    if (!req.body.name || !req.body.duration) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        required: ["name", "duration"],
        received: req.body 
      });
    }

    // Validate type and level (required for filtering)
    const validTypes = ['YOGA', 'CARDIO', 'STRENGTH', 'DANCE', 'PILATES', 'OTHER'];
    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];
    
    if (!req.body.type || !validTypes.includes(req.body.type)) {
      return res.status(400).json({ 
        error: "Invalid or missing type", 
        validTypes 
      });
    }

    if (!req.body.level || !validLevels.includes(req.body.level)) {
      return res.status(400).json({ 
        error: "Invalid or missing level", 
        validLevels 
      });
    }

    const created = await classService.createClass(req.body);
    return res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating class:', err);
    return res.status(400).json({ error: err.message, details: err });
  }
};

export const getAllClasses = async (req: Request, res: Response) => {
  try {
    const { status, approved, type, level, startDate, endDate } = req.query as Record<string, string | undefined>;

    let classes;
    // If any filter present, use flexible search
    if (status || approved || type || level || startDate || endDate) {
      classes = await classService.searchClasses({
        status: status as any,
        approvedOnly: approved === 'true',
        type: type as any,
        level: level as any,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
    } else {
      // Default: all classes
      classes = await classService.getAllClasses();
    }

    return res.json(classes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Admin approve class
export const approveClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    const approved = await classService.approveClass(id);
    return res.json({ message: "Class approved successfully", class: approved });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// Admin reject class
export const rejectClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { rejectionReason } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    const rejected = await classService.rejectClass(id, rejectionReason);
    return res.json({ message: "Class rejected", class: rejected });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    const classId = req.params.id;
    
    if (!classId) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    const cls = await classService.getClassById(classId);

    if (!cls) return res.status(404).json({ error: "Class not found" });

    return res.json(cls);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    const updated = await classService.updateClass(id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({ error: "Class ID is required" });
    }
    
    await classService.deleteClass(id);
    return res.json({ message: "Class deleted" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
